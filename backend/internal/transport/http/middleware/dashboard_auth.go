package httpmiddleware

import (
	"net/http"
	"strings"

	"payment-platform/backend/internal/app/auth"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

func DashboardAuth(service *auth.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rawToken, ok := bearerToken(r.Header.Get("Authorization"))
			if !ok {
				httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing bearer token.", nil)
				return
			}

			principal, err := service.AuthenticateAccessToken(r.Context(), rawToken)
			if err != nil {
				httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired access token.", nil)
				return
			}

			next.ServeHTTP(w, r.WithContext(WithDashboardPrincipal(r.Context(), principal)))
		})
	}
}

func bearerToken(headerValue string) (string, bool) {
	parts := strings.SplitN(headerValue, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
		return "", false
	}

	return strings.TrimSpace(parts[1]), true
}
