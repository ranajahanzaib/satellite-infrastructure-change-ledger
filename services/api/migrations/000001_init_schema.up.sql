-- Satellite Infrastructure Change Ledger Database Schema (PostgreSQL + PostGIS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users and RBAC
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('administrator', 'analyst', 'viewer')),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'industrial_expansion',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Monitoring Areas
CREATE TABLE IF NOT EXISTS monitoring_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geometry GEOMETRY(Geometry, 4326),
    geometry_geojson JSONB NOT NULL,
    bbox JSONB NOT NULL, -- [min_lon, min_lat, max_lon, max_lat]
    centroid JSONB NOT NULL, -- [lon, lat]
    area_km2 DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_areas_geom ON monitoring_areas USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_monitoring_areas_project ON monitoring_areas(project_id);

-- Imagery Sources & Catalogs
CREATE TABLE IF NOT EXISTS imagery_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    stac_endpoint VARCHAR(512),
    auth_type VARCHAR(50) DEFAULT 'none',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Satellite Observations
CREATE TABLE IF NOT EXISTS satellite_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID NOT NULL REFERENCES monitoring_areas(id) ON DELETE CASCADE,
    source_id UUID REFERENCES imagery_sources(id) ON DELETE SET NULL,
    stac_item_id VARCHAR(255) NOT NULL,
    collection VARCHAR(100) NOT NULL,
    platform VARCHAR(100) NOT NULL,
    sensor VARCHAR(100) NOT NULL DEFAULT 'MSI',
    acquisition_date TIMESTAMPTZ NOT NULL,
    cloud_cover_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    gsd_meters DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    crs VARCHAR(50) NOT NULL DEFAULT 'EPSG:4326',
    bbox JSONB NOT NULL,
    footprint_geojson JSONB NOT NULL,
    storage_path VARCHAR(1024),
    preview_url VARCHAR(1024),
    bands JSONB NOT NULL DEFAULT '[]',
    ingestion_status VARCHAR(50) NOT NULL DEFAULT 'ingested' CHECK (ingestion_status IN ('discovered', 'pending', 'ingested', 'failed')),
    checksum VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satellite_observations_area_date ON satellite_observations(area_id, acquisition_date);

-- Processing Jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID REFERENCES monitoring_areas(id) ON DELETE CASCADE,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    stage_message VARCHAR(255) DEFAULT '',
    input_params JSONB NOT NULL DEFAULT '{}',
    output_artifacts JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_area_status ON processing_jobs(area_id, status);

-- Candidate Physical Changes
CREATE TABLE IF NOT EXISTS change_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID NOT NULL REFERENCES monitoring_areas(id) ON DELETE CASCADE,
    t1_observation_id UUID REFERENCES satellite_observations(id) ON DELETE SET NULL,
    t2_observation_id UUID REFERENCES satellite_observations(id) ON DELETE SET NULL,
    geometry GEOMETRY(Geometry, 4326),
    geometry_geojson JSONB NOT NULL,
    bbox JSONB NOT NULL,
    centroid JSONB NOT NULL,
    area_m2 DOUBLE PRECISION NOT NULL,
    candidate_category VARCHAR(100) NOT NULL,
    score DOUBLE PRECISION NOT NULL CHECK (score >= 0.0 AND score <= 1.0),
    confidence_band VARCHAR(50) NOT NULL CHECK (confidence_band IN ('high', 'medium', 'low')),
    detection_method VARCHAR(100) NOT NULL,
    model_versions JSONB NOT NULL DEFAULT '{}',
    contributing_signals JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'under_review', 'verified', 'rejected', 'needs_more_evidence', 'superseded')),
    revision_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_candidates_geom ON change_candidates USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_change_candidates_area_status ON change_candidates(area_id, status);

-- Change Revision History (Audit trail of decisions and reclassifications)
CREATE TABLE IF NOT EXISTS change_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES change_candidates(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    corrected_category VARCHAR(100),
    notes TEXT,
    analyst_id UUID REFERENCES users(id) ON DELETE SET NULL,
    analyst_name VARCHAR(255) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Change Evidence References
CREATE TABLE IF NOT EXISTS change_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES change_candidates(id) ON DELETE CASCADE,
    evidence_type VARCHAR(100) NOT NULL,
    reference_url VARCHAR(1024) NOT NULL,
    description TEXT,
    metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geographical Entities (OpenStreetMap, Wikidata)
CREATE TABLE IF NOT EXISTS geographical_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(100) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    wikidata_id VARCHAR(100),
    osm_id VARCHAR(100),
    wikipedia_title VARCHAR(255),
    geometry_geojson JSONB NOT NULL,
    bbox JSONB NOT NULL,
    centroid JSONB NOT NULL,
    tags JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Entity Links
CREATE TABLE IF NOT EXISTS entity_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES change_candidates(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES geographical_entities(id) ON DELETE CASCADE,
    match_type VARCHAR(50) NOT NULL,
    match_score DOUBLE PRECISION NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed', 'rejected')),
    notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verification Decisions
CREATE TABLE IF NOT EXISTS verification_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES change_candidates(id) ON DELETE CASCADE,
    analyst_id UUID REFERENCES users(id) ON DELETE SET NULL,
    analyst_name VARCHAR(255) NOT NULL,
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('verify', 'reject', 'request_evidence')),
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    corrected_category VARCHAR(100),
    notes TEXT,
    concurrency_version INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL DEFAULT 'System',
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);
