package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type HealthHandler struct {
	appEnv  string
	timeout time.Duration
	pg      *pgxpool.Pool
	redis   redis.UniversalClient
}

type dependencyStatus struct {
	Status string `json:"status"`
	Error  string `json:"error,omitempty"`
}

func NewHealthHandler(
	appEnv string,
	pg *pgxpool.Pool,
	redisClient redis.UniversalClient,
	timeout time.Duration,
) *HealthHandler {
	return &HealthHandler{
		appEnv:  appEnv,
		timeout: timeout,
		pg:      pg,
		redis:   redisClient,
	}
}

func (h *HealthHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), h.timeout)
	defer cancel()

	postgresStatus := dependencyStatus{Status: "disabled"}
	redisStatus := dependencyStatus{Status: "disabled"}

	overallStatus := "ok"
	statusCode := http.StatusOK

	if h.pg != nil {
		if err := h.pg.Ping(ctx); err != nil {
			postgresStatus = dependencyStatus{
				Status: "down",
				Error:  err.Error(),
			}
			overallStatus = "degraded"
			statusCode = http.StatusServiceUnavailable
		} else {
			postgresStatus = dependencyStatus{Status: "up"}
		}
	}

	if h.redis != nil {
		if err := h.redis.Ping(ctx).Err(); err != nil {
			redisStatus = dependencyStatus{
				Status: "down",
				Error:  err.Error(),
			}
			overallStatus = "degraded"
			statusCode = http.StatusServiceUnavailable
		} else {
			redisStatus = dependencyStatus{Status: "up"}
		}
	}

	httpresponse.JSON(w, statusCode, map[string]any{
		"success": statusCode == http.StatusOK,
		"data": map[string]any{
			"status":  overallStatus,
			"app_env": h.appEnv,
			"services": map[string]dependencyStatus{
				"postgres": postgresStatus,
				"redis":    redisStatus,
			},
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		},
	})
}
