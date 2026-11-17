"""
Automated unit tests for geospatial raster loading, temporal alignment,
spectral indices, Clay/Prithvi adapters, and multi-stage change detection.
"""

import numpy as np
import pytest
from shapely.geometry import shape

from src.raster.geotiff import RasterIO, RasterMetadata
from src.alignment.spatial import TemporalAligner
from src.indices.spectral import SpectralIndices
from src.models.clay_adapter import ClayAdapter
from src.models.prithvi_adapter import PrithviAdapter
from src.models.osm_wikidata_adapter import OsmWikidataAdapter
from src.detection.engine import ChangeDetectionEngine


@pytest.fixture
def synthetic_raster_pair():
    """Generates two 64x64 multi-spectral rasters (bands: B, G, R, NIR, SWIR)."""
    h, w = 64, 64
    bands = 5
    bounds = (-122.44, 37.76, -122.42, 37.78)
    res_x = (bounds[2] - bounds[0]) / w
    res_y = (bounds[3] - bounds[1]) / h

    # T1: Vegetated baseline
    t1 = np.ones((bands, h, w), dtype=np.float32) * 0.15
    t1[3] = 0.50  # High NIR (vegetation)
    t1[2] = 0.08  # Low Red

    # T2: New industrial building added in center (20x20 pixels)
    t2 = t1.copy()
    t2[0, 20:40, 20:40] = 0.40  # Blue
    t2[1, 20:40, 20:40] = 0.42  # Green
    t2[2, 20:40, 20:40] = 0.45  # Red
    t2[3, 20:40, 20:40] = 0.38  # NIR
    t2[4, 20:40, 20:40] = 0.52  # SWIR (high built-up signal)

    meta = RasterMetadata(
        width=w,
        height=h,
        bands=bands,
        crs="EPSG:4326",
        bounds=bounds,
        resolution=(res_x, res_y),
        nodata=0.0,
        dtype="float32",
        band_names=["B02", "B03", "B04", "B08", "B11"],
    )
    return t1, t2, meta


def test_spectral_indices_calculation(synthetic_raster_pair):
    t1, t2, meta = synthetic_raster_pair
    indices_t1 = SpectralIndices.extract_indices_from_raster(t1, meta.band_names)
    indices_t2 = SpectralIndices.extract_indices_from_raster(t2, meta.band_names)

    assert "ndvi" in indices_t1
    assert "ndbi" in indices_t1

    # T1 center should have high NDVI (vegetation)
    assert np.mean(indices_t1["ndvi"][20:40, 20:40]) > 0.50

    # T2 center should have positive NDBI increase (built-up)
    deltas = SpectralIndices.temporal_difference(indices_t1, indices_t2)
    assert "delta_ndbi" in deltas
    assert np.mean(deltas["delta_ndbi"][20:40, 20:40]) > 0.10


def test_temporal_alignment(synthetic_raster_pair):
    t1, t2, meta = synthetic_raster_pair
    aligned_t1, aligned_t2, common_meta, report = TemporalAligner.align_pair(t1, meta, t2, meta)

    assert aligned_t1.shape == aligned_t2.shape
    assert report["overlap_pct"] == 100.0
    assert report["reliable"] is True
    assert common_meta.width == meta.width


def test_clay_embedding_adapter(synthetic_raster_pair):
    t1, t2, _ = synthetic_raster_pair
    adapter = ClayAdapter()
    emb_t1, meta1 = adapter.extract_patch_embeddings(t1, patch_size=16)
    emb_t2, meta2 = adapter.extract_patch_embeddings(t2, patch_size=16)

    assert emb_t1.shape[-1] == 768
    assert emb_t2.shape[-1] == 768

    dist_map, mean_dist = adapter.compute_temporal_similarity(emb_t1, emb_t2)
    assert dist_map.shape == (4, 4)
    # The center patches should exhibit greater distance due to the new structure
    assert dist_map[1, 1] > 0.0


def test_prithvi_segmentation(synthetic_raster_pair):
    t1, t2, meta = synthetic_raster_pair
    prithvi = PrithviAdapter()
    class_map_t1, _, fractions_t1 = prithvi.segment_land_cover(t1, meta.band_names)
    class_map_t2, _, fractions_t2 = prithvi.segment_land_cover(t2, meta.band_names)

    assert class_map_t1.shape == (64, 64)
    assert class_map_t2.shape == (64, 64)
    assert fractions_t1["forest"] + fractions_t1["low_vegetation"] > 0.50
    # In T2, industrial_structure should be detected in the modified area
    assert fractions_t2["industrial_structure"] > 0.05


def test_osm_wikidata_entity_resolution():
    adapter = OsmWikidataAdapter()
    # Test candidate within Apex industrial park footprint
    matches = adapter.find_candidates(
        candidate_bbox=(-122.435, 37.770, -122.425, 37.778),
        candidate_centroid=(-122.430, 37.774),
        max_distance_meters=1500.0
    )
    assert len(matches) > 0
    top_match = matches[0]
    assert "Apex" in top_match["entity"]["name"] or "Freight" in top_match["entity"]["name"]
    assert top_match["match_score"] > 0.5


def test_end_to_end_change_detection(synthetic_raster_pair):
    t1, t2, meta = synthetic_raster_pair
    engine = ChangeDetectionEngine(min_region_size_pixels=4, min_area_m2=100.0)
    candidates, diff_raster, summary = engine.detect_changes(t1, t2, meta)

    assert summary["total_candidates"] >= 1
    # Check that candidate geometry is a valid GeoJSON polygon
    cand = candidates[0]
    assert cand.category in ["new_construction", "building_expansion", "land_clearing"]
    assert cand.score > 0.40
    geom_shape = shape(cand.geometry)
    assert geom_shape.is_valid
    assert cand.area_m2 > 0
