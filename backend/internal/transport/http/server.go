package transporthttp

import (
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"payment-platform/backend/internal/app/auth"
	"payment-platform/backend/internal/app/store"
	apitoken "payment-platform/backend/internal/app/token"
	"payment-platform/backend/internal/app/transaction"
	"payment-platform/backend/internal/app/webhook"
	"payment-platform/backend/internal/app/webhookdelivery"
	platformmetrics "payment-platform/backend/internal/platform/metrics"
	"payment-platform/backend/internal/transport/http/handler"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type Dependencies struct {
	AppEnv                  string
	Logger                  zerolog.Logger
	Metrics                 *platformmetrics.Metrics
	MetricsHandler          http.Handler
	DashboardStaticHandler  http.Handler
	Postgres                *pgxpool.Pool
	Redis                   redis.UniversalClient
	DashboardAllowedOrigins []string
	HealthcheckTimeout      time.Duration
	AuthService             *auth.Service
	StoreService            *store.Service
	TokenService            *apitoken.Service
	TransactionService      *transaction.Service
	WebhookService          *webhook.Service
	WebhookDeliveryService  *webhookdelivery.Service
}

func NewRouter(deps Dependencies) http.Handler {
	router := chi.NewRouter()

	router.Use(chimiddleware.RequestID)
	router.Use(chimiddleware.RealIP)
	router.Use(chimiddleware.Recoverer)
	router.Use(httpmiddleware.RequestLogger(deps.Logger))

	healthHandler := handler.NewHealthHandler(
		deps.AppEnv,
		deps.Postgres,
		deps.Redis,
		deps.HealthcheckTimeout,
	)
	dashboardAuthHandler := handler.NewDashboardAuthHandler(deps.AuthService)
	storeHandler := handler.NewStoreHandler(deps.StoreService)
	storeTokenHandler := handler.NewStoreTokenHandler(deps.TokenService)
	storeAPIHandler := handler.NewStoreAPIHandler(deps.TransactionService)
	dashboardTransactionHandler := handler.NewDashboardTransactionHandler(deps.TransactionService)
	midtransWebhookHandler := handler.NewMidtransWebhookHandler(deps.WebhookService)
	webhookDeliveryHandler := handler.NewWebhookDeliveryHandler(deps.WebhookDeliveryService)

	if deps.DashboardStaticHandler != nil {
		router.Get("/", deps.DashboardStaticHandler.ServeHTTP)
	} else {
		router.Get("/", func(w http.ResponseWriter, r *http.Request) {
			httpresponse.JSON(w, http.StatusOK, map[string]any{
				"success": true,
				"data": map[string]any{
					"name":    "payment-platform-api",
					"status":  "bootstrapped",
					"version": "milestone-5",
				},
			})
		})
	}

	router.Get("/healthz", healthHandler.Get)
	if deps.MetricsHandler != nil {
		router.Handle("/metrics", deps.MetricsHandler)
	}
	router.Post("/v1/webhooks/midtrans", midtransWebhookHandler.Handle)

	router.Route("/v1/dashboard", func(r chi.Router) {
		r.Use(httpmiddleware.DashboardCORS(deps.AppEnv, deps.DashboardAllowedOrigins))
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", dashboardAuthHandler.Register)
			r.Post("/login", dashboardAuthHandler.Login)
			r.Post("/refresh", dashboardAuthHandler.Refresh)

			r.Group(func(r chi.Router) {
				r.Use(httpmiddleware.DashboardAuth(deps.AuthService))
				r.Post("/logout", dashboardAuthHandler.Logout)
				r.Post("/change-password", dashboardAuthHandler.ChangePassword)
				r.Post("/mfa/setup", dashboardAuthHandler.SetupMFA)
				r.Post("/mfa/verify", dashboardAuthHandler.VerifyMFA)
				r.Post("/mfa/rotate", dashboardAuthHandler.RotateMFA)
				r.Post("/mfa/disable", dashboardAuthHandler.DisableMFA)
				r.Post("/mfa/recovery/regenerate", dashboardAuthHandler.RegenerateRecoveryCodes)
			})
		})

		r.Group(func(r chi.Router) {
			r.Use(httpmiddleware.DashboardAuth(deps.AuthService))

			r.Get("/me", dashboardAuthHandler.Me)
		})

		r.Group(func(r chi.Router) {
			r.Use(httpmiddleware.DashboardAuth(deps.AuthService))
			r.Use(httpmiddleware.DashboardAccess())

			r.Route("/stores", func(r chi.Router) {
				r.Get("/", storeHandler.List)
				r.Post("/", storeHandler.Create)
				r.Get("/{store_id}", storeHandler.Get)
				r.Patch("/{store_id}", storeHandler.Update)
				r.Delete("/{store_id}", storeHandler.Delete)
				r.Get("/{store_id}/webhook-secret", storeHandler.ViewWebhookSecret)
				r.Post("/{store_id}/webhook-secret/rotate", storeHandler.RotateWebhookSecret)
				r.Get("/{store_id}/api-tokens", storeTokenHandler.List)
				r.Post("/{store_id}/api-tokens", storeTokenHandler.Create)
				r.Delete("/{store_id}/api-tokens/{token_id}", storeTokenHandler.Delete)
				r.Post("/{store_id}/api-tokens/{token_id}/rotate", storeTokenHandler.Rotate)
				r.Get("/{store_id}/transactions", dashboardTransactionHandler.ListForStore)
				r.Get("/{store_id}/transactions/{transaction_id}", dashboardTransactionHandler.GetForStore)
				r.Get("/{store_id}/audit-logs", dashboardTransactionHandler.ListAuditLogsForStore)
				r.Get("/{store_id}/webhook-deliveries", webhookDeliveryHandler.ListForStore)
			})

			r.Get("/webhook-deliveries/{delivery_id}", webhookDeliveryHandler.Get)
			r.Post("/webhook-deliveries/{delivery_id}/resend", webhookDeliveryHandler.Resend)
		})
	})

	router.Route("/v1", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(httpmiddleware.RejectBrowserStoreAPI())
			r.Use(httpmiddleware.StoreAPIAuth(deps.TokenService))
			r.Use(httpmiddleware.StoreRateLimit(deps.Redis, deps.Metrics, 60, 300))

			r.Post("/transactions/charge", storeAPIHandler.Charge)
			r.Get("/transactions/{order_id}", storeAPIHandler.GetTransaction)
			r.Get("/audit-logs", storeAPIHandler.ListAuditLogs)
		})
	})

	if deps.DashboardStaticHandler != nil {
		router.NotFound(func(w http.ResponseWriter, r *http.Request) {
			if isReservedPlatformPath(r.URL.Path) {
				http.NotFound(w, r)
				return
			}

			deps.DashboardStaticHandler.ServeHTTP(w, r)
		})
	}

	return router
}

func isReservedPlatformPath(path string) bool {
	if path == "/healthz" || path == "/metrics" {
		return true
	}

	return path == "/v1" || strings.HasPrefix(path, "/v1/")
}
