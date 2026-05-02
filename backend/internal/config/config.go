package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv                  string
	AppPort                 string
	WorkerMetricsPort       string
	LogLevel                string
	DatabaseURL             string
	DashboardAllowedOrigins []string
	RedisAddr               string
	RedisPassword           string
	RedisDB                 int
	MidtransEnv             string
	MidtransServerKey       string
	MidtransAPIBaseURL      string
	JWTAccessSecret         string
	JWTRefreshSecret        string
	MFAEncryptionKey        string
	TokenPepper             string
	WebhookPepper           string
	MidtransHTTPTimeout     time.Duration
	CallbackHTTPTimeout     time.Duration
	HTTPReadTimeout         time.Duration
	HTTPWriteTimeout        time.Duration
	HTTPIdleTimeout         time.Duration
	HealthcheckTimeout      time.Duration
	ShutdownTimeout         time.Duration
	WorkerConcurrency       int
}

func Load() (Config, error) {
	redisDB, err := intEnv("REDIS_DB", 0)
	if err != nil {
		return Config{}, err
	}

	readTimeout, err := durationEnv("HTTP_READ_TIMEOUT", 5*time.Second)
	if err != nil {
		return Config{}, err
	}

	writeTimeout, err := durationEnv("HTTP_WRITE_TIMEOUT", 10*time.Second)
	if err != nil {
		return Config{}, err
	}

	midtransHTTPTimeout, err := durationEnv("MIDTRANS_HTTP_TIMEOUT", 30*time.Second)
	if err != nil {
		return Config{}, err
	}

	callbackHTTPTimeout, err := durationEnv("STORE_CALLBACK_HTTP_TIMEOUT", 15*time.Second)
	if err != nil {
		return Config{}, err
	}

	idleTimeout, err := durationEnv("HTTP_IDLE_TIMEOUT", 30*time.Second)
	if err != nil {
		return Config{}, err
	}

	healthTimeout, err := durationEnv("HEALTHCHECK_TIMEOUT", 2*time.Second)
	if err != nil {
		return Config{}, err
	}

	shutdownTimeout, err := durationEnv("SHUTDOWN_TIMEOUT", 10*time.Second)
	if err != nil {
		return Config{}, err
	}

	workerConcurrency, err := intEnv("WORKER_CONCURRENCY", 10)
	if err != nil {
		return Config{}, err
	}

	appEnv := stringEnv("APP_ENV", "development")

	jwtAccessSecret, err := sensitiveEnv("JWT_ACCESS_SECRET", appEnv, "dev-access-secret")
	if err != nil {
		return Config{}, err
	}

	jwtRefreshSecret, err := sensitiveEnv("JWT_REFRESH_SECRET", appEnv, "dev-refresh-secret")
	if err != nil {
		return Config{}, err
	}

	tokenPepper, err := sensitiveEnv("TOKEN_PEPPER", appEnv, "dev-token-pepper")
	if err != nil {
		return Config{}, err
	}

	mfaEncryptionKey, err := sensitiveEnv("MFA_ENCRYPTION_KEY", appEnv, "dev-mfa-encryption-key")
	if err != nil {
		return Config{}, err
	}

	webhookPepper, err := sensitiveEnv("WEBHOOK_SIGNING_PEPPER", appEnv, "dev-webhook-pepper")
	if err != nil {
		return Config{}, err
	}

	midtransEnv := stringEnv("MIDTRANS_ENV", "sandbox")
	midtransServerKey, err := optionalSensitiveEnv("MIDTRANS_SERVER_KEY", appEnv)
	if err != nil {
		return Config{}, err
	}

	return Config{
		AppEnv:            appEnv,
		AppPort:           stringEnv("APP_PORT", "8080"),
		WorkerMetricsPort: stringEnv("WORKER_METRICS_PORT", "9091"),
		LogLevel:          stringEnv("LOG_LEVEL", "info"),
		DatabaseURL:       stringEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/payment_platform?sslmode=disable"),
		DashboardAllowedOrigins: csvEnv("DASHBOARD_ALLOWED_ORIGINS", []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
		}),
		RedisAddr:           stringEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:       stringEnv("REDIS_PASSWORD", ""),
		RedisDB:             redisDB,
		MidtransEnv:         midtransEnv,
		MidtransServerKey:   midtransServerKey,
		MidtransAPIBaseURL:  stringEnv("MIDTRANS_API_BASE_URL", defaultMidtransBaseURL(midtransEnv)),
		JWTAccessSecret:     jwtAccessSecret,
		JWTRefreshSecret:    jwtRefreshSecret,
		MFAEncryptionKey:    mfaEncryptionKey,
		TokenPepper:         tokenPepper,
		WebhookPepper:       webhookPepper,
		MidtransHTTPTimeout: midtransHTTPTimeout,
		CallbackHTTPTimeout: callbackHTTPTimeout,
		HTTPReadTimeout:     readTimeout,
		HTTPWriteTimeout:    writeTimeout,
		HTTPIdleTimeout:     idleTimeout,
		HealthcheckTimeout:  healthTimeout,
		ShutdownTimeout:     shutdownTimeout,
		WorkerConcurrency:   workerConcurrency,
	}, nil
}

func (c Config) HTTPAddress() string {
	return ":" + c.AppPort
}

func (c Config) WorkerMetricsAddress() string {
	return ":" + c.WorkerMetricsPort
}

func stringEnv(key string, fallback string) string {
	value, ok := os.LookupEnv(key)
	if !ok || value == "" {
		return fallback
	}

	return value
}

func intEnv(key string, fallback int) (int, error) {
	raw, ok := os.LookupEnv(key)
	if !ok || raw == "" {
		return fallback, nil
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("parse %s as int: %w", key, err)
	}

	return value, nil
}

func csvEnv(key string, fallback []string) []string {
	raw, ok := os.LookupEnv(key)
	if !ok || strings.TrimSpace(raw) == "" {
		return fallback
	}

	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			values = append(values, trimmed)
		}
	}

	if len(values) == 0 {
		return fallback
	}

	return values
}

func durationEnv(key string, fallback time.Duration) (time.Duration, error) {
	raw, ok := os.LookupEnv(key)
	if !ok || raw == "" {
		return fallback, nil
	}

	value, err := time.ParseDuration(raw)
	if err != nil {
		return 0, fmt.Errorf("parse %s as duration: %w", key, err)
	}

	return value, nil
}

func sensitiveEnv(key string, appEnv string, fallback string) (string, error) {
	value, ok := os.LookupEnv(key)
	if ok && value != "" {
		return value, nil
	}

	if appEnv == "production" {
		return "", fmt.Errorf("%s must be set in production", key)
	}

	return fallback, nil
}

func optionalSensitiveEnv(key string, appEnv string) (string, error) {
	value, ok := os.LookupEnv(key)
	if ok && value != "" {
		return value, nil
	}

	if appEnv == "production" {
		return "", fmt.Errorf("%s must be set in production", key)
	}

	return "", nil
}

func defaultMidtransBaseURL(midtransEnv string) string {
	if strings.EqualFold(midtransEnv, "production") {
		return "https://api.midtrans.com/v2"
	}

	return "https://api.sandbox.midtrans.com/v2"
}
