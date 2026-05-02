package httpmiddleware

import (
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/zerolog"

	"payment-platform/backend/internal/platform/requestlog"
)

func RequestLogger(logger zerolog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			startedAt := time.Now()
			wrapped := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)
			r = r.WithContext(requestlog.WithFields(r.Context()))

			next.ServeHTTP(wrapped, r)

			fields := requestlog.SnapshotFromContext(r.Context())

			event := logger.Info()
			if wrapped.Status() >= http.StatusInternalServerError {
				event = logger.Error()
			} else if wrapped.Status() >= http.StatusBadRequest {
				event = logger.Warn()
			}

			event.
				Str("request_id", chimiddleware.GetReqID(r.Context())).
				Str("store_id", fields.StoreID).
				Str("transaction_id", fields.TransactionID).
				Str("order_id", fields.OrderID).
				Str("method", r.Method).
				Str("endpoint", r.URL.Path).
				Int("status_code", wrapped.Status()).
				Int("bytes_out", wrapped.BytesWritten()).
				Int64("duration_ms", time.Since(startedAt).Milliseconds()).
				Str("error", fields.ErrorCode).
				Msg("http request")
		})
	}
}
