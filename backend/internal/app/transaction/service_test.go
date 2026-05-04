package transaction

import (
	"reflect"
	"strings"
	"testing"
	"time"
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
