package httpmiddleware

import (
	"net/http"

	httpresponse "payment-platform/backend/internal/transport/http/response"
)

func DashboardAccess() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			principal, ok := DashboardPrincipalFromContext(r.Context())
			if !ok {
				httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
				return
			}

			if principal.MFA.CanAccessDashboard {
				next.ServeHTTP(w, r)
				return
			}

			if principal.MFA.SetupRequired {
				httpresponse.Error(w, r, http.StatusForbidden, "MFA_SETUP_REQUIRED", "MFA setup is required before dashboard access.", nil)
				return
			}

			httpresponse.Error(w, r, http.StatusForbidden, "MFA_VERIFICATION_REQUIRED", "MFA verification is required before dashboard access.", nil)
		})
	}
}
