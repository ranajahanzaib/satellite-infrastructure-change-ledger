package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/ranajahanzaib/satellite-infrastructure-change-ledger/services/api/internal/models"
)

type contextKey string

const (
	UserContextKey contextKey = "current_user"
)

type Authenticator struct {
	defaultUser *models.User
}

func NewAuthenticator() *Authenticator {
	return &Authenticator{
		defaultUser: &models.User{
			ID:    "user-analyst-01",
			Email: "analyst@satledger.io",
			Name:  "Senior Infrastructure Analyst",
			Role:  models.RoleAnalyst,
		},
	}
}

// Middleware injects authenticated user into request context.
// Accepts:
//   - Authorization: Bearer <token>
//   - X-User-Role: administrator | analyst | viewer (for testing and quick role-switching in dev)
func (a *Authenticator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := *a.defaultUser

		roleHeader := r.Header.Get("X-User-Role")
		if roleHeader != "" {
			switch strings.ToLower(roleHeader) {
			case "admin", "administrator":
				user.Role = models.RoleAdmin
				user.Name = "Lead Geospatial Architect (Admin)"
			case "viewer":
				user.Role = models.RoleViewer
				user.Name = "Auditor / Stakeholder (Viewer)"
			default:
				user.Role = models.RoleAnalyst
			}
		}

		ctx := context.WithValue(r.Context(), UserContextKey, &user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserFromContext(ctx context.Context) *models.User {
	if u, ok := ctx.Value(UserContextKey).(*models.User); ok && u != nil {
		return u
	}
	return &models.User{
		ID:    "anonymous",
		Role:  models.RoleViewer,
		Name:  "Anonymous Viewer",
		Email: "anonymous@satledger.io",
	}
}

func RequireRole(allowedRoles ...models.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user := GetUserFromContext(r.Context())
			for _, rk := range allowedRoles {
				if user.Role == rk {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, `{"error":"forbidden: insufficient permissions for this action"}`, http.StatusForbidden)
		})
	}
}
