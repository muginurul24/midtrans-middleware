package transporthttp

import (
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDashboardStaticHandlerServesIndexAndAssets(t *testing.T) {
	distDir := t.TempDir()
	writeDashboardFile(t, distDir, "index.html", "<html><body>dashboard</body></html>")
	writeDashboardFile(t, distDir, "assets/app.js", "console.log('ok')")

	handler := NewDashboardStaticHandler(distDir)

	t.Run("root serves index", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/", nil)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
		}

		if body := recorder.Body.String(); !strings.Contains(body, "dashboard") {
			t.Fatalf("body = %q, want dashboard html", body)
		}
	})

	t.Run("client route serves index", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/app/stores", nil)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
		}

		if body := recorder.Body.String(); !strings.Contains(body, "dashboard") {
			t.Fatalf("body = %q, want dashboard html", body)
		}
	})

	t.Run("asset serves file", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
		}

		if body := recorder.Body.String(); !strings.Contains(body, "console.log('ok')") {
			t.Fatalf("body = %q, want asset body", body)
		}
	})

	t.Run("missing asset returns not found", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/assets/missing.js", nil)
		recorder := httptest.NewRecorder()

		handler.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusNotFound {
			t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNotFound)
		}
	})
}

func TestRouterDashboardFallbackKeepsAPIPathsReserved(t *testing.T) {
	distDir := t.TempDir()
	writeDashboardFile(t, distDir, "index.html", "<html><body>dashboard</body></html>")

	router := NewRouter(Dependencies{
		DashboardStaticHandler: NewDashboardStaticHandler(distDir),
	})

	request := httptest.NewRequest(http.MethodGet, "/v1/not-found", nil)
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNotFound)
	}

	body, err := io.ReadAll(recorder.Result().Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}

	if strings.Contains(string(body), "dashboard") {
		t.Fatalf("body = %q, expected api 404 instead of dashboard fallback", string(body))
	}
}

func writeDashboardFile(t *testing.T, distDir string, relativePath string, content string) {
	t.Helper()

	fullPath := filepath.Join(distDir, relativePath)
	if err := os.MkdirAll(filepath.Dir(fullPath), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", filepath.Dir(fullPath), err)
	}

	if err := os.WriteFile(fullPath, []byte(content), 0o644); err != nil {
		t.Fatalf("write %s: %v", fullPath, err)
	}
}
