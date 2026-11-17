package storage

import (
	"time"

	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/models"
)

func (r *MemoryRepository) SeedDemoData() error {
	now := time.Now().UTC()

	// 1. Users
	adminUser := &models.User{
		ID:        "user-admin-01",
		Email:     "admin@satledger.io",
		Name:      "Lead Geospatial Architect",
		Role:      models.RoleAdmin,
		CreatedAt: now.Add(-60 * 24 * time.Hour),
	}
	analystUser := &models.User{
		ID:        "user-analyst-01",
		Email:     "analyst@satledger.io",
		Name:      "Senior Infrastructure Analyst",
		Role:      models.RoleAnalyst,
		CreatedAt: now.Add(-45 * 24 * time.Hour),
	}
	viewerUser := &models.User{
		ID:        "user-viewer-01",
		Email:     "viewer@satledger.io",
		Name:      "Auditor / Stakeholder",
		Role:      models.RoleViewer,
		CreatedAt: now.Add(-30 * 24 * time.Hour),
	}
	r.users[adminUser.ID] = adminUser
	r.users[analystUser.ID] = analystUser
	r.users[viewerUser.ID] = viewerUser

	// 2. Project
	proj := &models.Project{
		ID:          "proj-bay-industrial-01",
		Name:        "Industrial & Logistics Corridor Monitoring",
		Description: "Multi-temporal automated satellite surveillance tracking industrial estate expansion and logistics hubs.",
		Category:    "industrial_expansion",
		CreatedBy:   adminUser.ID,
		CreatedAt:   now.Add(-40 * 24 * time.Hour),
		UpdatedAt:   now.Add(-2 * 24 * time.Hour),
	}
	r.projects[proj.ID] = proj

	// 3. Monitoring Area
	areaGeom := map[string]interface{}{
		"type": "Polygon",
		"coordinates": [][]interface{}{
			{
				[]interface{}{-122.445, 37.765},
				[]interface{}{-122.415, 37.765},
				[]interface{}{-122.415, 37.785},
				[]interface{}{-122.445, 37.785},
				[]interface{}{-122.445, 37.765},
			},
		},
	}
	area := &models.MonitoringArea{
		ID:              "area-apex-park-01",
		ProjectID:       proj.ID,
		Name:            "Apex Industrial Logistics Park",
		Description:     "High-density industrial park transition surveillance from greenfield/agricultural land to distribution center hub.",
		GeometryGeoJSON: areaGeom,
		BBox:            []float64{-122.445, 37.765, -122.415, 37.785},
		Centroid:        []float64{-122.430, 37.775},
		AreaKm2:         4.82,
		Status:          "active",
		CreatedAt:       now.Add(-35 * 24 * time.Hour),
		UpdatedAt:       now.Add(-1 * time.Hour),
	}
	r.areas[area.ID] = area

	// 4. Satellite Observations
	bands := []models.BandMetadata{
		{Name: "B02", Description: "Blue", GSDMeters: 10, Wavelength: 490},
		{Name: "B03", Description: "Green", GSDMeters: 10, Wavelength: 560},
		{Name: "B04", Description: "Red", GSDMeters: 10, Wavelength: 665},
		{Name: "B08", Description: "NIR", GSDMeters: 10, Wavelength: 842},
		{Name: "B11", Description: "SWIR-1", GSDMeters: 20, Wavelength: 1610},
	}

	date2016, _ := time.Parse(time.RFC3339, "2016-08-15T18:49:22Z")
	obs2016 := &models.SatelliteObservation{
		ID:               "obs-s2-2016-08-15",
		AreaID:           area.ID,
		SourceID:         "copernicus-s2-l2a",
		STACItemID:       "S2A_MSIL2A_20160815T184922_N0204_R113_T10SEG",
		Collection:       "sentinel-2-l2a",
		Platform:         "Sentinel-2A",
		Sensor:           "MSI",
		AcquisitionDate:  date2016,
		CloudCoverPct:    1.8,
		GSDMeters:        10.0,
		CRS:              "EPSG:4326",
		BBox:             area.BBox,
		FootprintGeoJSON: areaGeom,
		StoragePath:      "data/samples/sentinel2_2016_baseline.tif",
		PreviewURL:       "/api/v1/imagery/obs-s2-2016-08-15/preview",
		Bands:            bands,
		IngestionStatus:  "ingested",
		Checksum:         "sha256-a78b409c918231",
		Metadata: map[string]interface{}{
			"solar_elevation": 61.4,
			"sun_azimuth":     134.2,
			"quality":         "nominal",
		},
		CreatedAt: date2016,
	}

	date2021, _ := time.Parse(time.RFC3339, "2021-07-10T18:49:19Z")
	obs2021 := &models.SatelliteObservation{
		ID:               "obs-s2-2021-07-10",
		AreaID:           area.ID,
		SourceID:         "copernicus-s2-l2a",
		STACItemID:       "S2A_MSIL2A_20210710T184919_N0300_R113_T10SEG",
		Collection:       "sentinel-2-l2a",
		Platform:         "Sentinel-2A",
		Sensor:           "MSI",
		AcquisitionDate:  date2021,
		CloudCoverPct:    0.6,
		GSDMeters:        10.0,
		CRS:              "EPSG:4326",
		BBox:             area.BBox,
		FootprintGeoJSON: areaGeom,
		StoragePath:      "data/samples/sentinel2_2021_expansion.tif",
		PreviewURL:       "/api/v1/imagery/obs-s2-2021-07-10/preview",
		Bands:            bands,
		IngestionStatus:  "ingested",
		Checksum:         "sha256-e9102c48197aa4",
		Metadata: map[string]interface{}{
			"solar_elevation": 63.8,
			"sun_azimuth":     131.9,
			"quality":         "nominal",
		},
		CreatedAt: date2021,
	}

	r.observations[obs2016.ID] = obs2016
	r.observations[obs2021.ID] = obs2021

	// 5. Geographical Entities (OSM & Wikidata)
	ent1 := &models.GeographicalEntity{
		ID:         "osm-way-98432101",
		Source:     "linked_osm_wikidata",
		ExternalID: "way/98432101",
		Name:       "Apex Logistics & Industrial Park",
		EntityType: "industrial_park",
		WikidataID: "Q115893240",
		OSMID:      "98432101",
		GeometryGeoJSON: map[string]interface{}{
			"type": "Polygon",
			"coordinates": [][]interface{}{
				{
					[]interface{}{-122.440, 37.768},
					[]interface{}{-122.418, 37.768},
					[]interface{}{-122.418, 37.782},
					[]interface{}{-122.440, 37.782},
					[]interface{}{-122.440, 37.768},
				},
			},
		},
		BBox:     []float64{-122.440, 37.768, -122.418, 37.782},
		Centroid: []float64{-122.429, 37.775},
		Tags: map[string]string{
			"landuse":    "industrial",
			"industrial": "logistics",
			"operator":   "Apex Infrastructure Holdings",
		},
		CreatedAt: now.Add(-30 * 24 * time.Hour),
	}

	ent2 := &models.GeographicalEntity{
		ID:         "osm-way-98432102",
		Source:     "openstreetmap",
		ExternalID: "way/98432102",
		Name:       "Consolidated Freight Terminal 4",
		EntityType: "warehouse",
		WikidataID: "Q115893241",
		OSMID:      "98432102",
		GeometryGeoJSON: map[string]interface{}{
			"type": "Polygon",
			"coordinates": [][]interface{}{
				{
					[]interface{}{-122.434, 37.771},
					[]interface{}{-122.426, 37.771},
					[]interface{}{-122.426, 37.777},
					[]interface{}{-122.434, 37.777},
					[]interface{}{-122.434, 37.771},
				},
			},
		},
		BBox:     []float64{-122.434, 37.771, -122.426, 37.777},
		Centroid: []float64{-122.430, 37.774},
		Tags: map[string]string{
			"building":  "warehouse",
			"logistics": "freight_terminal",
		},
		CreatedAt: now.Add(-30 * 24 * time.Hour),
	}

	r.entities[ent1.ID] = ent1
	r.entities[ent2.ID] = ent2

	// 6. Change Candidates
	cand1 := &models.ChangeCandidate{
		ID:              "cand-apex-wh-a",
		AreaID:          area.ID,
		T1ObservationID: obs2016.ID,
		T2ObservationID: obs2021.ID,
		T1Date:          "2016-08-15",
		T2Date:          "2021-07-10",
		GeometryGeoJSON: map[string]interface{}{
			"type": "Polygon",
			"coordinates": [][]interface{}{
				{
					[]interface{}{-122.431, 37.777},
					[]interface{}{-122.423, 37.777},
					[]interface{}{-122.423, 37.781},
					[]interface{}{-122.431, 37.781},
					[]interface{}{-122.431, 37.777},
				},
			},
		},
		BBox:              []float64{-122.431, 37.777, -122.423, 37.781},
		Centroid:          []float64{-122.427, 37.779},
		AreaM2:            31500.0,
		CandidateCategory: "new_construction",
		Score:             0.942,
		ConfidenceBand:    "high",
		DetectionMethod:   "multi_stage_ensemble_v1",
		ModelVersions: map[string]interface{}{
			"clay":    "made-with-clay/Clay:v1.5.0",
			"prithvi": "ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL",
		},
		ContributingSignals: map[string]float64{
			"spectral_magnitude":  0.892,
			"embedding_distance":  0.945,
			"ndbi_built_signal":   0.961,
			"spatial_compactness": 0.920,
			"quality_index":       0.980,
		},
		Status:         models.StatusVerified,
		RevisionNumber: 2,
		CreatedAt:      now.Add(-10 * 24 * time.Hour),
		UpdatedAt:      now.Add(-2 * 24 * time.Hour),
	}

	cand2 := &models.ChangeCandidate{
		ID:              "cand-apex-wh-b",
		AreaID:          area.ID,
		T1ObservationID: obs2016.ID,
		T2ObservationID: obs2021.ID,
		T1Date:          "2016-08-15",
		T2Date:          "2021-07-10",
		GeometryGeoJSON: map[string]interface{}{
			"type": "Polygon",
			"coordinates": [][]interface{}{
				{
					[]interface{}{-122.430, 37.772},
					[]interface{}{-122.424, 37.772},
					[]interface{}{-122.424, 37.776},
					[]interface{}{-122.430, 37.776},
					[]interface{}{-122.430, 37.772},
				},
			},
		},
		BBox:              []float64{-122.430, 37.772, -122.424, 37.776},
		Centroid:          []float64{-122.427, 37.774},
		AreaM2:            22000.0,
		CandidateCategory: "new_construction",
		Score:             0.885,
		ConfidenceBand:    "high",
		DetectionMethod:   "multi_stage_ensemble_v1",
		ModelVersions: map[string]interface{}{
			"clay": "made-with-clay/Clay:v1.5.0",
		},
		ContributingSignals: map[string]float64{
			"spectral_magnitude":  0.840,
			"embedding_distance":  0.890,
			"ndbi_built_signal":   0.910,
			"spatial_compactness": 0.880,
			"quality_index":       0.980,
		},
		Status:         models.StatusUnderReview,
		RevisionNumber: 1,
		CreatedAt:      now.Add(-10 * 24 * time.Hour),
		UpdatedAt:      now.Add(-10 * 24 * time.Hour),
	}

	cand3 := &models.ChangeCandidate{
		ID:              "cand-apex-road-spine",
		AreaID:          area.ID,
		T1ObservationID: obs2016.ID,
		T2ObservationID: obs2021.ID,
		T1Date:          "2016-08-15",
		T2Date:          "2021-07-10",
		GeometryGeoJSON: map[string]interface{}{
			"type": "Polygon",
			"coordinates": [][]interface{}{
				{
					[]interface{}{-122.433, 37.767},
					[]interface{}{-122.431, 37.767},
					[]interface{}{-122.431, 37.783},
					[]interface{}{-122.433, 37.783},
					[]interface{}{-122.433, 37.767},
				},
			},
		},
		BBox:              []float64{-122.433, 37.767, -122.431, 37.783},
		Centroid:          []float64{-122.432, 37.775},
		AreaM2:            16800.0,
		CandidateCategory: "road_development",
		Score:             0.841,
		ConfidenceBand:    "high",
		DetectionMethod:   "multi_stage_ensemble_v1",
		ModelVersions: map[string]interface{}{
			"prithvi": "ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL",
		},
		ContributingSignals: map[string]float64{
			"spectral_magnitude":  0.780,
			"embedding_distance":  0.820,
			"ndbi_built_signal":   0.860,
			"spatial_compactness": 0.650,
			"quality_index":       0.980,
		},
		Status:         models.StatusVerified,
		RevisionNumber: 2,
		CreatedAt:      now.Add(-10 * 24 * time.Hour),
		UpdatedAt:      now.Add(-3 * 24 * time.Hour),
	}

	cand4 := &models.ChangeCandidate{
		ID:              "cand-apex-clearing-east",
		AreaID:          area.ID,
		T1ObservationID: obs2016.ID,
		T2ObservationID: obs2021.ID,
		T1Date:          "2016-08-15",
		T2Date:          "2021-07-10",
		GeometryGeoJSON: map[string]interface{}{
			"type": "Polygon",
			"coordinates": [][]interface{}{
				{
					[]interface{}{-122.423, 37.770},
					[]interface{}{-122.417, 37.770},
					[]interface{}{-122.417, 37.778},
					[]interface{}{-122.423, 37.778},
					[]interface{}{-122.423, 37.770},
				},
			},
		},
		BBox:              []float64{-122.423, 37.770, -122.417, 37.778},
		Centroid:          []float64{-122.420, 37.774},
		AreaM2:            42000.0,
		CandidateCategory: "land_clearing",
		Score:             0.718,
		ConfidenceBand:    "medium",
		DetectionMethod:   "multi_stage_ensemble_v1",
		ModelVersions:     map[string]interface{}{},
		ContributingSignals: map[string]float64{
			"spectral_magnitude":  0.720,
			"embedding_distance":  0.700,
			"ndbi_built_signal":   0.640,
			"spatial_compactness": 0.780,
			"quality_index":       0.980,
		},
		Status:         models.StatusNeedsMoreEvidence,
		RevisionNumber: 1,
		CreatedAt:      now.Add(-10 * 24 * time.Hour),
		UpdatedAt:      now.Add(-10 * 24 * time.Hour),
	}

	r.candidates[cand1.ID] = cand1
	r.candidates[cand2.ID] = cand2
	r.candidates[cand3.ID] = cand3
	r.candidates[cand4.ID] = cand4

	// 7. Evidence
	r.evidence[cand1.ID] = []models.ChangeEvidence{
		{
			ID:           "ev-01",
			CandidateID:  cand1.ID,
			EvidenceType: "source_t1_raster",
			ReferenceURL: obs2016.StoragePath,
			Description:  "2016 Sentinel-2 baseline showing open agricultural fields",
			CreatedAt:    now.Add(-10 * 24 * time.Hour),
		},
		{
			ID:           "ev-02",
			CandidateID:  cand1.ID,
			EvidenceType: "source_t2_raster",
			ReferenceURL: obs2021.StoragePath,
			Description:  "2021 Sentinel-2 observation showing fully erected logistics warehouse building",
			CreatedAt:    now.Add(-10 * 24 * time.Hour),
		},
		{
			ID:           "ev-03",
			CandidateID:  cand1.ID,
			EvidenceType: "embedding_similarity",
			ReferenceURL: "models://made-with-clay/Clay/emb_dist_map",
			Description:  "Clay foundation model cosine distance 0.945 confirms physical structure displacement",
			CreatedAt:    now.Add(-10 * 24 * time.Hour),
		},
	}

	// 8. Revisions
	r.revisions[cand1.ID] = []models.ChangeRevision{
		{
			ID:             "rev-01",
			CandidateID:    cand1.ID,
			RevisionNumber: 1,
			PreviousStatus: models.StatusDetected,
			NewStatus:      models.StatusDetected,
			Reason:         "Automated detection from multi-temporal ensemble",
			Notes:          "Initial candidate extracted with score 0.942",
			AnalystID:      "system",
			AnalystName:    "Automated Pipeline",
			CreatedAt:      now.Add(-10 * 24 * time.Hour),
		},
		{
			ID:             "rev-02",
			CandidateID:    cand1.ID,
			RevisionNumber: 2,
			PreviousStatus: models.StatusDetected,
			NewStatus:      models.StatusVerified,
			Reason:         "confirmed_construction",
			Notes:          "Confirmed 70x45m logistics facility with loading bays. Matches OSM industrial park zoning.",
			AnalystID:      analystUser.ID,
			AnalystName:    analystUser.Name,
			CreatedAt:      now.Add(-2 * 24 * time.Hour),
		},
	}

	// 9. Entity Links
	link1 := &models.EntityLink{
		ID:             "link-01",
		CandidateID:    cand1.ID,
		EntityID:       ent1.ID,
		Entity:         ent1,
		MatchType:      "polygon_overlap",
		MatchScore:     0.92,
		DistanceMeters: 45.0,
		Status:         "confirmed",
		Notes:          "Co-located within Apex Logistics Park boundary",
		ReviewedBy:     analystUser.Name,
		CreatedAt:      now.Add(-5 * 24 * time.Hour),
	}
	r.entityLinks[link1.ID] = link1

	// 10. Completed Processing Job
	jobStarted := now.Add(-1 * time.Hour)
	jobCompleted := now.Add(-58 * time.Minute)
	job1 := &models.ProcessingJob{
		ID:           "job-demo-pipeline-01",
		AreaID:       area.ID,
		JobType:      "change_detection",
		Status:       models.JobCompleted,
		Progress:     100,
		StageMessage: "6-stage change detection and entity resolution completed successfully",
		InputParams: map[string]interface{}{
			"t1_observation": obs2016.ID,
			"t2_observation": obs2021.ID,
			"ensemble":       true,
		},
		OutputArtifacts: map[string]interface{}{
			"candidates_extracted": 4,
			"high_confidence":      3,
			"diff_raster":          "data/fixtures/artifacts/diff_area-apex-park-01_2016_2021.png",
		},
		StartedAt:   &jobStarted,
		CompletedAt: &jobCompleted,
		CreatedAt:   jobStarted,
	}
	r.jobs[job1.ID] = job1

	// 11. Audit Events
	r.auditEvents = append(r.auditEvents,
		models.AuditEvent{
			ID:         "audit-01",
			UserID:     adminUser.ID,
			UserName:   adminUser.Name,
			Action:     "create_monitoring_area",
			EntityType: "monitoring_area",
			EntityID:   area.ID,
			Details:    map[string]interface{}{"name": area.Name, "area_km2": area.AreaKm2},
			IPAddress:  "127.0.0.1",
			CreatedAt:  now.Add(-35 * 24 * time.Hour),
		},
		models.AuditEvent{
			ID:         "audit-02",
			UserID:     "system",
			UserName:   "Ingestion Engine",
			Action:     "ingest_observation",
			EntityType: "satellite_observation",
			EntityID:   obs2021.ID,
			Details:    map[string]interface{}{"platform": "Sentinel-2A", "date": "2021-07-10"},
			IPAddress:  "127.0.0.1",
			CreatedAt:  now.Add(-12 * 24 * time.Hour),
		},
		models.AuditEvent{
			ID:         "audit-03",
			UserID:     analystUser.ID,
			UserName:   analystUser.Name,
			Action:     "verification_verify",
			EntityType: "change_candidate",
			EntityID:   cand1.ID,
			Details:    map[string]interface{}{"decision": "verify", "reason": "confirmed_construction"},
			IPAddress:  "127.0.0.1",
			CreatedAt:  now.Add(-2 * 24 * time.Hour),
		},
	)

	return nil
}
