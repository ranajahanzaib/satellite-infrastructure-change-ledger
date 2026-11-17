"""
Spectral index calculation and differential spectral analysis.
Computes NDVI, NDBI, NDWI, and differential change layers.
"""

from __future__ import annotations
import numpy as np
from typing import Dict, Optional, Tuple


class SpectralIndices:
    """
    Computes standard remote sensing indices for land cover and infrastructure change.
    Band conventions (Sentinel-2 10m/20m mapping):
      B02 = Blue
      B03 = Green
      B04 = Red
      B08 / B8A = NIR (Near Infrared)
      B11 = SWIR-1 (Shortwave Infrared)
      B12 = SWIR-2
    """

    @staticmethod
    def compute_normalized_diff(band_a: np.ndarray, band_b: np.ndarray) -> np.ndarray:
        """
        Calculates (band_a - band_b) / (band_a + band_b) with safe zero-division handling.
        Outputs values bounded in [-1.0, 1.0].
        """
        denominator = band_a + band_b
        numerator = band_a - band_b

        with np.errstate(divide="ignore", invalid="ignore"):
            idx = np.where(denominator != 0, numerator / denominator, 0.0)
            idx = np.nan_to_num(idx, nan=0.0, posinf=1.0, neginf=-1.0)
            idx = np.clip(idx, -1.0, 1.0)
        return idx.astype(np.float32)

    @classmethod
    def ndvi(cls, nir: np.ndarray, red: np.ndarray) -> np.ndarray:
        """Normalized Difference Vegetation Index: (NIR - Red) / (NIR + Red)"""
        return cls.compute_normalized_diff(nir, red)

    @classmethod
    def ndbi(cls, swir: np.ndarray, nir: np.ndarray) -> np.ndarray:
        """Normalized Difference Built-up Index: (SWIR - NIR) / (SWIR + NIR)"""
        return cls.compute_normalized_diff(swir, nir)

    @classmethod
    def ndwi(cls, green: np.ndarray, nir: np.ndarray) -> np.ndarray:
        """Normalized Difference Water Index: (Green - NIR) / (Green + NIR)"""
        return cls.compute_normalized_diff(green, nir)

    @classmethod
    def extract_indices_from_raster(
        cls,
        data: np.ndarray,
        band_names: Optional[list[str]] = None
    ) -> Dict[str, np.ndarray]:
        """
        Automatically maps bands to indices based on band names or count.
        If data has >= 4 bands: assumes [Blue, Green, Red, NIR] (or [R, G, B, NIR]).
        If data has >= 6 bands: assumes [Blue, Green, Red, NIR, SWIR1, SWIR2].
        """
        bands = data.shape[0]
        results = {}

        # Default band mapping
        blue_idx, green_idx, red_idx, nir_idx, swir_idx = 0, 1, 2, 3, None

        if band_names:
            name_lower = [n.lower() for n in band_names]
            for i, n in enumerate(name_lower):
                if "b02" in n or "blue" in n:
                    blue_idx = i
                elif "b03" in n or "green" in n:
                    green_idx = i
                elif "b04" in n or "red" in n:
                    red_idx = i
                elif "b08" in n or "b8a" in n or "nir" in n:
                    nir_idx = i
                elif "b11" in n or "swir" in n:
                    swir_idx = i

        if bands >= 4:
            nir = data[nir_idx] if nir_idx < bands else data[3]
            red = data[red_idx] if red_idx < bands else data[2]
            green = data[green_idx] if green_idx < bands else data[1]
            results["ndvi"] = cls.ndvi(nir, red)
            results["ndwi"] = cls.ndwi(green, nir)

            if swir_idx is not None and swir_idx < bands:
                swir = data[swir_idx]
                results["ndbi"] = cls.ndbi(swir, nir)
            else:
                # Approximate built-up index when SWIR is absent using Red and NIR
                # (Red - NIR) / (Red + NIR) acts as an inverted NDVI proxy for bare/built terrain
                results["ndbi"] = cls.compute_normalized_diff(red, nir)
        elif bands == 3:
            # RGB fallback: Green and Red allow pseudo-indices
            red = data[0]
            green = data[1]
            blue = data[2]
            # ExG (Excess Green): 2*G - R - B
            norm_g = green / (red + green + blue + 1e-6)
            norm_r = red / (red + green + blue + 1e-6)
            results["ndvi"] = np.clip(2 * norm_g - norm_r, -1.0, 1.0).astype(np.float32)
            results["ndbi"] = np.clip(norm_r - norm_g, -1.0, 1.0).astype(np.float32)

        return results

    @classmethod
    def temporal_difference(
        cls,
        t1_indices: Dict[str, np.ndarray],
        t2_indices: Dict[str, np.ndarray]
    ) -> Dict[str, np.ndarray]:
        """
        Calculates temporal difference deltas (T2 - T1).
        Positive delta_ndbi indicates increased built-up structures / concrete.
        Negative delta_ndvi indicates vegetation loss / land clearing.
        """
        diffs = {}
        for key in t1_indices:
            if key in t2_indices:
                diffs[f"delta_{key}"] = t2_indices[key] - t1_indices[key]
        return diffs
