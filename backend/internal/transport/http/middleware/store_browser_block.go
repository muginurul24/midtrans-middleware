package httpmiddleware

import (
	"net/http"
	"strings"

	httpresponse "payment-platform/backend/internal/transport/http/response"
)

func RejectBrowserStoreAPI() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isBrowserOriginRequest(r) {
				httpresponse.Error(
					w,
					r,
					http.StatusForbidden,
					"BROWSER_REQUEST_BLOCKED",
					"Store API token must only be used server-to-server, not from a browser origin.",
					nil,
				)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func isBrowserOriginRequest(r *http.Request) bool {
	if strings.TrimSpace(r.Header.Get("Origin")) != "" {
		return true
	}

	if strings.TrimSpace(r.Header.Get("Sec-Fetch-Site")) != "" {
		return true
	}

	if strings.TrimSpace(r.Header.Get("Sec-Fetch-Mode")) != "" {
		return true
	}

	if strings.TrimSpace(r.Header.Get("Sec-Fetch-Dest")) != "" {
		return true
	}

	return false
}
