"""
Generates synthetic multi-temporal geospatial rasters and vector fixtures
for the Apex Industrial Logistics Park demonstration scenario.
Produces multi-band GeoTIFFs:
  - 2016 Baseline (Undeveloped agricultural / natural land with single small structure)
  - 2021 Expansion (Major industrial estate with 4 logistics warehouses and asphalt road network)
Includes CRS metadata, geotransform, and RGB preview PNGs.
"""

from __future__ import annotations
import json
import os
import sys
import numpy as np
from PIL import Image

# Ensure processing package is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "services", "processing")))
from src.raster.geotiff import RasterIO, RasterMetadata


def generate_synthetic_industrial_dataset(out_dir: str = "data/samples"):
    os.makedirs(out_dir, exist_ok=True)

    width = 256
    height = 256
    bands = 5  # B02 (Blue), B03 (Green), B04 (Red), B08 (NIR), B11 (SWIR)

    # Geographic footprint (Apex Industrial Park study area, near North San Jose / Bay Area)
    min_lon = -122.445
    min_lat = 37.765
    max_lon = -122.415
    max_lat = 37.785
    bounds = (min_lon, min_lat, max_lon, max_lat)
    res_x = (max_lon - min_lon) / width
    res_y = (max_lat - min_lat) / height

    # Seed random generator for reproducible textures
    rng = np.random.RandomState(42)

    # -------------------------------------------------------------------------
    # 1. 2016 Baseline Observation: Mostly natural vegetation, light dirt road
    # -------------------------------------------------------------------------
    # Baseline natural vegetation has low Red, medium Green, very high NIR, low SWIR
    t1 = np.zeros((bands, height, width), dtype=np.float32)

    # Background terrain texture (grassland / light woodland)
    base_noise = rng.normal(0, 0.03, (height, width)).astype(np.float32)
    t1[0] = 0.08 + base_noise * 0.5   # Blue
    t1[1] = 0.16 + base_noise        # Green
    t1[2] = 0.10 + base_noise        # Red
    t1[3] = 0.52 + base_noise * 1.5  # NIR (high vegetation reflectance)
    t1[4] = 0.12 + base_noise        # SWIR

    # Add a gentle water body in the southwest corner
    yy, xx = np.mgrid[:height, :width]
    water_mask = ((xx - 40)**2 + (yy - 210)**2) < 25**2
    t1[0, water_mask] = 0.18
    t1[1, water_mask] = 0.14
    t1[2, water_mask] = 0.08
    t1[3, water_mask] = 0.04  # Water absorbs NIR
    t1[4, water_mask] = 0.02

    # Add a single small pre-existing rural building in 2016 (30x20 px)
    t1[0, 110:130, 60:90] = 0.28
    t1[1, 110:130, 60:90] = 0.26
    t1[2, 110:130, 60:90] = 0.29
    t1[3, 110:130, 60:90] = 0.25
    t1[4, 110:130, 60:90] = 0.32

    # Add narrow unpaved dirt path
    path_mask = (abs((yy - 120) - 0.2 * xx) < 2)
    t1[0, path_mask] = 0.15
    t1[1, path_mask] = 0.18
    t1[2, path_mask] = 0.22
    t1[3, path_mask] = 0.24
    t1[4, path_mask] = 0.28

    # -------------------------------------------------------------------------
    # 2. 2021 Observation: Major industrial expansion!
    # -------------------------------------------------------------------------
    t2 = t1.copy()

    # Broad land clearing for industrial park (central & eastern sector)
    cleared_mask = (xx > 100) & (xx < 240) & (yy > 30) & (yy < 220)
    # Cleared bare ground has higher Red/SWIR and lower NIR
    t2[0, cleared_mask] = 0.18 + rng.normal(0, 0.02, (height, width))[cleared_mask]
    t2[1, cleared_mask] = 0.20 + rng.normal(0, 0.02, (height, width))[cleared_mask]
    t2[2, cleared_mask] = 0.24 + rng.normal(0, 0.02, (height, width))[cleared_mask]
    t2[3, cleared_mask] = 0.22 + rng.normal(0, 0.02, (height, width))[cleared_mask]
    t2[4, cleared_mask] = 0.35 + rng.normal(0, 0.02, (height, width))[cleared_mask]

    # Major Logistics Warehouse Building A (Large rectangular structure: 70 x 45 px)
    b_a = (yy >= 50) & (yy <= 95) & (xx >= 120) & (xx <= 190)
    t2[0, b_a] = 0.42  # Bright reflective white/metal industrial roof
    t2[1, b_a] = 0.44
    t2[2, b_a] = 0.45
    t2[3, b_a] = 0.40
    t2[4, b_a] = 0.50

    # Logistics Warehouse Building B (55 x 40 px)
    b_b = (yy >= 115) & (yy <= 155) & (xx >= 125) & (xx <= 180)
    t2[0, b_b] = 0.38
    t2[1, b_b] = 0.40
    t2[2, b_b] = 0.41
    t2[3, b_b] = 0.36
    t2[4, b_b] = 0.48

    # Cold Storage Warehouse Building C (45 x 35 px)
    b_c = (yy >= 170) & (yy <= 205) & (xx >= 135) & (xx <= 180)
    t2[0, b_c] = 0.45
    t2[1, b_c] = 0.46
    t2[2, b_c] = 0.47
    t2[3, b_c] = 0.42
    t2[4, b_c] = 0.52

    # Freight Distribution Depot D (40 x 30 px)
    b_d = (yy >= 70) & (yy <= 110) & (xx >= 200) & (xx <= 230)
    t2[0, b_d] = 0.35
    t2[1, b_d] = 0.36
    t2[2, b_d] = 0.38
    t2[3, b_d] = 0.33
    t2[4, b_d] = 0.46

    # Asphalt Access Road Network (Main spine + loading bays)
    road_spine = (xx >= 105) & (xx <= 115) & (yy >= 30) & (yy <= 220)
    road_branch1 = (yy >= 100) & (yy <= 108) & (xx >= 115) & (xx <= 235)
    road_branch2 = (yy >= 160) & (yy <= 168) & (xx >= 115) & (xx <= 230)
    road_mask = road_spine | road_branch1 | road_branch2
    t2[0, road_mask] = 0.12  # Dark asphalt
    t2[1, road_mask] = 0.13
    t2[2, road_mask] = 0.13
    t2[3, road_mask] = 0.14
    t2[4, road_mask] = 0.18

    # Concrete loading aprons / parking lots around buildings
    parking_mask = (xx >= 185) & (xx <= 198) & (yy >= 50) & (yy <= 95)
    t2[0, parking_mask] = 0.30
    t2[1, parking_mask] = 0.31
    t2[2, parking_mask] = 0.32
    t2[3, parking_mask] = 0.28
    t2[4, parking_mask] = 0.38

    # Clip all bands to valid reflectance range
    t1 = np.clip(t1, 0.0, 1.0)
    t2 = np.clip(t2, 0.0, 1.0)

    # -------------------------------------------------------------------------
    # Save rasters and metadata
    # -------------------------------------------------------------------------
    band_names = ["B02_Blue", "B03_Green", "B04_Red", "B08_NIR", "B11_SWIR"]
    meta_t1 = RasterMetadata(
        width=width,
        height=height,
        bands=bands,
        crs="EPSG:4326",
        bounds=bounds,
        resolution=(res_x, res_y),
        nodata=0.0,
        dtype="float32",
        band_names=band_names,
    )
    meta_t2 = RasterMetadata(
        width=width,
        height=height,
        bands=bands,
        crs="EPSG:4326",
        bounds=bounds,
        resolution=(res_x, res_y),
        nodata=0.0,
        dtype="float32",
        band_names=band_names,
    )

    t1_path = os.path.join(out_dir, "sentinel2_2016_baseline.tif")
    t2_path = os.path.join(out_dir, "sentinel2_2021_expansion.tif")

    RasterIO.write(t1_path, t1, meta_t1)
    RasterIO.write(t2_path, t2, meta_t2)

    # Generate true-color previews (RGB = Red, Green, Blue)
    t1_preview_path = os.path.join(out_dir, "preview_2016_baseline.png")
    t2_preview_path = os.path.join(out_dir, "preview_2021_expansion.png")

    RasterIO.generate_rgb_preview(t1, red_idx=2, green_idx=1, blue_idx=0, out_filepath=t1_preview_path)
    RasterIO.generate_rgb_preview(t2, red_idx=2, green_idx=1, blue_idx=0, out_filepath=t2_preview_path)

    # Save Area GeoJSON specification
    area_geojson = {
        "type": "Feature",
        "properties": {
            "area_id": "area-apex-park-01",
            "name": "Apex Industrial Logistics Park",
            "category": "industrial_expansion",
            "description": "Multi-temporal monitoring of warehouse logistics infrastructure expansion (2016-2021)",
            "center": [(min_lon + max_lon) / 2.0, (min_lat + max_lat) / 2.0],
            "area_km2": 4.82,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [min_lon, min_lat],
                [max_lon, min_lat],
                [max_lon, max_lat],
                [min_lon, max_lat],
                [min_lon, min_lat]
            ]]
        }
    }
    with open(os.path.join(out_dir, "monitoring_area_apex.geojson"), "w") as f:
        json.dump(area_geojson, f, indent=2)

    print(f"Generated synthetic demo dataset in {out_dir}:")
    print(f"  - 2016 Baseline: {t1_path} ({width}x{height}, 5 bands)")
    print(f"  - 2021 Expansion: {t2_path} ({width}x{height}, 5 bands)")
    print(f"  - Previews: {t1_preview_path}, {t2_preview_path}")


if __name__ == "__main__":
    generate_synthetic_industrial_dataset()
