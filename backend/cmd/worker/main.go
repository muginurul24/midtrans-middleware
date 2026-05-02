package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"

	"payment-platform/backend/internal/app/webhookdelivery"
	"payment-platform/backend/internal/config"
	platformhttpclient "payment-platform/backend/internal/platform/httpclient"
	platformlogger "payment-platform/backend/internal/platform/logger"
	platformmetrics "payment-platform/backend/internal/platform/metrics"
	platformpostgres "payment-platform/backend/internal/platform/postgres"
	platformredis "payment-platform/backend/internal/platform/redis"
	"payment-platform/backend/internal/worker/tasks"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "worker failed: %v\n", err)
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
		Int("worker_concurrency", cfg.WorkerConcurrency).
		Str("redis_addr", cfg.RedisAddr).
		Msg("starting worker")

	ctx := context.Background()
	postgresPool, err := platformpostgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("create postgres pool: %w", err)
	}
	defer postgresPool.Close()

	metrics := platformmetrics.New()
	httpClient := platformhttpclient.New(cfg.CallbackHTTPTimeout)
	deliveryService := webhookdelivery.NewService(postgresPool, nil, httpClient, cfg.WebhookPepper, metrics)

	metricsServer := &http.Server{
		Addr:              cfg.WorkerMetricsAddress(),
		Handler:           metrics.Handler(),
		ReadHeaderTimeout: 2 * cfg.HealthcheckTimeout,
	}
	metricsErrCh := make(chan error, 1)
	go func() {
		if serveErr := metricsServer.ListenAndServe(); serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			metricsErrCh <- serveErr
		}
	}()

	server := asynq.NewServer(
		platformredis.AsynqRedisClientOpt(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB),
		asynq.Config{
			Concurrency: cfg.WorkerConcurrency,
			RetryDelayFunc: func(n int, err error, task *asynq.Task) time.Duration {
				return webhookdelivery.RetryDelay()
			},
			DelayedTaskCheckInterval: time.Second,
			Queues: map[string]int{
				"critical":    12,
				"webhook":     8,
				"maintenance": 2,
			},
		},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc(tasks.TypeWebhookDeliver, func(ctx context.Context, task *asynq.Task) error {
		var payload tasks.WebhookDeliverPayload
		if err := json.Unmarshal(task.Payload(), &payload); err != nil {
			logger.Error().
				Err(err).
				Str("task_type", task.Type()).
				Msg("invalid worker payload")
			return asynq.SkipRetry
		}

		logger.Info().
			Str("task_type", task.Type()).
			Str("webhook_delivery_id", payload.WebhookDeliveryID).
			Str("store_id", payload.StoreID).
			Str("transaction_id", payload.TransactionID).
			Msg("processing webhook delivery task")

		err = deliveryService.ProcessTask(ctx, payload)
		if err != nil && err != asynq.SkipRetry {
			logger.Error().
				Err(err).
				Str("task_type", task.Type()).
				Str("webhook_delivery_id", payload.WebhookDeliveryID).
				Msg("webhook delivery task failed")
		}

		return err
	})

	errCh := make(chan error, 1)
	go func() {
		if runErr := server.Run(mux); runErr != nil {
			errCh <- runErr
		}
	}()

	sigCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case runErr := <-errCh:
		return fmt.Errorf("run worker: %w", runErr)
	case serveErr := <-metricsErrCh:
		server.Shutdown()
		return fmt.Errorf("start worker metrics server: %w", serveErr)
	case <-sigCtx.Done():
		logger.Info().Msg("shutdown signal received")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()
		if err := metricsServer.Shutdown(shutdownCtx); err != nil {
			logger.Warn().Err(err).Msg("shutdown worker metrics server")
		}
		server.Shutdown()
	}

	logger.Info().Msg("worker stopped")

	return nil
}
