package transporthttp

import (
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"
)

type dashboardStaticHandler struct {
	distFS     fs.FS
	fileServer http.Handler
}

func NewDashboardStaticHandler(distDir string) http.Handler {
	distFS := os.DirFS(distDir)

	return &dashboardStaticHandler{
		distFS:     distFS,
		fileServer: http.FileServer(http.FS(distFS)),
	}
}

func (h *dashboardStaticHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.NotFound(w, r)
		return
	}

	cleanPath := path.Clean("/" + strings.TrimPrefix(r.URL.Path, "/"))
	assetPath := strings.TrimPrefix(cleanPath, "/")
	if assetPath == "" {
		h.serveIndex(w, r)
		return
	}

	if strings.Contains(path.Base(cleanPath), ".") {
		if _, err := fs.Stat(h.distFS, assetPath); err != nil {
			http.NotFound(w, r)
			return
		}

		h.fileServer.ServeHTTP(w, r)
		return
	}

	h.serveIndex(w, r)
}

func (h *dashboardStaticHandler) serveIndex(w http.ResponseWriter, r *http.Request) {
	if _, err := fs.Stat(h.distFS, "index.html"); err != nil {
		http.NotFound(w, r)
		return
	}

	http.ServeFileFS(w, r, h.distFS, "index.html")
}
