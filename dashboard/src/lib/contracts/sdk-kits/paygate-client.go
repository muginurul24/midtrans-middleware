package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Client struct {
	BaseURL    string
	APIToken   string
	HTTPClient *http.Client
}

type apiEnvelope struct {
	Success bool                   `json:"success"`
	Data    map[string]any         `json:"data"`
	Error   map[string]any         `json:"error"`
}

func NewClient(baseURL, apiToken string) *Client {
	return &Client{
		BaseURL:  strings.TrimRight(baseURL, "/"),
		APIToken: apiToken,
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) Charge(payload map[string]any, idempotencyKey string) (map[string]any, error) {
	headers := map[string]string{}
	if idempotencyKey != "" {
		headers["Idempotency-Key"] = idempotencyKey
	}

	return c.request("POST", "/v1/transactions/charge", payload, headers)
}

func (c *Client) GetTransaction(orderID string) (map[string]any, error) {
	return c.request("GET", "/v1/transactions/"+url.PathEscape(orderID), nil, nil)
}

func (c *Client) ListAuditLogs(params map[string]string) (map[string]any, error) {
	query := url.Values{}
	for key, value := range params {
		if value == "" {
			continue
		}
		query.Set(key, value)
	}

	path := "/v1/audit-logs"
	if encoded := query.Encode(); encoded != "" {
		path += "?" + encoded
	}

	return c.request("GET", path, nil, nil)
}

func VerifyWebhook(rawBody []byte, timestamp, signature, webhookSecret string, maxSkew time.Duration) (map[string]any, error) {
	if len(rawBody) == 0 || timestamp == "" || signature == "" || webhookSecret == "" {
		return nil, fmt.Errorf("timestamp, signature, raw body, and webhook secret are required")
	}

	unix, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("webhook timestamp is not valid")
	}

	delta := time.Since(time.Unix(unix, 0))
	if delta > maxSkew || delta < -maxSkew {
		return nil, fmt.Errorf("webhook timestamp is too old")
	}

	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(rawBody)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(expected), []byte(signature)) {
		return nil, fmt.Errorf("webhook signature is not valid")
	}

	var payload map[string]any
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return nil, err
	}

	return payload, nil
}

func (c *Client) request(method, path string, body any, extraHeaders map[string]string) (map[string]any, error) {
	var reader io.Reader = http.NoBody
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIToken)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for key, value := range extraHeaders {
		req.Header.Set(key, value)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var envelope apiEnvelope
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 || !envelope.Success {
		return nil, fmt.Errorf("paygate request failed: %s", raw)
	}

	return envelope.Data, nil
}

func main() {
	client := NewClient("https://paygate.digixsolution.net", os.Getenv("PAYGATE_STORE_API_TOKEN"))

	transaction, err := client.Charge(map[string]any{
		"order_id":     "INV-2026-0001",
		"amount":       150000,
		"currency":     "IDR",
		"payment_type": "bank_transfer",
		"bank":         "bca",
		"customer": map[string]any{
			"name":  "Budi",
			"email": "budi@example.com",
			"phone": "+628123456789",
		},
		"items": []map[string]any{
			{
				"id":    "SKU-1",
				"name":  "Kaos PayGate",
				"qty":   1,
				"price": 150000,
			},
		},
	}, "idem_INV-2026-0001")
	if err != nil {
		panic(err)
	}

	fmt.Printf("transaction=%+v\n", transaction)
}
