package httpmiddleware

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/redis/go-redis/v9"

	platformmetrics "payment-platform/backend/internal/platform/metrics"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

func StoreRateLimit(redisClient redis.UniversalClient, metrics *platformmetrics.Metrics, tokenLimit int64, storeLimit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			principal, ok := StorePrincipalFromContext(r.Context())
			if !ok {
				httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing store principal.", nil)
				return
			}

			window := time.Now().UTC().Format("200601021504")
			tokenKey := fmt.Sprintf("rate_limit:token:%s:%s", principal.TokenID, window)
			storeKey := fmt.Sprintf("rate_limit:store:%s:%s", principal.StoreID, window)

			tokenCount, storeCount, err := incrementWindow(r.Context(), redisClient, tokenKey, storeKey)
			if err != nil {
				metrics.RecordRedisError("rate_limit", "increment_window")
				httpresponse.Error(w, r, http.StatusServiceUnavailable, "INTERNAL_ERROR", "Rate limiter unavailable.", nil)
				return
			}

			if tokenCount > tokenLimit || storeCount > storeLimit {
				if tokenCount > tokenLimit {
					metrics.RecordRateLimitHit("token")
				}
				if storeCount > storeLimit {
					metrics.RecordRateLimitHit("store")
				}
				httpresponse.Error(w, r, http.StatusTooManyRequests, "RATE_LIMITED", "Rate limit exceeded.", map[string]any{
					"token_limit": tokenLimit,
					"store_limit": storeLimit,
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func incrementWindow(ctx context.Context, redisClient redis.UniversalClient, tokenKey string, storeKey string) (int64, int64, error) {
	pipeline := redisClient.TxPipeline()
	tokenCount := pipeline.Incr(ctx, tokenKey)
	pipeline.Expire(ctx, tokenKey, 2*time.Minute)
	storeCount := pipeline.Incr(ctx, storeKey)
	pipeline.Expire(ctx, storeKey, 2*time.Minute)

	if _, err := pipeline.Exec(ctx); err != nil {
		return 0, 0, err
	}

	return tokenCount.Val(), storeCount.Val(), nil
}
