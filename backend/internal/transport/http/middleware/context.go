package httpmiddleware

import (
	"context"

	"payment-platform/backend/internal/app/auth"
	apitoken "payment-platform/backend/internal/app/token"
)

type contextKey string

const (
	dashboardPrincipalKey contextKey = "dashboard_principal"
	storePrincipalKey     contextKey = "store_principal"
)

func WithDashboardPrincipal(ctx context.Context, principal auth.AccessPrincipal) context.Context {
	return context.WithValue(ctx, dashboardPrincipalKey, principal)
}

func DashboardPrincipalFromContext(ctx context.Context) (auth.AccessPrincipal, bool) {
	principal, ok := ctx.Value(dashboardPrincipalKey).(auth.AccessPrincipal)
	return principal, ok
}

func WithStorePrincipal(ctx context.Context, principal apitoken.StorePrincipal) context.Context {
	return context.WithValue(ctx, storePrincipalKey, principal)
}

func StorePrincipalFromContext(ctx context.Context) (apitoken.StorePrincipal, bool) {
	principal, ok := ctx.Value(storePrincipalKey).(apitoken.StorePrincipal)
	return principal, ok
}
