package transaction

import (
	"context"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	platformmetrics "payment-platform/backend/internal/platform/metrics"
)

func TestBuildAuditLogFiltersIncludesStructuredFields(t *testing.T) {
	t.Parallel()

	statusCode := 502
	createdFrom := time.Date(2026, time.May, 4, 0, 0, 0, 0, time.UTC)
	createdTo := time.Date(2026, time.May, 5, 0, 0, 0, 0, time.UTC)

	whereSQL, args := buildAuditLogFilters("store-123", AuditLogListInput{
		Direction:   "outbound",
		RequestID:   "req-123",
		OrderID:     "INV-2026-0001",
		Endpoint:    "/v1/webhooks/midtrans",
		StatusCode:  &statusCode,
		CreatedFrom: &createdFrom,
		CreatedTo:   &createdTo,
		Query:       "midtrans",
	})

	for _, expected := range []string{
		"store_id = $1",
		"direction = $2",
		"request_id ILIKE $3",
		"COALESCE(request_body #>> '{transaction_details,order_id}', '') ILIKE $4",
		"COALESCE(url, '') ILIKE $5",
		"status_code = $6",
		"created_at >= $7",
		"created_at < $8",
		"request_id ILIKE $9",
	} {
		if !strings.Contains(whereSQL, expected) {
			t.Fatalf("whereSQL missing %q: %s", expected, whereSQL)
		}
	}

	expectedArgs := []any{
		"store-123",
		"outbound",
		"%req-123%",
		"%INV-2026-0001%",
		"%/v1/webhooks/midtrans%",
		502,
		createdFrom,
		createdTo,
		"%midtrans%",
	}
	if !reflect.DeepEqual(args, expectedArgs) {
		t.Fatalf("args = %#v, want %#v", args, expectedArgs)
	}
}

func TestBuildAuditLogFiltersDefaultsToStoreClauseOnly(t *testing.T) {
	t.Parallel()

	whereSQL, args := buildAuditLogFilters("store-123", AuditLogListInput{})

	if whereSQL != "store_id = $1" {
		t.Fatalf("whereSQL = %q, want %q", whereSQL, "store_id = $1")
	}

	expectedArgs := []any{"store-123"}
	if !reflect.DeepEqual(args, expectedArgs) {
		t.Fatalf("args = %#v, want %#v", args, expectedArgs)
	}
}

func TestValidateIdempotencyKeyRequiresValue(t *testing.T) {
	t.Parallel()

	if err := validateIdempotencyKey("   "); err != ErrIdempotencyKeyRequired {
		t.Fatalf("validateIdempotencyKey error = %v, want %v", err, ErrIdempotencyKeyRequired)
	}

	if err := validateIdempotencyKey("idem-123"); err != nil {
		t.Fatalf("validateIdempotencyKey unexpected error: %v", err)
	}
}

func TestCacheIdempotencyResultStoresTransactionID(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	service, server, cleanup := newTransactionTestService(t)
	defer cleanup()

	service.cacheIdempotencyResult(ctx, "store-123", "idem-123", "trx-123")

	got, err := service.redisClient.Get(ctx, idempotencyResultCacheKey("store-123", "idem-123")).Result()
	if err != nil {
		t.Fatalf("redis get cached idempotency result: %v", err)
	}
	if got != "trx-123" {
		t.Fatalf("cached transaction id = %q, want %q", got, "trx-123")
	}

	if ttl := server.TTL(idempotencyResultCacheKey("store-123", "idem-123")); ttl != 24*time.Hour {
		t.Fatalf("cache ttl = %v, want %v", ttl, 24*time.Hour)
	}
}

func TestFindIdempotencyReplayDeletesBlankCacheValue(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	service, _, cleanup := newTransactionTestService(t)
	defer cleanup()

	key := idempotencyResultCacheKey("store-123", "idem-blank")
	if err := service.redisClient.Set(ctx, key, "   ", 24*time.Hour).Err(); err != nil {
		t.Fatalf("seed blank idempotency result: %v", err)
	}

	got, found, err := service.findIdempotencyReplay(ctx, "store-123", "idem-blank", []byte(`{"order_id":"INV-2026-0001"}`))
	if err != nil {
		t.Fatalf("findIdempotencyReplay error: %v", err)
	}
	if found {
		t.Fatalf("findIdempotencyReplay found = true, want false with result %#v", got)
	}

	if service.redisClient.Exists(ctx, key).Val() != 0 {
		t.Fatalf("blank cache key %q still exists", key)
	}
}

func newTransactionTestService(t *testing.T) (*Service, *miniredis.Miniredis, func()) {
	t.Helper()

	server, err := miniredis.Run()
	if err != nil {
		t.Fatalf("start miniredis: %v", err)
	}

	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	service := NewService(nil, client, nil, platformmetrics.New())

	cleanup := func() {
		_ = client.Close()
		server.Close()
	}

	return service, server, cleanup
}
