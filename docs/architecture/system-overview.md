# System Architecture: satellite-infrastructure-change-ledger

`satellite-infrastructure-change-ledger` is an open-source geospatial platform for monitoring, analyzing, documenting, and verifying physical infrastructure changes using multi-temporal satellite imagery.

```mermaid
flowchart TD
    subgraph UI["React Web Frontend (TypeScript + Tailwind + MapLibre GL)"]
        Shell["Application Shell & Navigation"]
        Comp["Temporal Comparison Workspace (Split/Swipe/Fade)"]
        Ledger["Change Ledger & Audit Trail"]
        Verify["Human Verification Workbench"]
    end

    subgraph API["Go Application Backend (REST API)"]
        Router["Chi Router & Auth Middleware"]
        Areas["Monitoring Areas Manager"]
        Obs["Satellite Observations Registry"]
        Engine["Processing Orchestrator"]
        VerifyService["Verification & Concurrency Engine"]
        Storage["Storage Repository (PostgreSQL / In-Memory)"]
    end

    subgraph Proc["Python Processing Engine (FastAPI & CLI)"]
        Raster["RasterIO & Cloud Masking"]
        Align["TemporalAligner (CRS & Grid Harmonization)"]
        Indices["SpectralIndices (NDBI, NDVI, NDWI)"]
        Clay["Clay Foundation Model Adapter (768-dim)"]
        Prithvi["Prithvi-EO 2.0 Adapter (Segmentation)"]
        Detect["6-Stage Change Detection Engine"]
        OSM["OSM & Wikidata Entity Resolver"]
    end

    subgraph Data["Persistent Storage"]
        DB[("PostgreSQL 16 + PostGIS")]
        S3[("Object Storage (MinIO / S3 COGs)")]
    end

    Shell --> Router
    Comp --> Router
    Ledger --> Router
    Verify --> Router

    Router --> Areas
    Router --> Obs
    Router --> Engine
    Router --> VerifyService

    Engine --> Proc
    Storage --> DB
    Obs --> S3

    Proc --> Raster
    Raster --> Align
    Align --> Indices
    Align --> Clay
    Align --> Prithvi
    Indices --> Detect
    Clay --> Detect
    Prithvi --> Detect
    Detect --> OSM
```

## Key Architectural Principles

1. **Documented Observations vs. Facts**: Every detected physical change is treated as an observation requiring evidence and human analyst confirmation before being certified in the ledger.
2. **Separation of Concerns**: Go manages high-concurrency API requests, user roles, transactions, and audit revisions; Python handles numerical raster processing, matrix operations, and foundation model inference.
3. **Resilience & Zero-Dependency Standalone Mode**: The platform functions seamlessly with PostgreSQL/PostGIS and MinIO in Docker, and also supports native local execution with deterministic test datasets and CPU-compatible model adapters.
