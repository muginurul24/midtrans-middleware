package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type midtransChargeRequest struct {
	PaymentType        string `json:"payment_type"`
	TransactionDetails struct {
		OrderID     string `json:"order_id"`
		GrossAmount int64  `json:"gross_amount"`
	} `json:"transaction_details"`
	BankTransfer map[string]any `json:"bank_transfer"`
}

type midtransChargeResponse struct {
	StatusCode        string              `json:"status_code"`
	StatusMessage     string              `json:"status_message"`
	TransactionID     string              `json:"transaction_id"`
	OrderID           string              `json:"order_id"`
	MerchantID        string              `json:"merchant_id"`
	GrossAmount       string              `json:"gross_amount"`
	Currency          string              `json:"currency"`
	PaymentType       string              `json:"payment_type"`
	TransactionTime   string              `json:"transaction_time"`
	TransactionStatus string              `json:"transaction_status"`
	VANumbers         []map[string]string `json:"va_numbers,omitempty"`
	FraudStatus       string              `json:"fraud_status,omitempty"`
	PermataVANumber   string              `json:"permata_va_number,omitempty"`
	BillKey           string              `json:"bill_key,omitempty"`
	BillerCode        string              `json:"biller_code,omitempty"`
}

type callbackState struct {
	mu       sync.Mutex
	filepath string
	Count    int               `json:"count"`
	Requests []callbackRequest `json:"requests"`
}

type callbackRequest struct {
	Method     string            `json:"method"`
	Path       string            `json:"path"`
	Headers    map[string]string `json:"headers"`
	Body       any               `json:"body"`
	BodyRaw    string            `json:"body_raw"`
	ReceivedAt string            `json:"received_at"`
}

func main() {
	mode := strings.TrimSpace(os.Getenv("SMOKE_MODE"))
	addr := strings.TrimSpace(os.Getenv("SMOKE_ADDR"))
	if addr == "" {
		addr = ":18082"
	}

	switch mode {
	case "midtrans":
		must(runMidtrans(addr))
	case "callback":
		outputFile := strings.TrimSpace(os.Getenv("SMOKE_OUTPUT_FILE"))
		if outputFile == "" {
			must(fmt.Errorf("SMOKE_OUTPUT_FILE must be set for callback mode"))
		}
		must(runCallback(addr, outputFile))
	default:
		must(fmt.Errorf("unsupported SMOKE_MODE %q", mode))
	}
}

func runMidtrans(addr string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	mux.HandleFunc("/charge", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		defer r.Body.Close()

		var request midtransChargeRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&request); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"status_code":    "400",
				"status_message": "invalid payload",
			})
			return
		}

		if strings.TrimSpace(request.TransactionDetails.OrderID) == "" || request.TransactionDetails.GrossAmount <= 0 {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"status_code":    "400",
				"status_message": "missing transaction details",
			})
			return
		}

		now := time.Now().UTC().Format("2006-01-02 15:04:05")
		response := midtransChargeResponse{
			StatusCode:        "201",
			StatusMessage:     "Success, transaction is found",
			TransactionID:     uuid.NewString(),
			OrderID:           request.TransactionDetails.OrderID,
			MerchantID:        "GSMOKE",
			GrossAmount:       fmt.Sprintf("%d", request.TransactionDetails.GrossAmount),
			Currency:          "IDR",
			PaymentType:       strings.TrimSpace(request.PaymentType),
			TransactionTime:   now,
			TransactionStatus: "pending",
			FraudStatus:       "accept",
		}

		switch strings.ToLower(stringValue(request.BankTransfer["bank"])) {
		case "permata":
			response.PermataVANumber = "9876543210123456"
		case "mandiri":
			response.BillKey = "123456789012"
			response.BillerCode = "70012"
		default:
			response.VANumbers = []map[string]string{{
				"bank":      strings.ToLower(stringValue(request.BankTransfer["bank"])),
				"va_number": "1234567890123456",
			}}
		}

		writeJSON(w, http.StatusCreated, response)
	})

	return http.ListenAndServe(addr, mux)
}

func runCallback(addr string, outputFile string) error {
	state := &callbackState{
		filepath: outputFile,
		Requests: []callbackRequest{},
	}
	if err := state.persist(); err != nil {
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	})
	mux.HandleFunc("/received", func(w http.ResponseWriter, r *http.Request) {
		state.mu.Lock()
		defer state.mu.Unlock()
		writeJSON(w, http.StatusOK, state)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		defer r.Body.Close()

		body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			return
		}

		payload := any(map[string]any{})
		if len(body) > 0 {
			var decoded any
			if err := json.Unmarshal(body, &decoded); err == nil {
				payload = decoded
			} else {
				payload = nil
			}
		}

		request := callbackRequest{
			Method:     r.Method,
			Path:       r.URL.Path,
			Headers:    flattenHeaders(r.Header),
			Body:       payload,
			BodyRaw:    strings.TrimSpace(string(body)),
			ReceivedAt: time.Now().UTC().Format(time.RFC3339),
		}

		state.mu.Lock()
		state.Count++
		state.Requests = append(state.Requests, request)
		err = state.persist()
		state.mu.Unlock()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}

		writeJSON(w, http.StatusOK, map[string]any{"received": true})
	})

	return http.ListenAndServe(addr, mux)
}

func (s *callbackState) persist() error {
	if err := os.MkdirAll(filepath.Dir(s.filepath), 0o755); err != nil {
		return err
	}

	content, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.filepath, content, 0o644)
}

func flattenHeaders(headers http.Header) map[string]string {
	values := make(map[string]string, len(headers))
	for key, value := range headers {
		values[strings.ToLower(key)] = strings.Join(value, ", ")
	}

	return values
}

func stringValue(value any) string {
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	default:
		return ""
	}
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func must(err error) {
	if err == nil {
		return
	}

	fmt.Fprintf(os.Stderr, "smoke-support failed: %v\n", err)
	os.Exit(1)
}
