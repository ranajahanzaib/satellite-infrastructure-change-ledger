# REST API Documentation

Base URL: `http://localhost:8080/api/v1`

---

## Authentication & Authorization

All requests support role simulation via header:

- `X-User-Role: administrator | analyst | viewer`
- Or standard `Authorization: Bearer <token>`

---

## Endpoints

### 1. Monitoring Areas

- `GET /api/v1/areas` — List monitoring areas.
- `POST /api/v1/areas` — Create monitoring area with GeoJSON polygon and bounding box.
- `GET /api/v1/areas/{id}` — Get monitoring area details.
- `GET /api/v1/areas/{id}/imagery` — List satellite observations for this area.
- `GET /api/v1/areas/{id}/changes` — List candidate changes in this area.

### 2. Satellite Imagery & Discovery

- `GET /api/v1/imagery` — List acquired satellite observations.
- `POST /api/v1/imagery/search` — Query public STAC endpoints with bounding box, date range, and cloud-cover filters.
- `POST /api/v1/imagery/ingest` — Ingest STAC item into object storage and register metadata.
- `GET /api/v1/imagery/{id}/preview` — Stream true-color PNG preview of the observation.

### 3. Change Detection & Ledger

- `GET /api/v1/changes` — Query candidate physical changes with filters (`status`, `category`, `min_score`, `min_area_m2`, `search`).
- `GET /api/v1/changes/{id}` — Get candidate details with contributing signals and linked entities.
- `GET /api/v1/changes/{id}/history` — Get full audit revision history.
- `GET /api/v1/changes/export` — Export ledger entries (`?format=geojson`, `?format=csv`, `?format=report`).

### 4. Human Verification Actions

_Requires Analyst or Administrator role:_

- `POST /api/v1/changes/{id}/verify` — Mark candidate verified with reason, corrected category, notes, and concurrency version.
- `POST /api/v1/changes/{id}/reject` — Reject candidate with reason (e.g., seasonal change, shadow).
- `POST /api/v1/changes/{id}/request-evidence` — Request additional observations.

### 5. Processing Jobs

- `GET /api/v1/jobs` — List background processing jobs.
- `POST /api/v1/jobs/{id}/retry` — Retry a failed processing job.
- `POST /api/v1/processing/detect` — Trigger multi-stage change detection pipeline.

### 6. System & Observability

- `GET /health` — Health check.
- `GET /ready` — Readiness probe.
- `GET /api/v1/system/stats` — Operational metrics.
- `POST /api/v1/system/seed` — Reset demo scenario.
