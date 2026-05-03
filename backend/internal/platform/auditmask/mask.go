package auditmask

import (
	"encoding/base64"
	"encoding/json"
	"regexp"
	"strings"
)

var (
	bearerPattern         = regexp.MustCompile(`(?i)\bBearer\s+[A-Za-z0-9._~+/\-=]+`)
	basicSchemePattern    = regexp.MustCompile(`(?i)\bBasic\b`)
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
	masked = maskBasicAuth(masked)
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

func maskBasicAuth(value string) string {
	if !strings.Contains(strings.ToLower(value), "basic") {
		return value
	}

	var builder strings.Builder
	cursor := 0

	for cursor < len(value) {
		loc := basicSchemePattern.FindStringIndex(value[cursor:])
		if loc == nil {
			builder.WriteString(value[cursor:])
			break
		}

		start := cursor + loc[0]
		schemeEnd := cursor + loc[1]
		tokenStart := schemeEnd
		for tokenStart < len(value) && value[tokenStart] == ' ' {
			tokenStart++
		}
		tokenEnd := tokenStart
		for tokenEnd < len(value) && isBasicTokenChar(value[tokenEnd]) {
			tokenEnd++
		}

		token := value[tokenStart:tokenEnd]
		if isBasicCredentialToken(token) {
			builder.WriteString(value[cursor:start])
			builder.WriteString("Basic ***")
			cursor = tokenEnd
		} else {
			builder.WriteString(value[cursor:schemeEnd])
			cursor = schemeEnd
		}
	}

	return builder.String()
}

func isBasicCredentialToken(token string) bool {
	encodings := []*base64.Encoding{
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	}

	for _, encoding := range encodings {
		decoded, err := encoding.DecodeString(token)
		if err != nil {
			continue
		}
		if strings.Contains(string(decoded), ":") {
			return true
		}
	}

	return false
}

func isBasicTokenChar(value byte) bool {
	return value >= 'a' && value <= 'z' ||
		value >= 'A' && value <= 'Z' ||
		value >= '0' && value <= '9' ||
		value == '+' ||
		value == '/' ||
		value == '='
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
