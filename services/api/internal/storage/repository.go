package storage

import (
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/models"
)

var (
	ErrNotFound       = errors.New("resource not found")
	ErrConflict       = errors.New("resource conflict or optimistic lock failure")
	ErrInvalidRequest = errors.New("invalid request parameters")
)

type CandidateFilter struct {
	AreaID     string
	Status     string
	Category   string
	MinScore   float64
	MinAreaM2  float64
	SearchText string
	Limit      int
	Offset     int
}

type Repository interface {
	// Users
	GetUserByEmail(email string) (*models.User, error)
	GetUser(id string) (*models.User, error)
	CreateUser(u *models.User) error

	// Projects
	ListProjects() ([]models.Project, error)
	GetProject(id string) (*models.Project, error)
	CreateProject(p *models.Project) error
	UpdateProject(p *models.Project) error
	DeleteProject(id string) error

	// Monitoring Areas
	ListAreas(projectID string) ([]models.MonitoringArea, error)
	GetArea(id string) (*models.MonitoringArea, error)
	CreateArea(a *models.MonitoringArea) error
	UpdateArea(a *models.MonitoringArea) error
	DeleteArea(id string) error

	// Observations
	ListObservations(areaID string) ([]models.SatelliteObservation, error)
	GetObservation(id string) (*models.SatelliteObservation, error)
	CreateObservation(o *models.SatelliteObservation) error

	// Processing Jobs
	ListJobs(areaID string) ([]models.ProcessingJob, error)
	GetJob(id string) (*models.ProcessingJob, error)
	CreateJob(j *models.ProcessingJob) error
	UpdateJob(j *models.ProcessingJob) error

	// Candidates & Ledger
	ListCandidates(filter CandidateFilter) ([]models.ChangeCandidate, int, error)
	GetCandidate(id string) (*models.ChangeCandidate, error)
	CreateCandidate(c *models.ChangeCandidate) error
	UpdateCandidate(c *models.ChangeCandidate) error

	// Revisions & Evidence
	ListRevisions(candidateID string) ([]models.ChangeRevision, error)
	CreateRevision(r *models.ChangeRevision) error
	ListEvidence(candidateID string) ([]models.ChangeEvidence, error)
	CreateEvidence(e *models.ChangeEvidence) error

	// Entities & Links
	ListEntities() ([]models.GeographicalEntity, error)
	GetEntity(id string) (*models.GeographicalEntity, error)
	CreateEntity(e *models.GeographicalEntity) error
	ListEntityLinks(candidateID string) ([]models.EntityLink, error)
	CreateEntityLink(l *models.EntityLink) error
	UpdateEntityLinkStatus(linkID string, status string, reviewer string) error

	// Verification
	ApplyVerification(decision *models.VerificationDecision) (*models.ChangeCandidate, error)
	ListVerificationDecisions(candidateID string) ([]models.VerificationDecision, error)

	// Audit
	ListAuditEvents(limit int) ([]models.AuditEvent, error)
	CreateAuditEvent(e *models.AuditEvent) error

	// Seed & Reset
	SeedDemoData() error
}

type MemoryRepository struct {
	mu            sync.RWMutex
	users         map[string]*models.User
	projects      map[string]*models.Project
	areas         map[string]*models.MonitoringArea
	observations  map[string]*models.SatelliteObservation
	jobs          map[string]*models.ProcessingJob
	candidates    map[string]*models.ChangeCandidate
	revisions     map[string][]models.ChangeRevision
	evidence      map[string][]models.ChangeEvidence
	entities      map[string]*models.GeographicalEntity
	entityLinks   map[string]*models.EntityLink
	verifications map[string][]models.VerificationDecision
	auditEvents   []models.AuditEvent
}

func NewMemoryRepository() *MemoryRepository {
	repo := &MemoryRepository{
		users:         make(map[string]*models.User),
		projects:      make(map[string]*models.Project),
		areas:         make(map[string]*models.MonitoringArea),
		observations:  make(map[string]*models.SatelliteObservation),
		jobs:          make(map[string]*models.ProcessingJob),
		candidates:    make(map[string]*models.ChangeCandidate),
		revisions:     make(map[string][]models.ChangeRevision),
		evidence:      make(map[string][]models.ChangeEvidence),
		entities:      make(map[string]*models.GeographicalEntity),
		entityLinks:   make(map[string]*models.EntityLink),
		verifications: make(map[string][]models.VerificationDecision),
		auditEvents:   make([]models.AuditEvent, 0),
	}
	_ = repo.SeedDemoData()
	return repo
}

// User methods
func (r *MemoryRepository) GetUserByEmail(email string) (*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, u := range r.users {
		if strings.EqualFold(u.Email, email) {
			return u, nil
		}
	}
	return nil, ErrNotFound
}

func (r *MemoryRepository) GetUser(id string) (*models.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, exists := r.users[id]
	if !exists {
		return nil, ErrNotFound
	}
	return u, nil
}

func (r *MemoryRepository) CreateUser(u *models.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	r.users[u.ID] = u
	return nil
}

// Project methods
func (r *MemoryRepository) ListProjects() ([]models.Project, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []models.Project
	for _, p := range r.projects {
		list = append(list, *p)
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})
	return list, nil
}

func (r *MemoryRepository) GetProject(id string) (*models.Project, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, exists := r.projects[id]
	if !exists {
		return nil, ErrNotFound
	}
	return p, nil
}

func (r *MemoryRepository) CreateProject(p *models.Project) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	p.CreatedAt = now
	p.UpdatedAt = now
	r.projects[p.ID] = p
	return nil
}

func (r *MemoryRepository) UpdateProject(p *models.Project) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, exists := r.projects[p.ID]
	if !exists {
		return ErrNotFound
	}
	existing.Name = p.Name
	existing.Description = p.Description
	existing.Category = p.Category
	existing.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *MemoryRepository) DeleteProject(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.projects[id]; !exists {
		return ErrNotFound
	}
	delete(r.projects, id)
	return nil
}

// Monitoring Area methods
func (r *MemoryRepository) ListAreas(projectID string) ([]models.MonitoringArea, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []models.MonitoringArea
	for _, a := range r.areas {
		if projectID == "" || a.ProjectID == projectID {
			list = append(list, *a)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})
	return list, nil
}

func (r *MemoryRepository) GetArea(id string) (*models.MonitoringArea, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	a, exists := r.areas[id]
	if !exists {
		return nil, ErrNotFound
	}
	return a, nil
}

func (r *MemoryRepository) CreateArea(a *models.MonitoringArea) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	a.CreatedAt = now
	a.UpdatedAt = now
	if a.Status == "" {
		a.Status = "active"
	}
	r.areas[a.ID] = a
	return nil
}

func (r *MemoryRepository) UpdateArea(a *models.MonitoringArea) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, exists := r.areas[a.ID]
	if !exists {
		return ErrNotFound
	}
	existing.Name = a.Name
	existing.Description = a.Description
	existing.Status = a.Status
	existing.GeometryGeoJSON = a.GeometryGeoJSON
	existing.BBox = a.BBox
	existing.Centroid = a.Centroid
	existing.AreaKm2 = a.AreaKm2
	existing.UpdatedAt = time.Now().UTC()
	return nil
}

func (r *MemoryRepository) DeleteArea(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.areas[id]; !exists {
		return ErrNotFound
	}
	delete(r.areas, id)
	return nil
}

// Observations
func (r *MemoryRepository) ListObservations(areaID string) ([]models.SatelliteObservation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []models.SatelliteObservation
	for _, o := range r.observations {
		if areaID == "" || o.AreaID == areaID {
			list = append(list, *o)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].AcquisitionDate.After(list[j].AcquisitionDate)
	})
	return list, nil
}

func (r *MemoryRepository) GetObservation(id string) (*models.SatelliteObservation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	o, exists := r.observations[id]
	if !exists {
		return nil, ErrNotFound
	}
	return o, nil
}

func (r *MemoryRepository) CreateObservation(o *models.SatelliteObservation) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if o.ID == "" {
		o.ID = uuid.New().String()
	}
	if o.CreatedAt.IsZero() {
		o.CreatedAt = time.Now().UTC()
	}
	r.observations[o.ID] = o
	return nil
}

// Processing Jobs
func (r *MemoryRepository) ListJobs(areaID string) ([]models.ProcessingJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []models.ProcessingJob
	for _, j := range r.jobs {
		if areaID == "" || j.AreaID == areaID {
			list = append(list, *j)
		}
	}
	sort.Slice(list, func(i, j int) bool {
		return list[i].CreatedAt.After(list[j].CreatedAt)
	})
	return list, nil
}

func (r *MemoryRepository) GetJob(id string) (*models.ProcessingJob, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	j, exists := r.jobs[id]
	if !exists {
		return nil, ErrNotFound
	}
	return j, nil
}

func (r *MemoryRepository) CreateJob(j *models.ProcessingJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if j.ID == "" {
		j.ID = uuid.New().String()
	}
	if j.CreatedAt.IsZero() {
		j.CreatedAt = time.Now().UTC()
	}
	r.jobs[j.ID] = j
	return nil
}

func (r *MemoryRepository) UpdateJob(j *models.ProcessingJob) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, exists := r.jobs[j.ID]
	if !exists {
		return ErrNotFound
	}
	existing.Status = j.Status
	existing.Progress = j.Progress
	existing.StageMessage = j.StageMessage
	existing.OutputArtifacts = j.OutputArtifacts
	existing.ErrorMessage = j.ErrorMessage
	existing.RetryCount = j.RetryCount
	existing.StartedAt = j.StartedAt
	existing.CompletedAt = j.CompletedAt
	return nil
}

// Candidates & Ledger
func (r *MemoryRepository) ListCandidates(filter CandidateFilter) ([]models.ChangeCandidate, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var filtered []models.ChangeCandidate
	for _, c := range r.candidates {
		if filter.AreaID != "" && c.AreaID != filter.AreaID {
			continue
		}
		if filter.Status != "" && string(c.Status) != filter.Status {
			continue
		}
		if filter.Category != "" && c.CandidateCategory != filter.Category {
			continue
		}
		if filter.MinScore > 0 && c.Score < filter.MinScore {
			continue
		}
		if filter.MinAreaM2 > 0 && c.AreaM2 < filter.MinAreaM2 {
			continue
		}
		if filter.SearchText != "" {
			txt := strings.ToLower(filter.SearchText)
			cat := strings.ToLower(c.CandidateCategory)
			meth := strings.ToLower(c.DetectionMethod)
			if !strings.Contains(cat, txt) && !strings.Contains(meth, txt) && !strings.Contains(c.ID, txt) {
				continue
			}
		}

		item := *c
		item.Evidence = r.evidence[c.ID]
		// Populate linked entities
		var links []models.EntityLink
		for _, l := range r.entityLinks {
			if l.CandidateID == c.ID {
				linkCopy := *l
				if ent, exists := r.entities[l.EntityID]; exists {
					linkCopy.Entity = ent
				}
				links = append(links, linkCopy)
			}
		}
		item.LinkedEntities = links
		filtered = append(filtered, item)
	}

	total := len(filtered)
	// Sort by score descending
	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].Score > filtered[j].Score
	})

	// Pagination
	start := filter.Offset
	if start > total {
		return []models.ChangeCandidate{}, total, nil
	}
	end := total
	if filter.Limit > 0 && start+filter.Limit < end {
		end = start + filter.Limit
	}

	return filtered[start:end], total, nil
}

func (r *MemoryRepository) GetCandidate(id string) (*models.ChangeCandidate, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, exists := r.candidates[id]
	if !exists {
		return nil, ErrNotFound
	}
	res := *c
	res.Evidence = r.evidence[id]
	var links []models.EntityLink
	for _, l := range r.entityLinks {
		if l.CandidateID == id {
			linkCopy := *l
			if ent, exists := r.entities[l.EntityID]; exists {
				linkCopy.Entity = ent
			}
			links = append(links, linkCopy)
		}
	}
	res.LinkedEntities = links
	return &res, nil
}

func (r *MemoryRepository) CreateCandidate(c *models.ChangeCandidate) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	c.CreatedAt = now
	c.UpdatedAt = now
	if c.RevisionNumber == 0 {
		c.RevisionNumber = 1
	}
	if c.Status == "" {
		c.Status = models.StatusDetected
	}
	r.candidates[c.ID] = c
	return nil
}

func (r *MemoryRepository) UpdateCandidate(c *models.ChangeCandidate) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	existing, exists := r.candidates[c.ID]
	if !exists {
		return ErrNotFound
	}
	existing.CandidateCategory = c.CandidateCategory
	existing.Status = c.Status
	existing.Score = c.Score
	existing.RevisionNumber = c.RevisionNumber
	existing.UpdatedAt = time.Now().UTC()
	return nil
}

// Revisions & Evidence
func (r *MemoryRepository) ListRevisions(candidateID string) ([]models.ChangeRevision, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	revs := r.revisions[candidateID]
	res := make([]models.ChangeRevision, len(revs))
	copy(res, revs)
	sort.Slice(res, func(i, j int) bool {
		return res[i].RevisionNumber > res[j].RevisionNumber
	})
	return res, nil
}

func (r *MemoryRepository) CreateRevision(rev *models.ChangeRevision) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if rev.ID == "" {
		rev.ID = uuid.New().String()
	}
	if rev.CreatedAt.IsZero() {
		rev.CreatedAt = time.Now().UTC()
	}
	r.revisions[rev.CandidateID] = append(r.revisions[rev.CandidateID], *rev)
	return nil
}

func (r *MemoryRepository) ListEvidence(candidateID string) ([]models.ChangeEvidence, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	ev := r.evidence[candidateID]
	res := make([]models.ChangeEvidence, len(ev))
	copy(res, ev)
	return res, nil
}

func (r *MemoryRepository) CreateEvidence(e *models.ChangeEvidence) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now().UTC()
	}
	r.evidence[e.CandidateID] = append(r.evidence[e.CandidateID], *e)
	return nil
}

// Entities & Links
func (r *MemoryRepository) ListEntities() ([]models.GeographicalEntity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []models.GeographicalEntity
	for _, e := range r.entities {
		list = append(list, *e)
	}
	return list, nil
}

func (r *MemoryRepository) GetEntity(id string) (*models.GeographicalEntity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	e, exists := r.entities[id]
	if !exists {
		return nil, ErrNotFound
	}
	return e, nil
}

func (r *MemoryRepository) CreateEntity(e *models.GeographicalEntity) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now().UTC()
	}
	r.entities[e.ID] = e
	return nil
}

func (r *MemoryRepository) ListEntityLinks(candidateID string) ([]models.EntityLink, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	var list []models.EntityLink
	for _, l := range r.entityLinks {
		if candidateID == "" || l.CandidateID == candidateID {
			linkCopy := *l
			if ent, exists := r.entities[l.EntityID]; exists {
				linkCopy.Entity = ent
			}
			list = append(list, linkCopy)
		}
	}
	return list, nil
}

func (r *MemoryRepository) CreateEntityLink(l *models.EntityLink) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	if l.CreatedAt.IsZero() {
		l.CreatedAt = time.Now().UTC()
	}
	r.entityLinks[l.ID] = l
	return nil
}

func (r *MemoryRepository) UpdateEntityLinkStatus(linkID string, status string, reviewer string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	l, exists := r.entityLinks[linkID]
	if !exists {
		return ErrNotFound
	}
	l.Status = status
	l.ReviewedBy = reviewer
	now := time.Now().UTC()
	l.ReviewedAt = &now
	return nil
}

// Verification Workflows with Optimistic Concurrency Control
func (r *MemoryRepository) ApplyVerification(decision *models.VerificationDecision) (*models.ChangeCandidate, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	cand, exists := r.candidates[decision.CandidateID]
	if !exists {
		return nil, ErrNotFound
	}

	// Optimistic concurrency check
	if decision.ConcurrencyVer > 0 && cand.RevisionNumber != decision.ConcurrencyVer {
		return nil, fmt.Errorf("%w: candidate was updated by another analyst (current revision %d, requested %d)",
			ErrConflict, cand.RevisionNumber, decision.ConcurrencyVer)
	}

	decision.PreviousStatus = cand.Status

	var targetStatus models.VerificationStatus
	switch decision.Decision {
	case "verify":
		targetStatus = models.StatusVerified
	case "reject":
		targetStatus = models.StatusRejected
	case "request_evidence":
		targetStatus = models.StatusNeedsMoreEvidence
	default:
		return nil, fmt.Errorf("%w: unknown decision '%s'", ErrInvalidRequest, decision.Decision)
	}

	decision.NewStatus = targetStatus
	decision.CreatedAt = time.Now().UTC()
	if decision.ID == "" {
		decision.ID = uuid.New().String()
	}

	// Increment revision
	cand.RevisionNumber++
	cand.Status = targetStatus
	if decision.CorrectedCategory != "" {
		cand.CandidateCategory = decision.CorrectedCategory
	}
	cand.UpdatedAt = time.Now().UTC()

	// Append revision record
	rev := models.ChangeRevision{
		ID:                uuid.New().String(),
		CandidateID:       cand.ID,
		RevisionNumber:    cand.RevisionNumber,
		PreviousStatus:    decision.PreviousStatus,
		NewStatus:         decision.NewStatus,
		Reason:            decision.Reason,
		CorrectedCategory: decision.CorrectedCategory,
		Notes:             decision.Notes,
		AnalystID:         decision.AnalystID,
		AnalystName:       decision.AnalystName,
		CreatedAt:         time.Now().UTC(),
	}
	r.revisions[cand.ID] = append(r.revisions[cand.ID], rev)

	// Save verification decision
	r.verifications[cand.ID] = append(r.verifications[cand.ID], *decision)

	// Audit event
	audit := models.AuditEvent{
		ID:         uuid.New().String(),
		UserID:     decision.AnalystID,
		UserName:   decision.AnalystName,
		Action:     fmt.Sprintf("verification_%s", decision.Decision),
		EntityType: "change_candidate",
		EntityID:   cand.ID,
		Details: map[string]interface{}{
			"previous_status": decision.PreviousStatus,
			"new_status":      decision.NewStatus,
			"reason":          decision.Reason,
			"revision":        cand.RevisionNumber,
			"notes":           decision.Notes,
		},
		IPAddress: "127.0.0.1",
		CreatedAt: time.Now().UTC(),
	}
	r.auditEvents = append(r.auditEvents, audit)

	res := *cand
	return &res, nil
}

func (r *MemoryRepository) ListVerificationDecisions(candidateID string) ([]models.VerificationDecision, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	decisions := r.verifications[candidateID]
	res := make([]models.VerificationDecision, len(decisions))
	copy(res, decisions)
	return res, nil
}

// Audit
func (r *MemoryRepository) ListAuditEvents(limit int) ([]models.AuditEvent, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	total := len(r.auditEvents)
	if total == 0 {
		return []models.AuditEvent{}, nil
	}
	count := total
	if limit > 0 && limit < count {
		count = limit
	}
	res := make([]models.AuditEvent, count)
	// Return in reverse chronological order
	for i := 0; i < count; i++ {
		res[i] = r.auditEvents[total-1-i]
	}
	return res, nil
}

func (r *MemoryRepository) CreateAuditEvent(e *models.AuditEvent) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now().UTC()
	}
	r.auditEvents = append(r.auditEvents, *e)
	return nil
}
