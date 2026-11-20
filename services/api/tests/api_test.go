package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/api"
	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/models"
	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/storage"
)

func setupTestServer() (*api.Server, storage.Repository) {
	repo := storage.NewMemoryRepository()
	srv := api.NewServer(repo, "http://mock-worker:8081")
	return srv, repo
}

func TestHealthAndStats(t *testing.T) {
	srv, _ := setupTestServer()

	// Test /health
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	// Test /api/v1/system/stats
	req = httptest.NewRequest(http.MethodGet, "/api/v1/system/stats", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var stats map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&stats); err != nil {
		t.Fatalf("decode stats failed: %v", err)
	}
	if stats["total_areas"].(float64) < 1 {
		t.Errorf("expected at least 1 area, got %v", stats["total_areas"])
	}
}

func TestMonitoringAreaCRUD(t *testing.T) {
	srv, _ := setupTestServer()

	// Create area
	payload := []byte(`{
		"name": "Solar Expansion Facility Alpha",
		"description": "Photovoltaic farm expansion tracking",
		"bbox": [-115.15, 36.10, -115.10, 36.15],
		"area_km2": 3.4
	}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/areas", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var created models.MonitoringArea
	_ = json.NewDecoder(rec.Body).Decode(&created)
	if created.ID == "" || created.Name != "Solar Expansion Facility Alpha" {
		t.Errorf("invalid created area: %+v", created)
	}

	// Get area
	req = httptest.NewRequest(http.MethodGet, "/api/v1/areas/"+created.ID, nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestChangeLedgerAndFiltering(t *testing.T) {
	srv, _ := setupTestServer()

	// List all changes
	req := httptest.NewRequest(http.MethodGet, "/api/v1/changes", nil)
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var res struct {
		Data  []models.ChangeCandidate `json:"data"`
		Total int                      `json:"total"`
	}
	_ = json.NewDecoder(rec.Body).Decode(&res)
	if res.Total < 1 {
		t.Fatalf("expected candidates in ledger, got %d", res.Total)
	}

	// Filter by category
	req = httptest.NewRequest(http.MethodGet, "/api/v1/changes?category=new_construction", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)
	_ = json.NewDecoder(rec.Body).Decode(&res)
	for _, c := range res.Data {
		if c.CandidateCategory != "new_construction" {
			t.Errorf("filter mismatch, expected new_construction, got %s", c.CandidateCategory)
		}
	}
}

func TestVerificationWorkflowAndConcurrency(t *testing.T) {
	srv, repo := setupTestServer()

	candID := "cand-apex-wh-b" // Starts as under_review with revision 1

	// Verify candidate as Analyst
	verifyPayload := []byte(`{
		"reason": "confirmed_physical_construction",
		"notes": "Verified steel truss warehouse structure from 2021 imagery",
		"concurrency_version": 1
	}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/changes/"+candID+"/verify", bytes.NewReader(verifyPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "analyst")
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	cand, _ := repo.GetCandidate(candID)
	if cand.Status != models.StatusVerified {
		t.Errorf("expected status verified, got %s", cand.Status)
	}
	if cand.RevisionNumber != 2 {
		t.Errorf("expected revision 2, got %d", cand.RevisionNumber)
	}

	// Test optimistic concurrency conflict: Submitting with old revision 1 should fail with 409 Conflict
	conflictPayload := []byte(`{
		"reason": "confirmed_physical_construction",
		"concurrency_version": 1
	}`)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/changes/"+candID+"/verify", bytes.NewReader(conflictPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "analyst")
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409 conflict, got %d", rec.Code)
	}

	// Test Viewer role rejection (403 Forbidden)
	req = httptest.NewRequest(http.MethodPost, "/api/v1/changes/"+candID+"/verify", bytes.NewReader(verifyPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-Role", "viewer")
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 forbidden for viewer, got %d", rec.Code)
	}
}

func TestExportFormats(t *testing.T) {
	srv, _ := setupTestServer()

	// Export GeoJSON
	req := httptest.NewRequest(http.MethodGet, "/api/v1/changes/export?format=geojson", nil)
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("Content-Type") != "application/geo+json" {
		t.Errorf("expected application/geo+json, got %s", rec.Header().Get("Content-Type"))
	}

	// Export CSV
	req = httptest.NewRequest(http.MethodGet, "/api/v1/changes/export?format=csv", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if rec.Header().Get("Content-Type") != "text/csv" {
		t.Errorf("expected text/csv, got %s", rec.Header().Get("Content-Type"))
	}

	// Export Markdown Report
	req = httptest.NewRequest(http.MethodGet, "/api/v1/changes/export?format=report", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestImageryPreviewAndSTAC(t *testing.T) {
	srv, _ := setupTestServer()

	// Test 2016 preview endpoint
	req := httptest.NewRequest(http.MethodGet, "/api/v1/imagery/obs-s2-2016-08-15/preview", nil)
	rec := httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for 2016 preview, got %d", rec.Code)
	}
	if rec.Header().Get("Content-Type") != "image/png" {
		t.Errorf("expected image/png, got %s", rec.Header().Get("Content-Type"))
	}

	// Test 2021 preview endpoint
	req = httptest.NewRequest(http.MethodGet, "/api/v1/imagery/obs-s2-2021-07-10/preview", nil)
	rec = httptest.NewRecorder()
	srv.Router().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for 2021 preview, got %d", rec.Code)
	}
	if rec.Header().Get("Content-Type") != "image/png" {
		t.Errorf("expected image/png, got %s", rec.Header().Get("Content-Type"))
	}
}
