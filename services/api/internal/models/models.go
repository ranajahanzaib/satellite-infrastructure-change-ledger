package models

import (
	"time"
)

type UserRole string

const (
	RoleAdmin   UserRole = "administrator"
	RoleAnalyst UserRole = "analyst"
	RoleViewer  UserRole = "viewer"
)

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	Role         UserRole  `json:"role"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

type Project struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	CreatedBy   string    `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type MonitoringArea struct {
	ID              string                 `json:"id"`
	ProjectID       string                 `json:"project_id"`
	Name            string                 `json:"name"`
	Description     string                 `json:"description"`
	GeometryGeoJSON map[string]interface{} `json:"geometry"`
	BBox            []float64              `json:"bbox"`     // [min_lon, min_lat, max_lon, max_lat]
	Centroid        []float64              `json:"centroid"` // [lon, lat]
	AreaKm2         float64                `json:"area_km2"`
	Status          string                 `json:"status"` // "active", "archived"
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

type SatelliteObservation struct {
	ID               string                 `json:"id"`
	AreaID           string                 `json:"area_id"`
	SourceID         string                 `json:"source_id"`
	STACItemID       string                 `json:"stac_item_id"`
	Collection       string                 `json:"collection"`
	Platform         string                 `json:"platform"`
	Sensor           string                 `json:"sensor"`
	AcquisitionDate  time.Time              `json:"acquisition_date"`
	CloudCoverPct    float64                `json:"cloud_cover_pct"`
	GSDMeters        float64                `json:"gsd_meters"`
	CRS              string                 `json:"crs"`
	BBox             []float64              `json:"bbox"`
	FootprintGeoJSON map[string]interface{} `json:"footprint"`
	StoragePath      string                 `json:"storage_path"`
	PreviewURL       string                 `json:"preview_url"`
	Bands            []BandMetadata         `json:"bands"`
	IngestionStatus  string                 `json:"ingestion_status"` // "discovered", "pending", "ingested", "failed"
	Checksum         string                 `json:"checksum"`
	Metadata         map[string]interface{} `json:"metadata"`
	CreatedAt        time.Time              `json:"created_at"`
}

type BandMetadata struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	GSDMeters   float64 `json:"gsd_meters"`
	Wavelength  float64 `json:"wavelength_nm,omitempty"`
}

type JobStatus string

const (
	JobPending   JobStatus = "pending"
	JobRunning   JobStatus = "running"
	JobCompleted JobStatus = "completed"
	JobFailed    JobStatus = "failed"
)

type ProcessingJob struct {
	ID              string                 `json:"id"`
	AreaID          string                 `json:"area_id"`
	JobType         string                 `json:"job_type"`
	Status          JobStatus              `json:"status"`
	Progress        int                    `json:"progress"` // 0-100
	StageMessage    string                 `json:"stage_message"`
	InputParams     map[string]interface{} `json:"input_params"`
	OutputArtifacts map[string]interface{} `json:"output_artifacts"`
	ErrorMessage    string                 `json:"error_message,omitempty"`
	RetryCount      int                    `json:"retry_count"`
	StartedAt       *time.Time             `json:"started_at,omitempty"`
	CompletedAt     *time.Time             `json:"completed_at,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
}

type VerificationStatus string

const (
	StatusDetected          VerificationStatus = "detected"
	StatusUnderReview       VerificationStatus = "under_review"
	StatusVerified          VerificationStatus = "verified"
	StatusRejected          VerificationStatus = "rejected"
	StatusNeedsMoreEvidence VerificationStatus = "needs_more_evidence"
	StatusSuperseded        VerificationStatus = "superseded"
)

type ChangeCandidate struct {
	ID                  string                 `json:"id"`
	AreaID              string                 `json:"area_id"`
	T1ObservationID     string                 `json:"t1_observation_id"`
	T2ObservationID     string                 `json:"t2_observation_id"`
	T1Date              string                 `json:"t1_date,omitempty"`
	T2Date              string                 `json:"t2_date,omitempty"`
	GeometryGeoJSON     map[string]interface{} `json:"geometry"`
	BBox                []float64              `json:"bbox"`
	Centroid            []float64              `json:"centroid"`
	AreaM2              float64                `json:"area_m2"`
	CandidateCategory   string                 `json:"candidate_category"`
	Score               float64                `json:"score"`
	ConfidenceBand      string                 `json:"confidence_band"` // "high", "medium", "low"
	DetectionMethod     string                 `json:"detection_method"`
	ModelVersions       map[string]interface{} `json:"model_versions"`
	ContributingSignals map[string]float64     `json:"contributing_signals"`
	Status              VerificationStatus     `json:"status"`
	RevisionNumber      int                    `json:"revision_number"`
	Evidence            []ChangeEvidence       `json:"evidence,omitempty"`
	LinkedEntities      []EntityLink           `json:"linked_entities,omitempty"`
	CreatedAt           time.Time              `json:"created_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

type ChangeRevision struct {
	ID                string                 `json:"id"`
	CandidateID       string                 `json:"candidate_id"`
	RevisionNumber    int                    `json:"revision_number"`
	PreviousStatus    VerificationStatus     `json:"previous_status"`
	NewStatus         VerificationStatus     `json:"new_status"`
	Reason            string                 `json:"reason"`
	CorrectedCategory string                 `json:"corrected_category,omitempty"`
	Notes             string                 `json:"notes"`
	AnalystID         string                 `json:"analyst_id"`
	AnalystName       string                 `json:"analyst_name"`
	Metadata          map[string]interface{} `json:"metadata"`
	CreatedAt         time.Time              `json:"created_at"`
}

type ChangeEvidence struct {
	ID           string                 `json:"id"`
	CandidateID  string                 `json:"candidate_id"`
	EvidenceType string                 `json:"evidence_type"` // "source_t1_raster", "source_t2_raster", "diff_raster", etc.
	ReferenceURL string                 `json:"reference_url"`
	Description  string                 `json:"description"`
	Metrics      map[string]interface{} `json:"metrics"`
	CreatedAt    time.Time              `json:"created_at"`
}

type GeographicalEntity struct {
	ID              string                 `json:"id"`
	Source          string                 `json:"source"` // "openstreetmap", "wikidata", "linked_osm_wikidata"
	ExternalID      string                 `json:"external_id"`
	Name            string                 `json:"name"`
	EntityType      string                 `json:"entity_type"` // "industrial_park", "warehouse", "factory", etc.
	WikidataID      string                 `json:"wikidata_id,omitempty"`
	OSMID           string                 `json:"osm_id,omitempty"`
	WikipediaTitle  string                 `json:"wikipedia_title,omitempty"`
	GeometryGeoJSON map[string]interface{} `json:"geometry"`
	BBox            []float64              `json:"bbox"`
	Centroid        []float64              `json:"centroid"`
	Tags            map[string]string      `json:"tags"`
	CreatedAt       time.Time              `json:"created_at"`
}

type EntityLink struct {
	ID             string              `json:"id"`
	CandidateID    string              `json:"candidate_id"`
	EntityID       string              `json:"entity_id"`
	Entity         *GeographicalEntity `json:"entity,omitempty"`
	MatchType      string              `json:"match_type"` // "polygon_overlap", "centroid_proximity"
	MatchScore     float64             `json:"match_score"`
	DistanceMeters float64             `json:"distance_meters"`
	Status         string              `json:"status"` // "suggested", "confirmed", "rejected"
	Notes          string              `json:"notes,omitempty"`
	ReviewedBy     string              `json:"reviewed_by,omitempty"`
	ReviewedAt     *time.Time          `json:"reviewed_at,omitempty"`
	CreatedAt      time.Time           `json:"created_at"`
}

type VerificationDecision struct {
	ID                string             `json:"id"`
	CandidateID       string             `json:"candidate_id"`
	AnalystID         string             `json:"analyst_id"`
	AnalystName       string             `json:"analyst_name"`
	Decision          string             `json:"decision"` // "verify", "reject", "request_evidence"
	PreviousStatus    VerificationStatus `json:"previous_status"`
	NewStatus         VerificationStatus `json:"new_status"`
	Reason            string             `json:"reason"`
	CorrectedCategory string             `json:"corrected_category,omitempty"`
	Notes             string             `json:"notes"`
	ConcurrencyVer    int                `json:"concurrency_version"`
	CreatedAt         time.Time          `json:"created_at"`
}

type AuditEvent struct {
	ID         string                 `json:"id"`
	UserID     string                 `json:"user_id"`
	UserName   string                 `json:"user_name"`
	Action     string                 `json:"action"`
	EntityType string                 `json:"entity_type"`
	EntityID   string                 `json:"entity_id"`
	Details    map[string]interface{} `json:"details"`
	IPAddress  string                 `json:"ip_address"`
	CreatedAt  time.Time              `json:"created_at"`
}
