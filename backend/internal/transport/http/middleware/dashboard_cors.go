package httpmiddleware

import (
	"net/http"
	"net/netip"
	"net/url"
	"slices"
	"strings"
)

func DashboardCORS(appEnv string, allowedOrigins []string) func(http.Handler) http.Handler {
	normalizedOrigins := make([]string, 0, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			normalizedOrigins = append(normalizedOrigins, trimmed)
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := strings.TrimSpace(r.Header.Get("Origin"))
			if isAllowedDashboardOrigin(appEnv, normalizedOrigins, origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
				w.Header().Add("Vary", "Origin")
			}

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isAllowedDashboardOrigin(appEnv string, allowedOrigins []string, origin string) bool {
	if origin == "" {
		return false
	}

	if slices.Contains(allowedOrigins, origin) {
		return true
	}

	return strings.EqualFold(appEnv, "development") && isLoopbackOrigin(origin)
}

func isLoopbackOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}

	if parsed.Scheme != "http" {
		return false
	}

	hostname := parsed.Hostname()
	if hostname == "" {
		return false
	}

	if strings.EqualFold(hostname, "localhost") {
		return true
	}

	addr, err := netip.ParseAddr(hostname)
	if err != nil {
		return false
	}

	return addr.IsLoopback()
}
