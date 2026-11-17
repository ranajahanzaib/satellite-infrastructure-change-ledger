"""
End-to-end processing pipeline orchestrator.
Coordinates raster ingestion, temporal alignment, spectral analysis,
Clay/Prithvi representation extraction, candidate extraction, and entity linking.
"""

from __future__ import annotations
import os
import time
from typing import Dict, Any, List, Optional, Tuple

import numpy as np

from ..raster.geotiff import RasterIO, RasterMetadata
from ..alignment.spatial import TemporalAligner
from ..indices.spectral import SpectralIndices
from ..detection.engine import ChangeDetectionEngine, ChangeCandidate
from ..models.clay_adapter import ClayAdapter
from ..models.prithvi_adapter import PrithviAdapter
from ..models.osm_wikidata_adapter import OsmWikidataAdapter


class ProcessingPipeline:
    """
    Orchestrates the entire multi-temporal analysis pipeline.
    """

    def __init__(self, artifacts_dir: str = "data/fixtures/artifacts"):
        self.artifacts_dir = artifacts_dir
        os.makedirs(self.artifacts_dir, exist_ok=True)
        self.clay = ClayAdapter()
        self.prithvi = PrithviAdapter()
        self.engine = ChangeDetectionEngine(clay_adapter=self.clay, prithvi_adapter=self.prithvi)
        self.entity_resolver = OsmWikidataAdapter()

    def run_detection_pipeline(
        self,
        t1_raster_path: str,
        t2_raster_path: str,
        area_id: str = "area-apex-park-01",
        t1_date: str = "2016-08-15",
        t2_date: str = "2021-07-10",
        job_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes end-to-end processing workflow and writes derived artifacts.
        """
        start_time = time.time()

        # Step 1: Read rasters
        t1_data, t1_meta = RasterIO.read(t1_raster_path)
        t2_data, t2_meta = RasterIO.read(t2_raster_path)

        # Step 2: Temporal alignment & grid harmonization
        aligned_t1, aligned_t2, common_meta, align_report = TemporalAligner.align_pair(
            t1_data, t1_meta, t2_data, t2_meta
        )

        # Step 3: Run change detection engine
        candidates, diff_raster, summary = self.engine.detect_changes(
            aligned_t1,
            aligned_t2,
            common_meta,
            t1_date=t1_date,
            t2_date=t2_date
        )

        # Step 4: Associate candidates with geographic entities (OSM / Wikidata)
        enriched_candidates = []
        for cand in candidates:
            cand_dict = cand.to_dict()
            # Match entities
            matched_entities = self.entity_resolver.find_candidates(
                candidate_bbox=tuple(cand.bbox),
                candidate_centroid=tuple(cand.centroid),
                max_distance_meters=1500.0
            )
            cand_dict["matched_entities"] = matched_entities
            cand_dict["primary_entity"] = matched_entities[0]["entity"]["name"] if matched_entities else None
            enriched_candidates.append(cand_dict)

        # Step 5: Save artifacts (difference raster & previews)
        diff_path = os.path.join(self.artifacts_dir, f"diff_{area_id}_{t1_date[:4]}_{t2_date[:4]}.png")
        # Save diff raster as 8-bit heatmap preview
        diff_vis = (np.clip(diff_raster, 0.0, 1.0) * 255.0).astype(np.uint8)
        from PIL import Image
        diff_img = Image.fromarray(diff_vis, mode="L")
        diff_img.save(diff_path)

        duration = round(time.time() - start_time, 3)

        return {
            "status": "completed",
            "job_id": job_id or f"job-{int(time.time())}",
            "area_id": area_id,
            "processing_duration_seconds": duration,
            "alignment": align_report,
            "summary": summary,
            "candidates": enriched_candidates,
            "artifacts": {
                "diff_raster_preview": diff_path,
                "common_bounds": common_meta.bounds,
                "common_dimensions": [common_meta.width, common_meta.height],
            }
        }
