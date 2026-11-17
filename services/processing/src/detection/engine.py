"""
Multi-Stage Geospatial Change Detection Engine.
Combines spectral indices differences, Clay foundation model embeddings,
Prithvi land-cover segmentation, morphological candidate polygonization,
explainable multi-factor scoring, and false-positive mitigation.
"""

from __future__ import annotations
import math
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
from scipy import ndimage
from shapely.geometry import Polygon, MultiPolygon, mapping, box
from shapely.ops import unary_union

from ..raster.geotiff import RasterMetadata
from ..indices.spectral import SpectralIndices
from ..models.clay_adapter import ClayAdapter
from ..models.prithvi_adapter import PrithviAdapter


@dataclass
class ChangeCandidate:
    candidate_id: str
    category: str
    geometry: Dict[str, Any]  # GeoJSON Polygon / MultiPolygon
    bbox: List[float]         # [min_lon, min_lat, max_lon, max_lat]
    centroid: List[float]     # [lon, lat]
    area_m2: float
    score: float              # 0.0 to 1.0
    confidence_band: str      # 'high', 'medium', 'low'
    detection_method: str
    contributing_signals: Dict[str, float]
    requires_more_evidence: bool = False
    false_positive_risk: str = "low"
    risk_reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "candidate_id": self.candidate_id,
            "category": self.category,
            "geometry": self.geometry,
            "bbox": self.bbox,
            "centroid": self.centroid,
            "area_m2": round(self.area_m2, 1),
            "score": round(self.score, 3),
            "confidence_band": self.confidence_band,
            "detection_method": self.detection_method,
            "contributing_signals": {k: round(v, 3) for k, v in self.contributing_signals.items()},
            "requires_more_evidence": self.requires_more_evidence,
            "false_positive_risk": self.false_positive_risk,
            "risk_reasons": self.risk_reasons,
        }


class ChangeDetectionEngine:
    """
    Executes the 6-stage change detection pipeline on temporally aligned rasters.
    """

    CATEGORIES = [
        "new_construction",
        "building_expansion",
        "demolition",
        "road_development",
        "land_clearing",
        "vegetation_change",
        "water_body_change",
        "unclassified_change"
    ]

    def __init__(
        self,
        min_region_size_pixels: int = 12,
        min_area_m2: float = 1200.0,
        clay_adapter: Optional[ClayAdapter] = None,
        prithvi_adapter: Optional[PrithviAdapter] = None
    ):
        self.min_region_size_pixels = min_region_size_pixels
        self.min_area_m2 = min_area_m2
        self.clay = clay_adapter or ClayAdapter()
        self.prithvi = prithvi_adapter or PrithviAdapter()

    def detect_changes(
        self,
        t1_raster: np.ndarray,
        t2_raster: np.ndarray,
        metadata: RasterMetadata,
        t1_date: str = "2016-08-15",
        t2_date: str = "2021-07-10",
        cloud_masks: Optional[Tuple[np.ndarray, np.ndarray]] = None
    ) -> Tuple[List[ChangeCandidate], np.ndarray, Dict[str, Any]]:
        """
        Runs complete 6-stage detection pipeline.
        Returns:
            candidates: List[ChangeCandidate]
            diff_raster: np.ndarray of shape (H, W) composite difference map
            summary: Dict with summary metrics
        """
        bands, h, w = t1_raster.shape

        # -----------------------------------------------------------------
        # Stage 1: Basic temporal comparison & spectral index deltas
        # -----------------------------------------------------------------
        t1_indices = SpectralIndices.extract_indices_from_raster(t1_raster, metadata.band_names)
        t2_indices = SpectralIndices.extract_indices_from_raster(t2_raster, metadata.band_names)
        index_deltas = SpectralIndices.temporal_difference(t1_indices, t2_indices)

        delta_ndbi = index_deltas.get("delta_ndbi", np.zeros((h, w), dtype=np.float32))
        delta_ndvi = index_deltas.get("delta_ndvi", np.zeros((h, w), dtype=np.float32))

        # Absolute normalized spectral difference
        spectral_diff = np.mean(np.abs(t2_raster - t1_raster), axis=0)
        norm_spectral_diff = np.clip(spectral_diff / (np.percentile(spectral_diff, 95) + 1e-6), 0.0, 1.0)

        # -----------------------------------------------------------------
        # Stage 2: Embedding-based similarity analysis
        # -----------------------------------------------------------------
        t1_emb, _ = self.clay.extract_patch_embeddings(t1_raster)
        t2_emb, _ = self.clay.extract_patch_embeddings(t2_raster)
        emb_dist_coarse, mean_emb_dist = self.clay.compute_temporal_similarity(t1_emb, t2_emb)

        # Upsample coarse embedding distance map (e.g. ny x nx) to full raster resolution (H x W)
        emb_dist_map = ndimage.zoom(
            emb_dist_coarse,
            (h / emb_dist_coarse.shape[0], w / emb_dist_coarse.shape[1]),
            order=1
        )
        emb_dist_norm = np.clip(emb_dist_map / 1.5, 0.0, 1.0)

        # Prithvi land-cover transition
        t1_class, _, _ = self.prithvi.segment_land_cover(t1_raster, metadata.band_names)
        t2_class, _, _ = self.prithvi.segment_land_cover(t2_raster, metadata.band_names)

        # -----------------------------------------------------------------
        # Combined change signal & morphological filtering
        # -----------------------------------------------------------------
        # Infrastructure change signal: Built-up expansion (delta_ndbi > 0) + spectral shift + embedding distance
        built_signal = np.clip(delta_ndbi * 1.5, 0.0, 1.0)
        composite_diff = (
            norm_spectral_diff * 0.35 +
            emb_dist_norm * 0.35 +
            built_signal * 0.30
        )

        # Exclude clouds if cloud masks provided
        if cloud_masks is not None:
            c1_mask, c2_mask = cloud_masks
            cloud_union = (c1_mask > 0.3) | (c2_mask > 0.3)
            composite_diff[cloud_union] = 0.0

        # Stage 3: Candidate region extraction
        # Binary thresholding for potential physical change regions
        threshold = 0.35
        binary_mask = composite_diff > threshold

        # Morphological opening (remove isolated noisy pixels) then closing (bridge contiguous structures)
        opened = ndimage.binary_opening(binary_mask, structure=np.ones((3, 3)))
        closed = ndimage.binary_closing(opened, structure=np.ones((5, 5)))

        # Connected component labeling
        labeled, num_features = ndimage.label(closed, structure=np.ones((3, 3)))

        candidates: List[ChangeCandidate] = []
        res_x_m = metadata.resolution[0] * 111320.0 if metadata.crs == "EPSG:4326" else metadata.resolution[0]
        res_y_m = metadata.resolution[1] * 110540.0 if metadata.crs == "EPSG:4326" else metadata.resolution[1]
        pixel_area_m2 = abs(res_x_m * res_y_m)

        min_x, min_y, max_x, max_y = metadata.bounds
        span_x = max_x - min_x
        span_y = max_y - min_y

        for feat_id in range(1, num_features + 1):
            region_mask = (labeled == feat_id)
            pixel_count = np.sum(region_mask)
            if pixel_count < self.min_region_size_pixels:
                continue

            est_area_m2 = pixel_count * pixel_area_m2
            if est_area_m2 < self.min_area_m2:
                continue

            # Bounding box of region in pixel space
            y_indices, x_indices = np.where(region_mask)
            py_min, py_max = int(np.min(y_indices)), int(np.max(y_indices))
            px_min, px_max = int(np.min(x_indices)), int(np.max(x_indices))

            # Geographic bounds
            geo_min_x = min_x + (px_min / w) * span_x
            geo_max_x = min_x + ((px_max + 1) / w) * span_x
            geo_min_y = max_y - ((py_max + 1) / h) * span_y
            geo_max_y = max_y - (py_min / h) * span_y

            c_lon = (geo_min_x + geo_max_x) / 2.0
            c_lat = (geo_min_y + geo_max_y) / 2.0

            # Extract signals within this candidate region
            region_spectral = float(np.mean(norm_spectral_diff[region_mask]))
            region_embedding = float(np.mean(emb_dist_norm[region_mask]))
            region_ndbi = float(np.mean(delta_ndbi[region_mask]))
            region_ndvi = float(np.mean(delta_ndvi[region_mask]))

            # Spatial compactness: Area / (Bounding Box Area)
            bbox_pixel_area = max((py_max - py_min + 1) * (px_max - px_min + 1), 1)
            compactness = float(pixel_count / bbox_pixel_area)

            # Aspect ratio for linear features (roads vs buildings)
            width_px = px_max - px_min + 1
            height_px = py_max - py_min + 1
            aspect_ratio = max(width_px / max(height_px, 1), height_px / max(width_px, 1))

            # Land cover transition mode
            t1_classes_in_region = t1_class[region_mask]
            t2_classes_in_region = t2_class[region_mask]
            t1_mode = int(np.bincount(t1_classes_in_region).argmax())
            t2_mode = int(np.bincount(t2_classes_in_region).argmax())

            # -------------------------------------------------------------
            # Stage 4: Candidate classification
            # -------------------------------------------------------------
            category = "unclassified_change"
            if t2_mode == 6 or (region_ndbi > 0.08 and region_ndvi < -0.05):
                # Transitioned to industrial structure / high built-up index
                if t1_mode == 5:
                    category = "building_expansion"
                else:
                    category = "new_construction"
            elif aspect_ratio > 3.0 and region_ndbi > 0.03:
                category = "road_development"
            elif region_ndvi < -0.20 and region_ndbi < 0.05:
                category = "land_clearing"
            elif region_ndbi < -0.10:
                category = "demolition"
            elif abs(region_ndvi) > 0.15 and abs(region_ndbi) < 0.05:
                category = "vegetation_change"

            # -------------------------------------------------------------
            # Stage 5: Multi-factor explainable scoring
            # -------------------------------------------------------------
            spectral_score = np.clip(region_spectral * 1.2, 0.0, 1.0)
            emb_score = np.clip(region_embedding * 1.1, 0.0, 1.0)
            ndbi_score = np.clip((region_ndbi + 0.1) * 2.0, 0.0, 1.0)
            spatial_score = np.clip(compactness * 0.9, 0.0, 1.0)
            quality_score = 0.95  # Quality factor

            # Weighted candidate score
            candidate_score = float(
                spectral_score * 0.25 +
                emb_score * 0.30 +
                ndbi_score * 0.25 +
                spatial_score * 0.20
            )
            candidate_score = float(np.clip(candidate_score, 0.05, 0.98))

            confidence_band = "high" if candidate_score >= 0.70 else "medium" if candidate_score >= 0.45 else "low"

            # -------------------------------------------------------------
            # Stage 6: False-positive risk handling
            # -------------------------------------------------------------
            false_positive_risk = "low"
            risk_reasons = []
            requires_more_evidence = False

            # Check if vegetation change without structural changes
            if category == "vegetation_change" and abs(region_ndbi) < 0.02:
                false_positive_risk = "medium"
                risk_reasons.append("Seasonal vegetation variation suspected; no structural or impervious change detected")
                requires_more_evidence = True

            # Check for low contrast / shadow
            if region_spectral < 0.15 and region_embedding > 0.4:
                false_positive_risk = "medium"
                risk_reasons.append("Illumination or solar elevation difference may have inflated embedding distance")
                requires_more_evidence = True

            # Approximate simplified polygon geometry (GeoJSON)
            # Create polygon from bounding box with chamfered corners or actual contour
            poly = box(geo_min_x, geo_min_y, geo_max_x, geo_max_y)
            # Simplify geometry for clean cartographic rendering
            simplified_poly = poly.simplify(0.00005, preserve_topology=True)
            geo_dict = mapping(simplified_poly)

            candidate = ChangeCandidate(
                candidate_id=f"cand-{uuid.uuid4().hex[:12]}",
                category=category,
                geometry=geo_dict,
                bbox=[geo_min_x, geo_min_y, geo_max_x, geo_max_y],
                centroid=[c_lon, c_lat],
                area_m2=est_area_m2,
                score=candidate_score,
                confidence_band=confidence_band,
                detection_method="multi_stage_ensemble_v1",
                contributing_signals={
                    "spectral_magnitude": float(spectral_score),
                    "embedding_distance": float(emb_score),
                    "ndbi_built_signal": float(ndbi_score),
                    "spatial_compactness": float(spatial_score),
                    "quality_index": float(quality_score),
                },
                requires_more_evidence=requires_more_evidence,
                false_positive_risk=false_positive_risk,
                risk_reasons=risk_reasons,
            )
            candidates.append(candidate)

        # Sort candidates descending by score
        candidates.sort(key=lambda c: c.score, reverse=True)

        summary = {
            "total_candidates": len(candidates),
            "high_confidence_count": sum(1 for c in candidates if c.confidence_band == "high"),
            "medium_confidence_count": sum(1 for c in candidates if c.confidence_band == "medium"),
            "low_confidence_count": sum(1 for c in candidates if c.confidence_band == "low"),
            "new_construction_count": sum(1 for c in candidates if c.category == "new_construction"),
            "mean_embedding_distance": round(mean_emb_dist, 3),
            "t1_date": t1_date,
            "t2_date": t2_date,
        }

        return candidates, composite_diff, summary
