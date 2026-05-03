package httpmiddleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDashboardCORSAllowsConfiguredOrigin(t *testing.T) {
	handler := DashboardCORS("production", []string{"https://dashboard.example.com"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/dashboard/auth/login", nil)
	req.Header.Set("Origin", "https://dashboard.example.com")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://dashboard.example.com" {
		t.Fatalf("allow origin mismatch: got %q", got)
	}
}

func TestDashboardCORSAllowsLoopbackOriginInDevelopment(t *testing.T) {
	handler := DashboardCORS("development", []string{"http://localhost:5173"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/v1/dashboard/auth/register", nil)
	req.Header.Set("Origin", "http://127.0.0.1:4174")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://127.0.0.1:4174" {
		t.Fatalf("allow origin mismatch: got %q", got)
	}

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status code mismatch: got %d", rec.Code)
	}
}

func TestDashboardCORSRejectsLoopbackOriginOutsideDevelopment(t *testing.T) {
	handler := DashboardCORS("production", []string{"https://dashboard.example.com"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/v1/dashboard/auth/register", nil)
	req.Header.Set("Origin", "http://127.0.0.1:4174")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("expected no allow origin header, got %q", got)
	}

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status code mismatch: got %d", rec.Code)
	}
}
