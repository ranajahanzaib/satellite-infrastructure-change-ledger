package export

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"time"

	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/models"
)

type Exporter struct{}

func NewExporter() *Exporter {
	return &Exporter{}
}

func (e *Exporter) ToGeoJSON(candidates []models.ChangeCandidate) ([]byte, error) {
	features := make([]map[string]interface{}, 0, len(candidates))

	for _, c := range candidates {
		feat := map[string]interface{}{
			"type":     "Feature",
			"id":       c.ID,
			"geometry": c.GeometryGeoJSON,
			"properties": map[string]interface{}{
				"candidate_id":     c.ID,
				"area_id":          c.AreaID,
				"category":         c.CandidateCategory,
				"status":           c.Status,
				"score":            c.Score,
				"confidence":       c.ConfidenceBand,
				"area_m2":          c.AreaM2,
				"detection_method": c.DetectionMethod,
				"revision_number":  c.RevisionNumber,
				"centroid":         c.Centroid,
				"bbox":             c.BBox,
				"t1_date":          c.T1Date,
				"t2_date":          c.T2Date,
				"signals":          c.ContributingSignals,
				"created_at":       c.CreatedAt.Format(time.RFC3339),
				"updated_at":       c.UpdatedAt.Format(time.RFC3339),
			},
		}
		features = append(features, feat)
	}

	collection := map[string]interface{}{
		"type":        "FeatureCollection",
		"name":        "SatelliteInfrastructureChanges",
		"generatedAt": time.Now().UTC().Format(time.RFC3339),
		"count":       len(candidates),
		"features":    features,
	}

	return json.MarshalIndent(collection, "", "  ")
}

func (e *Exporter) ToCSV(candidates []models.ChangeCandidate) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	headers := []string{
		"CandidateID",
		"AreaID",
		"Category",
		"Status",
		"Score",
		"Confidence",
		"Area_m2",
		"Centroid_Lon",
		"Centroid_Lat",
		"DetectionMethod",
		"Revision",
		"T1_Date",
		"T2_Date",
		"CreatedAt",
		"UpdatedAt",
	}
	if err := writer.Write(headers); err != nil {
		return nil, err
	}

	for _, c := range candidates {
		lon, lat := 0.0, 0.0
		if len(c.Centroid) >= 2 {
			lon, lat = c.Centroid[0], c.Centroid[1]
		}
		row := []string{
			c.ID,
			c.AreaID,
			c.CandidateCategory,
			string(c.Status),
			fmt.Sprintf("%.3f", c.Score),
			c.ConfidenceBand,
			fmt.Sprintf("%.1f", c.AreaM2),
			fmt.Sprintf("%.6f", lon),
			fmt.Sprintf("%.6f", lat),
			c.DetectionMethod,
			fmt.Sprintf("%d", c.RevisionNumber),
			c.T1Date,
			c.T2Date,
			c.CreatedAt.Format(time.RFC3339),
			c.UpdatedAt.Format(time.RFC3339),
		}
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}

	writer.Flush()
	return buf.Bytes(), writer.Error()
}

func (e *Exporter) ToMarkdownReport(
	area *models.MonitoringArea,
	candidates []models.ChangeCandidate,
	revisions []models.ChangeRevision,
) string {
	now := time.Now().UTC().Format("2006-01-02 15:04:02 UTC")

	var verifiedCount, underReviewCount, rejectedCount, detectedCount int
	for _, c := range candidates {
		switch c.Status {
		case models.StatusVerified:
			verifiedCount++
		case models.StatusUnderReview:
			underReviewCount++
		case models.StatusRejected:
			rejectedCount++
		default:
			detectedCount++
		}
	}

	report := fmt.Sprintf(`# Geospatial Change Ledger Intelligence Report
**Generated:** %s
**Classification:** Operational / Open Geospatial

---

## 1. Monitoring Area Overview
- **Area Name:** %s
- **Area ID:** %s
- **Extent Size:** %.2f km²
- **Centroid:** Lon %.5f, Lat %.5f
- **Status:** %s
- **Description:** %s

---

## 2. Executive Change Summary
- **Total Detected Candidates:** %d
- **Verified Physical Changes:** %d
- **Pending Under Review:** %d
- **Needs Evidence / Rejected:** %d

---

## 3. Detected Infrastructure Observations

| Candidate ID | Category | Status | Confidence | Score | Area (m²) | Primary Linked Entity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`, now, area.Name, area.ID, area.AreaKm2, area.Centroid[0], area.Centroid[1], area.Status, area.Description,
		len(candidates), verifiedCount, underReviewCount, rejectedCount)

	for _, c := range candidates {
		entName := "None"
		if len(c.LinkedEntities) > 0 && c.LinkedEntities[0].Entity != nil {
			entName = c.LinkedEntities[0].Entity.Name
		}
		report += fmt.Sprintf("| `%s` | **%s** | `%s` | %s | %.3f | %.1f | %s |\n",
			c.ID, c.CandidateCategory, c.Status, c.ConfidenceBand, c.Score, c.AreaM2, entName)
	}

	report += `
---

## 4. Methodology and Data Provenance
- **Imagery Sensors:** Copernicus Sentinel-2 Level-2A MSI (10m - 20m resolution).
- **Coregistration & Alignment:** Bilinear spatial resampling with bounding box intersection and CRS normalization.
- **Spectral Feature Analysis:** Differential Normalized Difference Built-Up Index (NDBI) and Normalized Difference Vegetation Index (NDVI).
- **Foundation Model Embeddings:** ` + "`made-with-clay/Clay:v1.5.0`" + ` 768-dimensional patch representations.
- **Semantic Segmentation:** ` + "`ibm-nasa-geospatial/Prithvi-EO-2.0-600M-TL`" + ` land-cover transition modeling.
- **Geospatial Entity Matching:** OpenStreetMap / Wikidata spatial proximity and polygon overlap resolving.

---
*Notice: Automated change candidates represent documented observations and require human analyst verification before official incorporation into sovereign infrastructure registries.*
`
	return report
}
