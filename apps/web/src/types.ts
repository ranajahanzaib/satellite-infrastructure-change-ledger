export type UserRole = "administrator" | "analyst" | "viewer";

export type VerificationStatus =
  | "detected"
  | "under_review"
  | "verified"
  | "rejected"
  | "needs_more_evidence"
  | "superseded";

export type ChangeCategory =
  | "new_construction"
  | "building_expansion"
  | "demolition"
  | "road_development"
  | "land_clearing"
  | "vegetation_change"
  | "water_body_change"
  | "unclassified_change";

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface MonitoringArea {
  id: string;
  project_id: string;
  name: string;
  description: string;
  geometry: any;
  bbox: [number, number, number, number]; // [min_lon, min_lat, max_lon, max_lat]
  centroid: [number, number];
  area_km2: number;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface SatelliteObservation {
  id: string;
  area_id: string;
  stac_item_id: string;
  collection: string;
  platform: string;
  sensor: string;
  acquisition_date: string;
  cloud_cover_pct: number;
  gsd_meters: number;
  crs: string;
  bbox: number[];
  storage_path: string;
  preview_url: string;
  ingestion_status: string;
  metadata?: Record<string, any>;
}

export interface ContributingSignals {
  spectral_magnitude: number;
  embedding_distance: number;
  ndbi_built_signal: number;
  spatial_compactness: number;
  quality_index: number;
}

export interface GeographicalEntity {
  id: string;
  source: string;
  external_id: string;
  name: string;
  entity_type: string;
  wikidata_id?: string;
  osm_id?: string;
  bbox: number[];
  centroid: number[];
  tags?: Record<string, string>;
}

export interface EntityLink {
  id: string;
  candidate_id: string;
  entity_id: string;
  entity?: GeographicalEntity;
  match_type: string;
  match_score: number;
  distance_meters: number;
  status: "suggested" | "confirmed" | "rejected";
  notes?: string;
  reviewed_by?: string;
}

export interface ChangeEvidence {
  id: string;
  candidate_id: string;
  evidence_type: string;
  reference_url: string;
  description: string;
  created_at: string;
}

export interface ChangeRevision {
  id: string;
  candidate_id: string;
  revision_number: number;
  previous_status: VerificationStatus;
  new_status: VerificationStatus;
  reason: string;
  corrected_category?: string;
  notes: string;
  analyst_name: string;
  created_at: string;
}

export interface ChangeCandidate {
  id: string;
  area_id: string;
  t1_observation_id: string;
  t2_observation_id: string;
  t1_date?: string;
  t2_date?: string;
  geometry: any;
  bbox: [number, number, number, number];
  centroid: [number, number];
  area_m2: number;
  candidate_category: ChangeCategory;
  score: number;
  confidence_band: "high" | "medium" | "low";
  detection_method: string;
  model_versions: Record<string, any>;
  contributing_signals: ContributingSignals;
  status: VerificationStatus;
  revision_number: number;
  evidence?: ChangeEvidence[];
  linked_entities?: EntityLink[];
  created_at: string;
  updated_at: string;
}

export interface ProcessingJob {
  id: string;
  area_id: string;
  job_type: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  stage_message: string;
  input_params: Record<string, any>;
  output_artifacts?: Record<string, any>;
  error_message?: string;
  retry_count: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SystemStats {
  total_areas: number;
  total_observations: number;
  total_candidates: number;
  verified_changes: number;
  pending_reviews: number;
  needs_evidence: number;
  active_jobs: number;
}
