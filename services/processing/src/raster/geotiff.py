"""
Raster inspection, loading, normalization, and saving utilities.
Supports rasterio when available, with a complete NumPy/PIL/struct fallback.
"""

from __future__ import annotations
import math
import os
import struct
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image

try:
    import rasterio
    from rasterio.transform import from_bounds
    HAS_RASTERIO = True
except ImportError:
    HAS_RASTERIO = False


@dataclass
class RasterMetadata:
    width: int
    height: int
    bands: int
    crs: str
    bounds: Tuple[float, float, float, float]  # min_lon, min_lat, max_lon, max_lat
    resolution: Tuple[float, float]           # (res_x, res_y) in CRS units
    nodata: Optional[float] = None
    dtype: str = "float32"
    band_names: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "width": self.width,
            "height": self.height,
            "bands": self.bands,
            "crs": self.crs,
            "bounds": list(self.bounds),
            "resolution": list(self.resolution),
            "nodata": self.nodata,
            "dtype": self.dtype,
            "band_names": self.band_names,
        }


class RasterIO:
    """Handles reading, writing, and inspecting geospatial rasters."""

    @staticmethod
    def read(filepath: str) -> Tuple[np.ndarray, RasterMetadata]:
        """
        Reads a raster file.
        Returns:
            data: np.ndarray of shape (bands, height, width)
            metadata: RasterMetadata
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Raster file not found: {filepath}")

        if HAS_RASTERIO:
            try:
                with rasterio.open(filepath) as src:
                    data = src.read()
                    bounds = (src.bounds.left, src.bounds.bottom, src.bounds.right, src.bounds.top)
                    res = (src.res[0], src.res[1])
                    crs_str = str(src.crs) if src.crs else "EPSG:4326"
                    meta = RasterMetadata(
                        width=src.width,
                        height=src.height,
                        bands=src.count,
                        crs=crs_str,
                        bounds=bounds,
                        resolution=res,
                        nodata=src.nodata,
                        dtype=str(data.dtype),
                        band_names=[src.descriptions[i] or f"B{i+1}" for i in range(src.count)],
                    )
                    return data.astype(np.float32), meta
            except Exception:
                pass  # Fallback to PIL reader

        # Fallback reading with PIL & companion metadata
        img = Image.open(filepath)
        # Check if companion .json exists for geospatial bounds
        meta_json_path = filepath + ".json"
        bounds = (-122.45, 37.75, -122.40, 37.80)
        crs = "EPSG:4326"
        band_names = []
        nodata = None

        if os.path.exists(meta_json_path):
            import json
            try:
                with open(meta_json_path, "r") as f:
                    mj = json.load(f)
                    bounds = tuple(mj.get("bounds", bounds))
                    crs = mj.get("crs", crs)
                    band_names = mj.get("band_names", [])
                    nodata = mj.get("nodata", None)
            except Exception:
                pass

        arr = np.array(img)
        if arr.ndim == 2:
            data = arr[np.newaxis, :, :].astype(np.float32)
        elif arr.ndim == 3:
            # Shape is (H, W, C) -> transpose to (C, H, W)
            data = np.transpose(arr, (2, 0, 1)).astype(np.float32)
        else:
            raise ValueError(f"Unsupported array dimensionality: {arr.ndim}")

        h, w = data.shape[1], data.shape[2]
        res_x = (bounds[2] - bounds[0]) / max(w, 1)
        res_y = (bounds[3] - bounds[1]) / max(h, 1)

        if not band_names:
            band_names = [f"B{i+1}" for i in range(data.shape[0])]

        meta = RasterMetadata(
            width=w,
            height=h,
            bands=data.shape[0],
            crs=crs,
            bounds=bounds,
            resolution=(res_x, res_y),
            nodata=nodata,
            dtype=str(data.dtype),
            band_names=band_names,
        )
        return data, meta

    @staticmethod
    def write(
        filepath: str,
        data: np.ndarray,
        metadata: RasterMetadata,
        compress: str = "deflate"
    ) -> None:
        """
        Writes a multi-band raster and companion geospatial metadata.
        """
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)

        if HAS_RASTERIO:
            try:
                import rasterio
                from rasterio.transform import from_bounds
                transform = from_bounds(*metadata.bounds, metadata.width, metadata.height)
                count, height, width = data.shape
                with rasterio.open(
                    filepath,
                    "w",
                    driver="GTiff",
                    height=height,
                    width=width,
                    count=count,
                    dtype=data.dtype,
                    crs=metadata.crs,
                    transform=transform,
                    nodata=metadata.nodata,
                    compress=compress,
                ) as dst:
                    for i in range(count):
                        dst.write(data[i], i + 1)
                        if i < len(metadata.band_names):
                            dst.set_band_description(i + 1, metadata.band_names[i])
                return
            except Exception:
                pass

        # Fallback: Save image via PIL and companion JSON metadata
        import json
        with open(filepath + ".json", "w") as f:
            json.dump(metadata.to_dict(), f, indent=2)

        count, height, width = data.shape
        if count == 1:
            # Single band
            norm = data[0]
            if np.issubdtype(data.dtype, np.floating):
                min_v, max_v = np.nanmin(norm), np.nanmax(norm)
                if max_v > min_v:
                    norm = ((norm - min_v) / (max_v - min_v) * 255).astype(np.uint8)
                else:
                    norm = np.zeros_like(norm, dtype=np.uint8)
            img = Image.fromarray(norm.astype(np.uint8))
            img.save(filepath)
        elif count >= 3:
            # RGB composite from first 3 bands
            rgb = np.transpose(data[:3], (1, 2, 0))
            if np.issubdtype(rgb.dtype, np.floating):
                min_v = np.nanmin(rgb, axis=(0, 1), keepdims=True)
                max_v = np.nanmax(rgb, axis=(0, 1), keepdims=True)
                diff = np.where(max_v > min_v, max_v - min_v, 1.0)
                rgb = np.clip(((rgb - min_v) / diff * 255), 0, 255).astype(np.uint8)
            img = Image.fromarray(rgb.astype(np.uint8))
            img.save(filepath)
        else:
            # 2 bands - save first band
            img = Image.fromarray(data[0].astype(np.uint8))
            img.save(filepath)

    @staticmethod
    def normalize_sentinel2(
        bands: np.ndarray,
        p_min: float = 2.0,
        p_max: float = 98.0
    ) -> np.ndarray:
        """
        Normalizes multi-spectral Sentinel-2 bands using 2nd and 98th percentiles.
        Preserves relative dynamics and reduces atmospheric haze / bright pixel distortion.
        """
        norm = np.zeros_like(bands, dtype=np.float32)
        for i in range(bands.shape[0]):
            b = bands[i]
            valid = b[~np.isnan(b) & (b > 0)]
            if len(valid) == 0:
                norm[i] = 0.0
                continue
            low, high = np.percentile(valid, (p_min, p_max))
            if high > low:
                scaled = (b - low) / (high - low)
                norm[i] = np.clip(scaled, 0.0, 1.0)
            else:
                norm[i] = 0.0
        return norm

    @staticmethod
    def generate_rgb_preview(
        bands: np.ndarray,
        red_idx: int = 3,
        green_idx: int = 2,
        blue_idx: int = 1,
        out_filepath: Optional[str] = None
    ) -> Image.Image:
        """
        Generates an 8-bit true-color RGB preview.
        Default Sentinel-2 band indices (0-based): Red=B04(3), Green=B03(2), Blue=B02(1).
        If only 3 bands exist, uses 0, 1, 2.
        """
        c = bands.shape[0]
        if c == 1:
            r = g = b = bands[0]
        elif c >= 4:
            r = bands[red_idx]
            g = bands[green_idx]
            b = bands[blue_idx]
        elif c == 3:
            r = bands[0]
            g = bands[1]
            b = bands[2]
        else:
            r = bands[0]
            g = bands[1]
            b = bands[0]

        rgb = np.stack([r, g, b], axis=-1)
        # Percentile contrast stretch
        valid = rgb[~np.isnan(rgb) & (rgb > 0)]
        if len(valid) > 0:
            low, high = np.percentile(valid, (2, 98))
            if high > low:
                rgb = np.clip((rgb - low) / (high - low) * 255.0, 0, 255).astype(np.uint8)
            else:
                rgb = (np.clip(rgb, 0, 1) * 255).astype(np.uint8)
        else:
            rgb = np.zeros_like(rgb, dtype=np.uint8)

        img = Image.fromarray(rgb, mode="RGB")
        if out_filepath:
            os.makedirs(os.path.dirname(os.path.abspath(out_filepath)), exist_ok=True)
            img.save(out_filepath, format="PNG")
        return img
