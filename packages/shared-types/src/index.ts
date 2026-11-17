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

export interface MonitoringArea {
  id: string;
  project_id: string;
  name: string;
  description: string;
  geometry: any;
  bbox: [number, number, number, number];
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
}

export interface ContributingSignals {
  spectral_magnitude: number;
  embedding_distance: number;
  ndbi_built_signal: number;
  spatial_compactness: number;
  quality_index: number;
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
  contributing_signals: ContributingSignals;
  status: VerificationStatus;
  revision_number: number;
  created_at: string;
  updated_at: string;
}
