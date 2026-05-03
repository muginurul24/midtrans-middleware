package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/hibiken/asynq"

	"payment-platform/backend/internal/app/auth"
	"payment-platform/backend/internal/app/store"
	apitoken "payment-platform/backend/internal/app/token"
	"payment-platform/backend/internal/app/transaction"
	"payment-platform/backend/internal/app/webhook"
	"payment-platform/backend/internal/app/webhookdelivery"
	"payment-platform/backend/internal/integration/midtrans"
	transporthttp "payment-platform/backend/internal/transport/http"

	"payment-platform/backend/internal/config"
	platformhttpclient "payment-platform/backend/internal/platform/httpclient"
	platformlogger "payment-platform/backend/internal/platform/logger"
	platformmetrics "payment-platform/backend/internal/platform/metrics"
	platformpostgres "payment-platform/backend/internal/platform/postgres"
	platformredis "payment-platform/backend/internal/platform/redis"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "api server failed: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	logger := platformlogger.New(cfg.AppEnv, cfg.LogLevel)
	logger.Info().
		Str("app_env", cfg.AppEnv).
		Str("http_addr", cfg.HTTPAddress()).
		Msg("starting api server")

	ctx := context.Background()

	postgresPool, err := platformpostgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("create postgres pool: %w", err)
	}
	defer postgresPool.Close()

	redisClient := platformredis.NewClient(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	defer func() {
		if closeErr := redisClient.Close(); closeErr != nil {
			logger.Warn().Err(closeErr).Msg("close redis client")
		}
	}()
	asynqClient := asynq.NewClient(platformredis.AsynqRedisClientOpt(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB))
	defer func() {
		if closeErr := asynqClient.Close(); closeErr != nil {
			logger.Warn().Err(closeErr).Msg("close asynq client")
		}
	}()
	asynqInspector := asynq.NewInspector(platformredis.AsynqRedisClientOpt(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB))
	defer func() {
		if closeErr := asynqInspector.Close(); closeErr != nil {
			logger.Warn().Err(closeErr).Msg("close asynq inspector")
		}
	}()

	metrics := platformmetrics.New()
	metrics.RegisterQueueDepth(webhookdelivery.QueueWebhook, asynqInspector)

	authService := auth.NewService(
		postgresPool,
		cfg.AppEnv,
		cfg.JWTAccessSecret,
		cfg.JWTRefreshSecret,
		cfg.TokenPepper,
		cfg.MFAEncryptionKey,
	)
	storeService := store.NewService(postgresPool, cfg.AppEnv, cfg.WebhookPepper)
	tokenService := apitoken.NewService(postgresPool, cfg.AppEnv, cfg.TokenPepper)
	midtransHTTPClient := platformhttpclient.New(cfg.MidtransHTTPTimeout)
	midtransClient := midtrans.NewClient(
		midtransHTTPClient,
		cfg.MidtransAPIBaseURL,
		cfg.MidtransServerKey,
		cfg.MidtransOverrideNotificationURLs,
	)
	transactionService := transaction.NewService(postgresPool, redisClient, midtransClient, metrics)
	deliveryHTTPClient := platformhttpclient.New(cfg.CallbackHTTPTimeout)
	webhookDeliveryService := webhookdelivery.NewService(postgresPool, asynqClient, deliveryHTTPClient, cfg.WebhookPepper, metrics)
	webhookService := webhook.NewService(postgresPool, cfg.MidtransServerKey, webhookDeliveryService, metrics)

	var dashboardStaticHandler http.Handler
	if cfg.DashboardDistDir != "" {
		dashboardStaticHandler = transporthttp.NewDashboardStaticHandler(cfg.DashboardDistDir)
		logger.Info().Str("dashboard_dist_dir", cfg.DashboardDistDir).Msg("dashboard static assets enabled")
	}

	router := transporthttp.NewRouter(transporthttp.Dependencies{
		AppEnv:                  cfg.AppEnv,
		Logger:                  logger,
		Metrics:                 metrics,
		MetricsHandler:          metrics.Handler(),
		DashboardStaticHandler:  dashboardStaticHandler,
		Postgres:                postgresPool,
		Redis:                   redisClient,
		DashboardAllowedOrigins: cfg.DashboardAllowedOrigins,
		HealthcheckTimeout:      cfg.HealthcheckTimeout,
		AuthService:             authService,
		StoreService:            storeService,
		TokenService:            tokenService,
		TransactionService:      transactionService,
		WebhookService:          webhookService,
		WebhookDeliveryService:  webhookDeliveryService,
	})

	server := &http.Server{
		Addr:              cfg.HTTPAddress(),
		Handler:           router,
		ReadHeaderTimeout: 2 * cfg.HealthcheckTimeout,
		ReadTimeout:       cfg.HTTPReadTimeout,
		WriteTimeout:      cfg.HTTPWriteTimeout,
		IdleTimeout:       cfg.HTTPIdleTimeout,
	}

	errCh := make(chan error, 1)
	go func() {
		if serveErr := server.ListenAndServe(); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			errCh <- serveErr
		}
	}()

	sigCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case serveErr := <-errCh:
		return fmt.Errorf("listen and serve: %w", serveErr)
	case <-sigCtx.Done():
		logger.Info().Msg("shutdown signal received")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown api server: %w", err)
	}

	logger.Info().Msg("api server stopped")

	return nil
}
