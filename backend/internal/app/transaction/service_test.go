package transaction

import (
	"context"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"payment-platform/backend/internal/integration/midtrans"
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

func TestBuildMidtransPayloadSupportsProductionChannels(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name             string
		request          ChargeRequest
		wantPaymentType  string
		wantBankTransfer map[string]any
		wantEChannel     bool
		wantQris         map[string]any
	}{
		{
			name: "bsi virtual account",
			request: ChargeRequest{
				Amount:      10000,
				Bank:        "bsi",
				Currency:    "IDR",
				OrderID:     "order-bsi",
				PaymentType: "bank_transfer",
			},
			wantPaymentType:  "bank_transfer",
			wantBankTransfer: map[string]any{"bank": "bsi"},
		},
		{
			name: "cimb niaga virtual account",
			request: ChargeRequest{
				Amount:      10000,
				Bank:        "cimb",
				Currency:    "IDR",
				OrderID:     "order-cimb",
				PaymentType: "bank_transfer",
			},
			wantPaymentType:  "bank_transfer",
			wantBankTransfer: map[string]any{"bank": "cimb"},
		},
		{
			name: "permata virtual account",
			request: ChargeRequest{
				Amount:      10000,
				Bank:        "permata",
				Currency:    "IDR",
				OrderID:     "order-permata",
				PaymentType: "bank_transfer",
			},
			wantPaymentType: "permata",
		},
		{
			name: "gopay ewallet",
			request: ChargeRequest{
				Amount:      10000,
				Currency:    "IDR",
				Ewallet:     "gopay",
				OrderID:     "order-gopay",
				PaymentType: "ewallet",
			},
			wantPaymentType: "gopay",
		},
		{
			name: "qris dynamic gopay",
			request: ChargeRequest{
				Acquirer:    "gopay",
				Amount:      10000,
				Currency:    "IDR",
				OrderID:     "order-qris",
				PaymentType: "qris",
			},
			wantPaymentType: "qris",
			wantQris:        map[string]any{"acquirer": "gopay"},
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if err := validateChargeRequest(tt.request); err != nil {
				t.Fatalf("validateChargeRequest error: %v", err)
			}

			payload, err := buildMidtransPayload("linksnap", tt.request)
			if err != nil {
				t.Fatalf("buildMidtransPayload error: %v", err)
			}

			if payload.PaymentType != tt.wantPaymentType {
				t.Fatalf("PaymentType = %q, want %q", payload.PaymentType, tt.wantPaymentType)
			}
			if !reflect.DeepEqual(payload.BankTransfer, tt.wantBankTransfer) {
				t.Fatalf("BankTransfer = %#v, want %#v", payload.BankTransfer, tt.wantBankTransfer)
			}
			if !reflect.DeepEqual(payload.Qris, tt.wantQris) {
				t.Fatalf("Qris = %#v, want %#v", payload.Qris, tt.wantQris)
			}
			if tt.wantEChannel && payload.EChannel == nil {
				t.Fatalf("EChannel is nil")
			}
		})
	}
}

func TestValidateChargeRequestRejectsUnsupportedProductionChannels(t *testing.T) {
	t.Parallel()

	for _, request := range []ChargeRequest{
		{Amount: 10000, Bank: "bca", Currency: "USD", OrderID: "order-usd", PaymentType: "bank_transfer"},
		{Amount: 10000, Currency: "IDR", Ewallet: "ovo", OrderID: "order-ovo", PaymentType: "ewallet"},
		{Acquirer: "ovo", Amount: 10000, Currency: "IDR", OrderID: "order-qris", PaymentType: "qris"},
		{Amount: 10000, Currency: "IDR", OrderID: "order-card", PaymentType: "credit_card"},
	} {
		if err := validateChargeRequest(request); err != ErrValidation {
			t.Fatalf("validateChargeRequest(%#v) = %v, want %v", request, err, ErrValidation)
		}
	}
}

func TestBuildChargeResultExposesPaymentMethodAndQRAction(t *testing.T) {
	t.Parallel()

	result := buildChargeResult(
		"trx-1",
		"order-1",
		"linksnap_order-1",
		"pending",
		10000,
		"qris",
		midtrans.ChargeResponse{
			Actions: []midtrans.Action{
				{Name: "generate-qr-code", Method: "GET", URL: "https://api.midtrans.com/v2/qris/trx/qr-code"},
			},
			PaymentType:       "qris",
			TransactionID:     "midtrans-1",
			TransactionStatus: "pending",
		},
	)

	if result.PaymentMethod != "qris_gopay" {
		t.Fatalf("PaymentMethod = %q, want qris_gopay", result.PaymentMethod)
	}
	if result.Midtrans.QRURL != "https://api.midtrans.com/v2/qris/trx/qr-code" {
		t.Fatalf("QRURL = %q", result.Midtrans.QRURL)
	}
	if len(result.Midtrans.Actions) != 1 {
		t.Fatalf("Actions length = %d, want 1", len(result.Midtrans.Actions))
	}
}

func TestBuildStoredChargeResultReturnsChargeResponseShape(t *testing.T) {
	t.Parallel()

	result, err := buildStoredChargeResult(
		"7dd41ec0-1c48-492a-b2df-8be28b4115b8",
		"INV-2026-0001",
		"linksnap_INV-2026-0001",
		"pending",
		150000,
		"bank_transfer",
		`{"transaction_id":"midtrans-1","payment_type":"bank_transfer","transaction_status":"pending","fraud_status":"accept","va_numbers":[{"bank":"bsi","va_number":"1234567890123456"}]}`,
	)
	if err != nil {
		t.Fatalf("buildStoredChargeResult error: %v", err)
	}

	if result.TransactionID != "7dd41ec0-1c48-492a-b2df-8be28b4115b8" {
		t.Fatalf("TransactionID = %q", result.TransactionID)
	}
	if result.Amount != 150000 {
		t.Fatalf("Amount = %d, want 150000", result.Amount)
	}
	if result.PaymentMethod != "bsi" {
		t.Fatalf("PaymentMethod = %q, want bsi", result.PaymentMethod)
	}
	if len(result.Midtrans.VANumbers) != 1 || result.Midtrans.VANumbers[0].Bank != "bsi" {
		t.Fatalf("VANumbers = %#v", result.Midtrans.VANumbers)
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
