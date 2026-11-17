# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-17

### Added

- **Core Architecture:**
  - Modular Go REST API with Chi router, context authentication, and RBAC (`administrator`, `analyst`, `viewer`).
  - PostgreSQL 16 + PostGIS spatial schema migrations for monitoring areas, satellite observations, change candidates, revisions, evidence, and audit logs.
  - Multi-stage Python geospatial processing engine featuring raster alignment, spectral index deltas (NDBI, NDVI), and Shapely polygonization.
  - React + TypeScript + MapLibre GL frontend with synchronized viewports, draggable swipe divider, and difference overlays.
- **Foundation Model & Dataset Integrations:**
  - `made-with-clay/Clay`: 768-dimensional multi-spectral patch embedding extraction and cosine distance map.
  - `ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL`: Semantic land-cover segmentation and feature representations.
  - `Major-TOM/Core-S2L2A`: Representative Sentinel-2 L2A tile discovery and grid referencing.
  - `wikimedia/linked-openstreetmap-wikidata-wikipedia`: Proximity and spatial intersection resolver linking candidate footprints to OpenStreetMap ways and Wikidata entities.
- **Audit & Human Verification:**
  - Verification workbench with split visual comparison, reason taxonomy, category corrections, and analyst notes.
  - Optimistic concurrency control preventing concurrent review race conditions.
  - Full audit event logging capturing user action, entity identifier, and timestamps.
- **Reporting & Exporting:**
  - Native export support for GeoJSON (`/api/v1/changes/export?format=geojson`), CSV, and Markdown Intelligence Reports.
- **Demonstration:**
  - Reproducible offline demo scenario (`make demo`) modeling the Apex Industrial Logistics Park (2016 baseline vs. 2021 expansion).
