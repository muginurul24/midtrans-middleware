package httpmiddleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRejectBrowserStoreAPIBlocksOriginHeader(t *testing.T) {
	handler := RejectBrowserStoreAPI()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/transactions/charge", nil)
	req.Header.Set("Origin", "https://dashboard.example.com")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status code mismatch: got %d", rec.Code)
	}

	if body := rec.Body.String(); body == "" {
		t.Fatal("expected error body for blocked browser request")
	}
}

func TestRejectBrowserStoreAPIBlocksSecFetchHeaders(t *testing.T) {
	handler := RejectBrowserStoreAPI()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/v1/audit-logs", nil)
	req.Header.Set("Sec-Fetch-Site", "same-origin")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status code mismatch: got %d", rec.Code)
	}
}

func TestRejectBrowserStoreAPIAllowsServerToServerRequest(t *testing.T) {
	handler := RejectBrowserStoreAPI()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/v1/transactions/charge", nil)
	req.Header.Set("Authorization", "Bearer sk_live_example")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status code mismatch: got %d", rec.Code)
	}
}
