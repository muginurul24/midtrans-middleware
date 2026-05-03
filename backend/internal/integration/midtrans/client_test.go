package midtrans

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestChargeSetsOverrideNotificationHeader(t *testing.T) {
	t.Parallel()

	var overrideHeader string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		overrideHeader = r.Header.Get("X-Override-Notification")
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"status_code":"201","transaction_id":"mid-123","order_id":"order-123","gross_amount":"150000","currency":"IDR","payment_type":"bank_transfer","transaction_status":"pending","va_numbers":[{"bank":"bca","va_number":"123"}]}`)
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "Mid-server-test", []string{
		"https://paygate.example.com/v1/webhooks/midtrans",
		" https://backup.example.com/midtrans ",
	})

	_, _, _, err := client.Charge(context.Background(), map[string]any{
		"payment_type": "bank_transfer",
	})
	if err != nil {
		t.Fatalf("charge returned error: %v", err)
	}

	expected := "https://paygate.example.com/v1/webhooks/midtrans,https://backup.example.com/midtrans"
	if overrideHeader != expected {
		t.Fatalf("override header = %q, want %q", overrideHeader, expected)
	}
}

func TestChargeOmitsOverrideNotificationHeaderWhenUnset(t *testing.T) {
	t.Parallel()

	var overrideHeader string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		overrideHeader = r.Header.Get("X-Override-Notification")
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"status_code":"201","transaction_id":"mid-123","order_id":"order-123","gross_amount":"150000","currency":"IDR","payment_type":"bank_transfer","transaction_status":"pending","va_numbers":[{"bank":"bca","va_number":"123"}]}`)
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "Mid-server-test", nil)

	_, _, _, err := client.Charge(context.Background(), map[string]any{
		"payment_type": "bank_transfer",
	})
	if err != nil {
		t.Fatalf("charge returned error: %v", err)
	}

	if overrideHeader != "" {
		t.Fatalf("override header = %q, want empty", overrideHeader)
	}
}

func TestChargeReturnsAPIErrorWhenPayloadStatusCodeIsLogicalFailure(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = io.WriteString(w, `{"status_code":"402","status_message":"Payment channel is not activated."}`)
	}))
	defer server.Close()

	client := NewClient(server.Client(), server.URL, "Mid-server-test", nil)

	response, body, statusCode, err := client.Charge(context.Background(), map[string]any{
		"payment_type": "bank_transfer",
	})
	if err == nil {
		t.Fatal("charge returned nil error, want APIError")
	}

	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("error type = %T, want *APIError", err)
	}

	if statusCode != http.StatusPaymentRequired {
		t.Fatalf("statusCode = %d, want %d", statusCode, http.StatusPaymentRequired)
	}

	if apiErr.StatusCode != http.StatusPaymentRequired {
		t.Fatalf("apiErr.StatusCode = %d, want %d", apiErr.StatusCode, http.StatusPaymentRequired)
	}

	if response.StatusCode != "402" {
		t.Fatalf("response.StatusCode = %q, want %q", response.StatusCode, "402")
	}

	if string(body) != `{"status_code":"402","status_message":"Payment channel is not activated."}` {
		t.Fatalf("body = %s", body)
	}
}
