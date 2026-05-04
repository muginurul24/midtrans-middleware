package token

import (
	"context"
	"errors"
	"reflect"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"payment-platform/backend/internal/platform/security"
)

func TestAuthenticateUsesCachedPrincipal(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	service, cleanup := newTestService(t)
	defer cleanup()

	rawToken, tokenPrefix, err := security.GenerateStoreAPIToken("development")
	if err != nil {
		t.Fatalf("generate store token: %v", err)
	}

	expected := StorePrincipal{
		TokenID: "token-123",
		StoreID: "store-123",
		UserID:  "user-123",
		Scopes:  []string{"transaction:create", "transaction:read"},
	}
	service.cacheAuthenticatedPrincipal(
		ctx,
		tokenPrefix,
		security.HashWithPepper(service.tokenPepper, rawToken),
		expected,
		storeStatusActive,
		nil,
		nil,
	)

	got, err := service.Authenticate(ctx, rawToken)
	if err != nil {
		t.Fatalf("authenticate cached token: %v", err)
	}

	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("principal = %#v, want %#v", got, expected)
	}
}

func TestAuthenticateRejectsRevokedCachedToken(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	service, cleanup := newTestService(t)
	defer cleanup()

	rawToken, tokenPrefix, err := security.GenerateStoreAPIToken("development")
	if err != nil {
		t.Fatalf("generate store token: %v", err)
	}

	revokedAt := time.Now().UTC()
	service.cacheAuthenticatedPrincipal(
		ctx,
		tokenPrefix,
		security.HashWithPepper(service.tokenPepper, rawToken),
		StorePrincipal{TokenID: "token-123", StoreID: "store-123"},
		storeStatusActive,
		&revokedAt,
		nil,
	)

	_, err = service.Authenticate(ctx, rawToken)
	if !errors.Is(err, ErrTokenRevoked) {
		t.Fatalf("authenticate error = %v, want %v", err, ErrTokenRevoked)
	}
}

func TestAuthenticateInvalidatesCorruptCachePayload(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	service, cleanup := newTestService(t)
	defer cleanup()

	rawToken, tokenPrefix, err := security.GenerateStoreAPIToken("development")
	if err != nil {
		t.Fatalf("generate store token: %v", err)
	}

	if err := service.redisClient.Set(ctx, storeTokenCacheKey(tokenPrefix), "not-json", tokenLookupCacheTTL).Err(); err != nil {
		t.Fatalf("seed corrupt cache payload: %v", err)
	}

	_, err = service.Authenticate(ctx, rawToken)
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("authenticate error = %v, want %v", err, ErrUnauthorized)
	}

	if service.redisClient.Exists(ctx, storeTokenCacheKey(tokenPrefix)).Val() != 0 {
		t.Fatalf("corrupt cache key %q still exists", storeTokenCacheKey(tokenPrefix))
	}
}

func TestInvalidateStoreTokenCacheDeletesKey(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	service, cleanup := newTestService(t)
	defer cleanup()

	tokenPrefix := "sk_test_cache_delete"
	if err := service.redisClient.Set(ctx, storeTokenCacheKey(tokenPrefix), "payload", tokenLookupCacheTTL).Err(); err != nil {
		t.Fatalf("seed cache payload: %v", err)
	}

	service.invalidateStoreTokenCache(ctx, tokenPrefix)

	if service.redisClient.Exists(ctx, storeTokenCacheKey(tokenPrefix)).Val() != 0 {
		t.Fatalf("cache key %q still exists", storeTokenCacheKey(tokenPrefix))
	}
}

func newTestService(t *testing.T) (*Service, func()) {
	t.Helper()

	server, err := miniredis.Run()
	if err != nil {
		t.Fatalf("start miniredis: %v", err)
	}

	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	service := NewService(nil, client, "development", "test-pepper")

	cleanup := func() {
		_ = client.Close()
		server.Close()
	}

	return service, cleanup
}
