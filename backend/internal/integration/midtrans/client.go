package midtrans

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

var ErrServerKeyMissing = errors.New("midtrans server key missing")

type Client struct {
	baseURL                  string
	serverKey                string
	httpClient               *http.Client
	overrideNotificationURLs []string
}

type APIError struct {
	StatusCode int
	Body       []byte
}

func (e *APIError) Error() string {
	return fmt.Sprintf("midtrans api returned status %d", e.StatusCode)
}

type VANumber struct {
	Bank     string `json:"bank"`
	VANumber string `json:"va_number"`
}

type Action struct {
	Name   string `json:"name,omitempty"`
	Method string `json:"method,omitempty"`
	Type   string `json:"type,omitempty"`
	URL    string `json:"url,omitempty"`
}

type ChargeResponse struct {
	StatusCode        string     `json:"status_code"`
	StatusMessage     string     `json:"status_message"`
	TransactionID     string     `json:"transaction_id"`
	OrderID           string     `json:"order_id"`
	MerchantID        string     `json:"merchant_id"`
	GrossAmount       string     `json:"gross_amount"`
	Currency          string     `json:"currency"`
	PaymentType       string     `json:"payment_type"`
	TransactionTime   string     `json:"transaction_time"`
	TransactionStatus string     `json:"transaction_status"`
	VANumbers         []VANumber `json:"va_numbers"`
	FraudStatus       string     `json:"fraud_status"`
	PermataVANumber   string     `json:"permata_va_number"`
	BillKey           string     `json:"bill_key"`
	BillerCode        string     `json:"biller_code"`
	Actions           []Action   `json:"actions"`
	PaymentCode       string     `json:"payment_code"`
	QRString          string     `json:"qr_string"`
}

func NewClient(httpClient *http.Client, baseURL string, serverKey string, overrideNotificationURLs []string) *Client {
	urls := make([]string, 0, len(overrideNotificationURLs))
	for _, value := range overrideNotificationURLs {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			urls = append(urls, trimmed)
		}
	}

	return &Client{
		baseURL:                  strings.TrimRight(baseURL, "/"),
		serverKey:                serverKey,
		httpClient:               httpClient,
		overrideNotificationURLs: urls,
	}
}

func (c *Client) BaseURL() string {
	return c.baseURL
}

func (c *Client) Charge(ctx context.Context, payload any) (ChargeResponse, []byte, int, error) {
	if c.serverKey == "" {
		return ChargeResponse{}, nil, 0, ErrServerKeyMissing
	}

	requestBody, err := json.Marshal(payload)
	if err != nil {
		return ChargeResponse{}, nil, 0, err
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/charge", bytes.NewReader(requestBody))
	if err != nil {
		return ChargeResponse{}, nil, 0, err
	}

	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.serverKey+":")))
	if len(c.overrideNotificationURLs) > 0 {
		request.Header.Set("X-Override-Notification", strings.Join(c.overrideNotificationURLs, ","))
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return ChargeResponse{}, nil, 0, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return ChargeResponse{}, nil, response.StatusCode, err
	}

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return ChargeResponse{}, responseBody, response.StatusCode, &APIError{
			StatusCode: response.StatusCode,
			Body:       responseBody,
		}
	}

	var chargeResponse ChargeResponse
	if err := json.Unmarshal(responseBody, &chargeResponse); err != nil {
		return ChargeResponse{}, responseBody, response.StatusCode, err
	}

	if !isSuccessfulPayloadStatusCode(chargeResponse.StatusCode) {
		apiStatusCode := response.StatusCode
		if parsedStatusCode, err := strconv.Atoi(strings.TrimSpace(chargeResponse.StatusCode)); err == nil {
			apiStatusCode = parsedStatusCode
		}

		return chargeResponse, responseBody, apiStatusCode, &APIError{
			StatusCode: apiStatusCode,
			Body:       responseBody,
		}
	}

	return chargeResponse, responseBody, response.StatusCode, nil
}

func isSuccessfulPayloadStatusCode(statusCode string) bool {
	trimmed := strings.TrimSpace(statusCode)
	if trimmed == "" {
		return true
	}

	return strings.HasPrefix(trimmed, "2")
}
