package auditmask

import (
	"encoding/json"
	"regexp"
	"strings"
)

var (
	bearerPattern         = regexp.MustCompile(`(?i)\bBearer\s+[A-Za-z0-9._~+/\-=]+`)
	basicPattern          = regexp.MustCompile(`(?i)\bBasic\s+[A-Za-z0-9+/=]+`)
	midtransServerPattern = regexp.MustCompile(`\bMid-server-[A-Za-z0-9_-]+\b`)
	midtransClientPattern = regexp.MustCompile(`\bMid-client-[A-Za-z0-9_-]+\b`)
	storeTokenPattern     = regexp.MustCompile(`\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9_-]+\b`)
	webhookSecretPattern  = regexp.MustCompile(`\bwhsec_[A-Za-z0-9_-]+\b`)
	sha256Pattern         = regexp.MustCompile(`\bsha256=[A-Fa-f0-9]+\b`)
)

func HeadersText(headers map[string]string) string {
	payload := make(map[string]any, len(headers))
	for key, value := range headers {
		payload[key] = value
	}

	return MarshalText(payload)
}

func MarshalText(value any) string {
	body, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}

	return JSONText(body)
}

func JSONText(raw []byte) string {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		return "{}"
	}

	var decoded any
	if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
		return MarshalText(map[string]any{
			"raw": Text(trimmed),
		})
	}

	masked, ok := maskValue(decoded, "").(map[string]any)
	if !ok {
		return MarshalText(map[string]any{
			"value": maskValue(decoded, ""),
		})
	}

	body, err := json.Marshal(masked)
	if err != nil {
		return "{}"
	}

	return string(body)
}

func JSONStringText(raw string) string {
	return JSONText([]byte(raw))
}

func Text(value string) string {
	masked := strings.TrimSpace(value)
	if masked == "" {
		return ""
	}

	masked = bearerPattern.ReplaceAllString(masked, "Bearer ***")
	masked = basicPattern.ReplaceAllString(masked, "Basic ***")
	masked = midtransServerPattern.ReplaceAllString(masked, "Mid-server-***")
	masked = midtransClientPattern.ReplaceAllString(masked, "Mid-client-***")
	masked = storeTokenPattern.ReplaceAllStringFunc(masked, func(token string) string {
		parts := strings.SplitN(token, "_", 3)
		if len(parts) < 2 {
			return "***"
		}

		return parts[0] + "_" + parts[1] + "_***"
	})
	masked = webhookSecretPattern.ReplaceAllString(masked, "whsec_***")
	masked = sha256Pattern.ReplaceAllString(masked, "sha256=***")

	return masked
}

func TextPointer(value *string) *string {
	if value == nil {
		return nil
	}

	masked := Text(*value)
	return &masked
}

func maskValue(value any, parentKey string) any {
	switch typed := value.(type) {
	case map[string]any:
		masked := make(map[string]any, len(typed))
		for key, child := range typed {
			masked[key] = maskValue(child, key)
		}
		return masked
	case []any:
		items := make([]any, len(typed))
		for index, child := range typed {
			items[index] = maskValue(child, parentKey)
		}
		return items
	case string:
		if isSensitiveKey(parentKey) {
			return "***"
		}
		return Text(typed)
	default:
		if isSensitiveKey(parentKey) {
			return "***"
		}
		return value
	}
}

func isSensitiveKey(key string) bool {
	normalized := strings.ToLower(strings.TrimSpace(key))
	normalized = strings.ReplaceAll(normalized, "-", "_")

	switch normalized {
	case "authorization",
		"password",
		"current_password",
		"new_password",
		"access_token",
		"refresh_token",
		"token",
		"token_hash",
		"secret",
		"webhook_secret",
		"webhook_secret_hash",
		"signature_key",
		"x_webhook_signature",
		"card_number",
		"credit_card",
		"cvv",
		"cvc",
		"expiry_month",
		"expiry_year":
		return true
	}

	if strings.Contains(normalized, "password") {
		return true
	}
	if strings.HasSuffix(normalized, "_token") || strings.HasSuffix(normalized, "token") {
		return true
	}
	if strings.HasSuffix(normalized, "_secret") || strings.HasSuffix(normalized, "secret") {
		return true
	}
	if normalized == "signature" || strings.HasSuffix(normalized, "_signature") {
		return true
	}

	return false
}
