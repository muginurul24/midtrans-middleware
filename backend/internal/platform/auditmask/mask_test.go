package auditmask

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestTextMasksInlineSecrets(t *testing.T) {
	t.Parallel()

	masked := Text("Bearer sk_live_secrettoken Basic Zm9vOmJhcg== Mid-server-abc123 whsec_secret sha256=deadbeef sk_test_inline")

	for _, raw := range []string{
		"sk_live_secrettoken",
		"Zm9vOmJhcg==",
		"Mid-server-abc123",
		"whsec_secret",
		"sha256=deadbeef",
		"sk_test_inline",
	} {
		if strings.Contains(masked, raw) {
			t.Fatalf("masked text still contains raw secret %q: %s", raw, masked)
		}
	}

	for _, expected := range []string{
		"Bearer ***",
		"Basic ***",
		"Mid-server-***",
		"whsec_***",
		"sha256=***",
		"sk_test_***",
	} {
		if !strings.Contains(masked, expected) {
			t.Fatalf("masked text missing %q: %s", expected, masked)
		}
	}
}

func TestHeadersTextMasksSensitiveHeaderValues(t *testing.T) {
	t.Parallel()

	raw := HeadersText(map[string]string{
		"Authorization":        "Bearer sk_live_secrettoken",
		"X-Webhook-Signature":  "sha256=deadbeef",
		"X-Midtrans-ServerKey": "Mid-server-secret",
	})

	payload := decodeObject(t, raw)

	if got := payload["Authorization"]; got != "***" {
		t.Fatalf("authorization header not masked: %#v", got)
	}
	if got := payload["X-Webhook-Signature"]; got != "***" {
		t.Fatalf("webhook signature header not masked: %#v", got)
	}
	if got := payload["X-Midtrans-ServerKey"]; got != "Mid-server-***" {
		t.Fatalf("midtrans header not masked: %#v", got)
	}
}

func TestJSONTextMasksSensitiveKeysAndNestedValues(t *testing.T) {
	t.Parallel()

	raw := []byte(`{
		"authorization": "Bearer sk_live_secrettoken",
		"token": "sk_test_tokenvalue",
		"webhook_secret": "whsec_secretvalue",
		"password": "super-secret-password",
		"signature_key": "midtrans-signature",
		"customer": {
			"email": "buyer@example.com",
			"notes": "basic Basic Zm9vOmJhcg== midtrans Mid-server-abc123"
		},
		"attempts": [
			{
				"current_password": "old-password",
				"new_password": "new-password"
			}
		]
	}`)

	masked := JSONText(raw)
	payload := decodeObject(t, masked)

	for _, rawSecret := range []string{
		"sk_live_secrettoken",
		"sk_test_tokenvalue",
		"whsec_secretvalue",
		"super-secret-password",
		"midtrans-signature",
		"Zm9vOmJhcg==",
		"Mid-server-abc123",
		"old-password",
		"new-password",
	} {
		if strings.Contains(masked, rawSecret) {
			t.Fatalf("masked JSON still contains raw secret %q: %s", rawSecret, masked)
		}
	}

	for _, key := range []string{"authorization", "token", "webhook_secret", "password", "signature_key"} {
		if got := payload[key]; got != "***" {
			t.Fatalf("top-level key %q not masked: %#v", key, got)
		}
	}

	customer, ok := payload["customer"].(map[string]any)
	if !ok {
		t.Fatalf("customer payload missing: %#v", payload["customer"])
	}
	if got := customer["notes"]; got != "basic Basic *** midtrans Mid-server-***" {
		t.Fatalf("customer notes not masked: %#v", got)
	}

	attempts, ok := payload["attempts"].([]any)
	if !ok || len(attempts) != 1 {
		t.Fatalf("attempts payload invalid: %#v", payload["attempts"])
	}

	attempt, ok := attempts[0].(map[string]any)
	if !ok {
		t.Fatalf("attempt payload invalid: %#v", attempts[0])
	}
	if got := attempt["current_password"]; got != "***" {
		t.Fatalf("current password not masked: %#v", got)
	}
	if got := attempt["new_password"]; got != "***" {
		t.Fatalf("new password not masked: %#v", got)
	}
}

func TestJSONTextWrapsInvalidJSONSafely(t *testing.T) {
	t.Parallel()

	masked := JSONText([]byte("Bearer sk_live_secrettoken whsec_secretvalue"))
	payload := decodeObject(t, masked)

	raw, ok := payload["raw"].(string)
	if !ok {
		t.Fatalf("raw payload missing: %#v", payload)
	}
	if strings.Contains(raw, "sk_live_secrettoken") || strings.Contains(raw, "whsec_secretvalue") {
		t.Fatalf("invalid JSON wrapper still contains secret: %s", raw)
	}
	if !strings.Contains(raw, "Bearer ***") || !strings.Contains(raw, "whsec_***") {
		t.Fatalf("invalid JSON wrapper missing masking: %s", raw)
	}
}

func decodeObject(t *testing.T, raw string) map[string]any {
	t.Helper()

	var payload map[string]any
	if err := json.Unmarshal([]byte(raw), &payload); err != nil {
		t.Fatalf("unmarshal masked payload: %v", err)
	}

	return payload
}
