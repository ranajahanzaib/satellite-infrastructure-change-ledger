# Multi-Stage Change Detection Pipeline

The change detection engine does not rely on a simple difference threshold. It uses an ensemble of complementary signals:

```mermaid
flowchart TD
    subgraph S1["Stage 1: Spatial & Temporal Harmonization"]
        R1["Observation T1 (e.g. 2016)"]
        R2["Observation T2 (e.g. 2021)"]
        Align["Bounding Box Intersection & Bilinear Resampling"]
        Norm["Percentile Dynamic Range Normalization"]
        R1 --> Align
        R2 --> Align
        Align --> Norm
    end

    subgraph S2["Stage 2: Feature Signal Extraction"]
        Spectral["Spectral Deltas (ΔNDBI, ΔNDVI, ΔAbsolute)"]
        Embeddings["Clay Foundation Embeddings (Cosine Distance Map)"]
        LandCover["Prithvi-EO 2.0 Semantic Land-Cover Transition"]
        Norm --> Spectral
        Norm --> Embeddings
        Norm --> LandCover
    end

    subgraph S3["Stage 3: Spatial Region Extraction"]
        Ensemble["Weighted Composite Change Surface"]
        Thresh["Adaptive Thresholding"]
        Morph["Morphological Opening & Closing (3x3 / 5x5)"]
        Connected["Connected Components & Polygonization"]
        Spectral --> Ensemble
        Embeddings --> Ensemble
        LandCover --> Ensemble
        Ensemble --> Thresh --> Morph --> Connected
    end

    subgraph S4["Stage 4: Classification & Explainability"]
        Classify{"Heuristic Classifier"}
        NewConst["new_construction"]
        Expansion["building_expansion"]
        Roads["road_development"]
        Clearing["land_clearing"]
        Scoring["Multi-Factor Scoring (Spectral + Clay + Spatial)"]
        Connected --> Classify
        Classify --> NewConst
        Classify --> Expansion
        Classify --> Roads
        Classify --> Clearing
        NewConst --> Scoring
        Expansion --> Scoring
        Roads --> Scoring
        Clearing --> Scoring
    end

    subgraph S5["Stage 5: Verification & Ledger Persistence"]
        OSM["OSM & Wikidata Proximity Linking"]
        Candidate["Candidate Record with Evidence References"]
        Scoring --> OSM --> Candidate
    end
```

## Contributing Signals

- **Spectral Magnitude (0.25 weight)**: Shift in multi-spectral reflectance.
- **Embedding Distance (0.30 weight)**: Cosine distance from `made-with-clay/Clay` 768-dim patch representations.
- **NDBI Built Signal (0.25 weight)**: Increase in Normalized Difference Built-up Index (SWIR - NIR) indicating new concrete or metallic roofs.
- **Spatial Compactness (0.20 weight)**: Ratio of region area to bounding box area, prioritizing coherent structural footprints over linear noise.
