# Foundation Model & Dataset Adapters

Every external machine learning model and dataset is isolated behind an adapter with explicit capabilities and limitations.

---

### 1. Model: `made-with-clay/Clay`

- **Purpose:** Satellite image representation, multi-spectral patch embeddings, temporal representation distance.
- **Input Requirements:** Multi-band raster patches (e.g. 32x32 pixels, Sentinel-2 bands).
- **Output:** 768-dimensional unit-normalized embedding vector.
- **Hardware Requirements:** CPU or Apple Silicon MPS / CUDA GPU.
- **Fallback:** Deterministic CPU-based multi-spectral gradient & index projector.
- **Known Limitations:** Embedding distance is a relative metric of visual displacement, not a calibrated statistical probability of physical construction.

---

### 2. Model: `ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL`

- **Purpose:** Multi-temporal land-cover representation, semantic feature extraction, infrastructure segmentation.
- **Input Requirements:** Sentinel-2 Level-2A multi-band reflectance.
- **Output:** 8-class categorical probability distribution (water, forest, low vegetation, agriculture, bare ground, impervious, industrial structures, road networks).
- **Hardware Requirements:** High-memory GPU recommended for 600M parameter model; CPU fallback provided.
- **Known Limitations:** Cloud shadows and solar elevation differences can shift borderline predictions between bare ground and low vegetation.

---

### 3. Dataset: `Major-TOM/Core-S2L2A`

- **Purpose:** Globally sampled, systematic Sentinel-2 Level-2A multi-temporal tile grids.
- **Format:** Cloud Optimized GeoTIFF (COG), 10m/20m Ground Sampling Distance.
- **Licensing:** CC-BY-4.0.
- **Usage:** Benchmark calibration and reference tile discovery.

---

### 4. Dataset: `wikimedia/linked-openstreetmap-wikidata-wikipedia`

- **Purpose:** Connect detected candidate infrastructure footprints to known real-world entities.
- **Entity Matching:** Centroid proximity (Haversine formula) and bounding-box spatial intersection.
- **Taxonomy:** Industrial parks, warehouses, distribution centers, factories, and commercial logistics hubs.
- **Known Limitations:** Newly erected structures may lack OSM tags for several months until mapped by community volunteers.
