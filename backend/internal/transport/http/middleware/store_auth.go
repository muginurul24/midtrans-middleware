package httpmiddleware

import (
	"net/http"

	apitoken "payment-platform/backend/internal/app/token"
	"payment-platform/backend/internal/platform/requestlog"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

func StoreAPIAuth(service *apitoken.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rawToken, ok := bearerToken(r.Header.Get("Authorization"))
			if !ok {
				httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing bearer token.", nil)
				return
			}

			principal, err := service.Authenticate(r.Context(), rawToken)
			if err != nil {
				switch err {
				case apitoken.ErrStoreInactive:
					httpresponse.Error(w, r, http.StatusForbidden, "STORE_INACTIVE", "Store is inactive.", nil)
				case apitoken.ErrTokenRevoked:
					httpresponse.Error(w, r, http.StatusUnauthorized, "TOKEN_REVOKED", "Store API token has been revoked.", nil)
				default:
					httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid store API token.", nil)
				}
				return
			}

			ctx := WithStorePrincipal(r.Context(), principal)
			requestlog.SetStoreID(ctx, principal.StoreID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
