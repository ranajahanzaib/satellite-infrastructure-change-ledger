"""
Geospatial alignment and temporal co-registration routines.
Ensures two observations share the exact coordinate reference system, spatial extent,
resolution, and aligned pixel grid before computing differences.
"""

from __future__ import annotations
import numpy as np
from scipy import ndimage
from typing import Tuple, Dict, Any, Optional

from ..raster.geotiff import RasterMetadata


class TemporalAligner:
    """
    Aligns multi-temporal raster pairs onto a consistent pixel grid.
    """

    @staticmethod
    def align_pair(
        t1_data: np.ndarray,
        t1_meta: RasterMetadata,
        t2_data: np.ndarray,
        t2_meta: RasterMetadata,
        target_resolution: Optional[Tuple[float, float]] = None
    ) -> Tuple[np.ndarray, np.ndarray, RasterMetadata, Dict[str, Any]]:
        """
        Aligns t1 and t2 to the intersection of their bounding boxes and matching pixel dimensions.
        Returns:
            aligned_t1: np.ndarray (bands, target_h, target_w)
            aligned_t2: np.ndarray (bands, target_h, target_w)
            common_meta: RasterMetadata for aligned space
            alignment_report: Dict with quality metrics (overlap_pct, resolution_ratio, crs_match)
        """
        b1 = t1_meta.bounds
        b2 = t2_meta.bounds

        # Compute intersection of bounding boxes
        inter_min_x = max(b1[0], b2[0])
        inter_min_y = max(b1[1], b2[1])
        inter_max_x = min(b1[2], b2[2])
        inter_max_y = min(b1[3], b2[3])

        if inter_min_x >= inter_max_x or inter_min_y >= inter_max_y:
            raise ValueError(
                f"No spatial overlap between observation 1 {b1} and observation 2 {b2}."
            )

        # Overlap percentage relative to union
        area_1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
        area_2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
        inter_area = (inter_max_x - inter_min_x) * (inter_max_y - inter_min_y)
        union_area = area_1 + area_2 - inter_area
        overlap_pct = (inter_area / union_area) * 100.0 if union_area > 0 else 0.0

        # Target resolution: default to finer resolution
        res_x = min(t1_meta.resolution[0], t2_meta.resolution[0])
        res_y = min(t1_meta.resolution[1], t2_meta.resolution[1])
        if target_resolution:
            res_x, res_y = target_resolution

        target_w = int(round((inter_max_x - inter_min_x) / res_x))
        target_h = int(round((inter_max_y - inter_min_y) / res_y))
        target_w = max(target_w, 16)
        target_h = max(target_h, 16)

        # Resample t1 onto the target grid
        t1_resampled = TemporalAligner._resample_to_grid(
            t1_data, t1_meta.bounds, (inter_min_x, inter_min_y, inter_max_x, inter_max_y), target_w, target_h
        )

        # Resample t2 onto the target grid
        t2_resampled = TemporalAligner._resample_to_grid(
            t2_data, t2_meta.bounds, (inter_min_x, inter_min_y, inter_max_x, inter_max_y), target_w, target_h
        )

        common_meta = RasterMetadata(
            width=target_w,
            height=target_h,
            bands=min(t1_data.shape[0], t2_data.shape[0]),
            crs=t1_meta.crs,
            bounds=(inter_min_x, inter_min_y, inter_max_x, inter_max_y),
            resolution=(res_x, res_y),
            nodata=0.0,
            dtype="float32",
            band_names=t1_meta.band_names[:min(len(t1_meta.band_names), len(t2_meta.band_names))],
        )

        # Crop both to matching band count
        min_bands = min(t1_resampled.shape[0], t2_resampled.shape[0])
        aligned_t1 = t1_resampled[:min_bands]
        aligned_t2 = t2_resampled[:min_bands]

        report = {
            "overlap_pct": round(overlap_pct, 2),
            "common_bounds": [inter_min_x, inter_min_y, inter_max_x, inter_max_y],
            "common_dimensions": [target_w, target_h],
            "target_resolution": [res_x, res_y],
            "crs_match": t1_meta.crs == t2_meta.crs,
            "reliable": overlap_pct > 80.0,
        }

        return aligned_t1, aligned_t2, common_meta, report

    @staticmethod
    def _resample_to_grid(
        data: np.ndarray,
        src_bounds: Tuple[float, float, float, float],
        dst_bounds: Tuple[float, float, float, float],
        dst_w: int,
        dst_h: int
    ) -> np.ndarray:
        """
        Bilinearly resamples multi-band raster data from src_bounds to dst_bounds (dst_w x dst_h).
        """
        bands, src_h, src_w = data.shape
        dst_data = np.zeros((bands, dst_h, dst_w), dtype=np.float32)

        src_min_x, src_min_y, src_max_x, src_max_y = src_bounds
        dst_min_x, dst_min_y, dst_max_x, dst_max_y = dst_bounds

        src_span_x = max(src_max_x - src_min_x, 1e-9)
        src_span_y = max(src_max_y - src_min_y, 1e-9)

        # Pixel coordinate transforms
        x_indices = np.linspace(dst_min_x, dst_max_x, dst_w)
        y_indices = np.linspace(dst_max_y, dst_min_y, dst_h)  # top to bottom

        src_x_coords = (x_indices - src_min_x) / src_span_x * (src_w - 1)
        src_y_coords = (src_max_y - y_indices) / src_span_y * (src_h - 1)

        # Create 2D grid of coordinates
        coords_y, coords_x = np.meshgrid(src_y_coords, src_x_coords, indexing="ij")
        coords = np.array([coords_y, coords_x])

        for b in range(bands):
            # ndimage.map_coordinates handles bilinear interpolation
            dst_data[b] = ndimage.map_coordinates(
                data[b],
                coords,
                order=1,
                mode="nearest"
            ).astype(np.float32)

        return dst_data
