package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
)

type webhookPayload struct {
	Transaction struct {
		OrderID string `json:"order_id"`
		Status  string `json:"status"`
	} `json:"transaction"`
}

func main() {
	secret := os.Getenv("PAYGATE_WEBHOOK_SECRET")
	if secret == "" {
		log.Fatal("PAYGATE_WEBHOOK_SECRET is required")
	}

	http.HandleFunc("/api/paygate/webhook", func(w http.ResponseWriter, r *http.Request) {
		timestamp := r.Header.Get("X-Webhook-Timestamp")
		signature := r.Header.Get("X-Webhook-Signature")
		if timestamp == "" || signature == "" {
			http.Error(w, `{"error":"missing webhook headers"}`, http.StatusBadRequest)
			return
		}

		value, err := strconv.ParseInt(timestamp, 10, 64)
		if err != nil || time.Since(time.Unix(value, 0)) > 5*time.Minute {
			http.Error(w, `{"error":"webhook timestamp is too old"}`, http.StatusBadRequest)
			return
		}

		rawBody, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, `{"error":"unable to read request body"}`, http.StatusBadRequest)
			return
		}

		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(timestamp))
		mac.Write([]byte("."))
		mac.Write(rawBody)
		expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
		if !hmac.Equal([]byte(signature), []byte(expected)) {
			http.Error(w, `{"error":"invalid webhook signature"}`, http.StatusUnauthorized)
			return
		}

		var payload webhookPayload
		if err := json.Unmarshal(rawBody, &payload); err != nil {
			http.Error(w, `{"error":"invalid json body"}`, http.StatusBadRequest)
			return
		}

		log.Printf("PayGate webhook accepted order=%s status=%s\n", payload.Transaction.OrderID, payload.Transaction.Status)

		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"received":true}`)
	})

	log.Println("PayGate webhook receiver listening on :3000")
	log.Fatal(http.ListenAndServe(":3000", nil))
}
