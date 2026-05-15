package webhook

import (
	"context"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	trxapp "payment-platform/backend/internal/app/transaction"
	"payment-platform/backend/internal/app/webhookdelivery"
	"payment-platform/backend/internal/platform/auditmask"
	platformmetrics "payment-platform/backend/internal/platform/metrics"
	"payment-platform/backend/internal/platform/requestlog"
)

var (
	ErrInvalidPayload   = errors.New("invalid payload")
	ErrInvalidSignature = errors.New("invalid signature")
)

type Service struct {
	db                *pgxpool.Pool
	midtransServerKey string
	deliveryService   *webhookdelivery.Service
	metrics           *platformmetrics.Metrics
}

type MidtransNotification struct {
	TransactionTime   string `json:"transaction_time"`
	TransactionStatus string `json:"transaction_status"`
	TransactionID     string `json:"transaction_id"`
	StatusMessage     string `json:"status_message"`
	StatusCode        string `json:"status_code"`
	SignatureKey      string `json:"signature_key"`
	PaymentType       string `json:"payment_type"`
	OrderID           string `json:"order_id"`
	MerchantID        string `json:"merchant_id"`
	GrossAmount       string `json:"gross_amount"`
	FraudStatus       string `json:"fraud_status"`
	SettlementTime    string `json:"settlement_time"`
}

type ProcessInput struct {
	RequestID string
	RawBody   []byte
}

type ProcessResult struct {
	WebhookID        string  `json:"webhook_id"`
	TransactionID    *string `json:"transaction_id,omitempty"`
	PlatformOrderID  string  `json:"platform_order_id,omitempty"`
	TransactionFound bool    `json:"transaction_found"`
	SignatureValid   bool    `json:"signature_valid"`
	InternalStatus   string  `json:"internal_status,omitempty"`
}

type transactionState struct {
	ID                    string
	StoreID               string
	OrderID               string
	Status                string
	PaymentType           string
	GrossAmount           int64
	Currency              string
	CallbackURL           *string
	Metadata              map[string]any
	MidtransTransactionID *string
	FraudStatus           *string
	PaidAt                *time.Time
	ExpiredAt             *time.Time
	CancelledAt           *time.Time
}

func NewService(db *pgxpool.Pool, midtransServerKey string, deliveryService *webhookdelivery.Service, metrics *platformmetrics.Metrics) *Service {
	return &Service{
		db:                db,
		midtransServerKey: strings.TrimSpace(midtransServerKey),
		deliveryService:   deliveryService,
		metrics:           metrics,
	}
}

func (s *Service) Process(ctx context.Context, input ProcessInput) (ProcessResult, error) {
	startedAt := time.Now()
	outcome := "internal_error"
	defer func() {
		s.metrics.RecordWebhookInbound(outcome)
	}()

	var notification MidtransNotification
	if err := json.Unmarshal(input.RawBody, &notification); err != nil {
		outcome = "invalid_payload"
		s.persistAuditLog(
			ctx,
			nil,
			nil,
			input.RequestID,
			http.StatusBadRequest,
			nil,
			nil,
			int(time.Since(startedAt).Milliseconds()),
			stringPointer(err.Error()),
		)
		return ProcessResult{}, ErrInvalidPayload
	}

	if err := validateNotification(notification); err != nil {
		outcome = "invalid_payload"
		s.persistAuditLog(
			ctx,
			nil,
			nil,
			input.RequestID,
			http.StatusBadRequest,
			input.RawBody,
			buildErrorResponseBody("VALIDATION_ERROR", "Invalid Midtrans webhook payload.", input.RequestID),
			int(time.Since(startedAt).Milliseconds()),
			stringPointer(err.Error()),
		)
		return ProcessResult{}, ErrInvalidPayload
	}

	if !s.verifySignature(notification) {
		outcome = "invalid_signature"
		webhookID, transactionID, storeID := s.insertInvalidWebhook(ctx, notification, input.RawBody)
		requestlog.SetOrderID(ctx, notification.OrderID)
		if transactionID != nil {
			requestlog.SetTransactionID(ctx, *transactionID)
		}
		if storeID != nil {
			requestlog.SetStoreID(ctx, *storeID)
		}
		s.persistAuditLog(
			ctx,
			transactionID,
			storeID,
			input.RequestID,
			http.StatusUnauthorized,
			input.RawBody,
			buildErrorResponseBody("WEBHOOK_SIGNATURE_INVALID", "Invalid Midtrans webhook signature.", input.RequestID),
			int(time.Since(startedAt).Milliseconds()),
			stringPointer(ErrInvalidSignature.Error()),
		)

		return ProcessResult{
			WebhookID:        webhookID,
			PlatformOrderID:  notification.OrderID,
			TransactionID:    transactionID,
			TransactionFound: transactionID != nil,
			SignatureValid:   false,
		}, ErrInvalidSignature
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "begin_tx")
		return ProcessResult{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	webhookID := uuid.NewString()
	rawPayload := jsonText(input.RawBody)

	if _, err := tx.Exec(ctx, `
		INSERT INTO midtrans_webhooks (
			id,
			transaction_id,
			platform_order_id,
			signature_valid,
			transaction_status,
			fraud_status,
			payment_type,
			gross_amount,
			raw_payload
		) VALUES (
			$1, NULL, $2, TRUE, $3, $4, $5, $6, $7::jsonb
		)
	`, webhookID, notification.OrderID, notification.TransactionStatus, nullString(notification.FraudStatus), nullString(notification.PaymentType), notification.GrossAmount, rawPayload); err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "insert_webhook")
		return ProcessResult{}, err
	}
	requestlog.SetOrderID(ctx, notification.OrderID)

	state, found, err := s.getTransactionState(ctx, tx, notification.OrderID)
	if err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "get_transaction_state")
		return ProcessResult{}, err
	}

	if !found {
		outcome = "transaction_not_found"
		if _, err := tx.Exec(ctx, `
			UPDATE midtrans_webhooks
			SET processed_at = now()
			WHERE id = $1
		`, webhookID); err != nil {
			s.metrics.RecordDatabaseError("midtrans_webhook", "mark_webhook_processed")
			return ProcessResult{}, err
		}

		if err := s.insertAuditLogTx(
			ctx,
			tx,
			nil,
			nil,
			input.RequestID,
			http.StatusOK,
			input.RawBody,
			buildSuccessResponseBody(ProcessResult{
				WebhookID:        webhookID,
				PlatformOrderID:  notification.OrderID,
				TransactionFound: false,
				SignatureValid:   true,
			}),
			int(time.Since(startedAt).Milliseconds()),
			stringPointer("transaction not found"),
		); err != nil {
			s.metrics.RecordDatabaseError("midtrans_webhook", "insert_audit_log")
			return ProcessResult{}, err
		}

		if err := tx.Commit(ctx); err != nil {
			s.metrics.RecordDatabaseError("midtrans_webhook", "commit_not_found")
			return ProcessResult{}, err
		}

		return ProcessResult{
			WebhookID:        webhookID,
			PlatformOrderID:  notification.OrderID,
			TransactionFound: false,
			SignatureValid:   true,
		}, nil
	}

	previousStatus := state.Status
	requestlog.SetStoreID(ctx, state.StoreID)
	requestlog.SetTransactionID(ctx, state.ID)
	nextStatus := trxapp.MapMidtransStatus(notification.TransactionStatus, notification.FraudStatus)
	finalStatus := previousStatus
	updateInput := timestampUpdateInput{}

	if trxapp.ShouldApplyStatusUpdate(previousStatus, nextStatus) {
		finalStatus = nextStatus
		updateInput = buildTimestampUpdateInput(state, finalStatus, notification)

		if _, err := tx.Exec(ctx, `
			UPDATE transactions
			SET
				status = $2,
				fraud_status = $3,
				paid_at = COALESCE($4, paid_at),
				expired_at = COALESCE($5, expired_at),
				cancelled_at = COALESCE($6, cancelled_at),
				updated_at = now()
			WHERE id = $1
		`, state.ID, finalStatus, nullString(notification.FraudStatus), updateInput.PaidAt, updateInput.ExpiredAt, updateInput.CancelledAt); err != nil {
			s.metrics.RecordDatabaseError("midtrans_webhook", "update_transaction_status")
			return ProcessResult{}, err
		}
	}

	if _, err := tx.Exec(ctx, `
		UPDATE midtrans_webhooks
		SET transaction_id = $2, processed_at = now()
		WHERE id = $1
	`, webhookID, state.ID); err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "bind_webhook_transaction")
		return ProcessResult{}, err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO transaction_events (
			id,
			transaction_id,
			event_type,
			previous_status,
			new_status,
			source,
			payload
		) VALUES (
			$1, $2, $3, $4, $5, 'midtrans_webhook', $6::jsonb
		)
	`, uuid.NewString(), state.ID, buildEventType(notification.TransactionStatus), previousStatus, finalStatus, rawPayload); err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "insert_transaction_event")
		return ProcessResult{}, err
	}

	deliveryID := ""
	callbackURL := strings.TrimSpace(valueOrEmpty(state.CallbackURL))
	if callbackURL != "" && s.deliveryService != nil {
		deliveryID, err = s.deliveryService.CreateDeliveryTx(ctx, tx, webhookdelivery.CreateDeliveryInput{
			StoreID:           state.StoreID,
			TransactionID:     state.ID,
			MidtransWebhookID: webhookID,
			CallbackURL:       callbackURL,
			Payload: webhookdelivery.StoreCallbackPayload{
				StoreID:       state.StoreID,
				OrderID:       state.OrderID,
				TransactionID: state.ID,
				Status:        finalStatus,
				PaymentType:   state.PaymentType,
				PaymentMethod: paymentMethodFromMetadata(state.Metadata, state.PaymentType),
				Amount:        state.GrossAmount,
				Currency:      state.Currency,
				PaidAt:        finalPaidAt(state, updateInput),
				Midtrans: webhookdelivery.StoreCallbackMidtrans{
					TransactionStatus: notification.TransactionStatus,
					FraudStatus:       strings.TrimSpace(notification.FraudStatus),
					TransactionID:     firstNonEmpty(notification.TransactionID, valueOrEmpty(state.MidtransTransactionID)),
				},
				Metadata: cloneMetadata(state.Metadata),
			},
		})
		if err != nil {
			s.metrics.RecordDatabaseError("midtrans_webhook", "create_delivery")
			return ProcessResult{}, err
		}
	}

	result := ProcessResult{
		WebhookID:        webhookID,
		TransactionID:    stringPointer(state.ID),
		PlatformOrderID:  notification.OrderID,
		TransactionFound: true,
		SignatureValid:   true,
		InternalStatus:   finalStatus,
	}

	if err := s.insertAuditLogTx(
		ctx,
		tx,
		stringPointer(state.ID),
		stringPointer(state.StoreID),
		input.RequestID,
		http.StatusOK,
		input.RawBody,
		buildSuccessResponseBody(result),
		int(time.Since(startedAt).Milliseconds()),
		nil,
	); err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "insert_audit_log")
		return ProcessResult{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "commit")
		return ProcessResult{}, err
	}

	if deliveryID != "" {
		if err := s.deliveryService.Enqueue(ctx, deliveryID, state.StoreID, state.ID); err != nil {
			return ProcessResult{}, err
		}
	}

	outcome = "accepted"
	return result, nil
}

func (s *Service) verifySignature(notification MidtransNotification) bool {
	if s.midtransServerKey == "" {
		return false
	}

	sum := sha512.Sum512([]byte(notification.OrderID + notification.StatusCode + notification.GrossAmount + s.midtransServerKey))
	return strings.EqualFold(hex.EncodeToString(sum[:]), notification.SignatureKey)
}

func validateNotification(notification MidtransNotification) error {
	if strings.TrimSpace(notification.OrderID) == "" ||
		strings.TrimSpace(notification.StatusCode) == "" ||
		strings.TrimSpace(notification.GrossAmount) == "" ||
		strings.TrimSpace(notification.SignatureKey) == "" ||
		strings.TrimSpace(notification.TransactionStatus) == "" {
		return ErrInvalidPayload
	}

	return nil
}

func (s *Service) insertInvalidWebhook(ctx context.Context, notification MidtransNotification, rawBody []byte) (string, *string, *string) {
	webhookID := uuid.NewString()
	transactionID, storeID, err := s.lookupTransactionIdentifiers(ctx, notification.OrderID)
	if err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "lookup_transaction_identifiers")
	}

	if _, err := s.db.Exec(ctx, `
		INSERT INTO midtrans_webhooks (
			id,
			transaction_id,
			platform_order_id,
			signature_valid,
			transaction_status,
			fraud_status,
			payment_type,
			gross_amount,
			raw_payload
		) VALUES (
			$1, $2, $3, FALSE, $4, $5, $6, $7, $8::jsonb
		)
	`, webhookID, transactionID, notification.OrderID, notification.TransactionStatus, nullString(notification.FraudStatus), nullString(notification.PaymentType), notification.GrossAmount, jsonText(rawBody)); err != nil {
		s.metrics.RecordDatabaseError("midtrans_webhook", "insert_invalid_webhook")
	}

	return webhookID, transactionID, storeID
}

func (s *Service) lookupTransactionIdentifiers(ctx context.Context, platformOrderID string) (*string, *string, error) {
	var transactionID string
	var storeID string

	err := s.db.QueryRow(ctx, `
		SELECT id::text, store_id::text
		FROM transactions
		WHERE platform_order_id = $1
	`, platformOrderID).Scan(&transactionID, &storeID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, nil
		}

		return nil, nil, err
	}

	return stringPointer(transactionID), stringPointer(storeID), nil
}

func (s *Service) getTransactionState(ctx context.Context, tx pgx.Tx, platformOrderID string) (transactionState, bool, error) {
	var item transactionState
	err := tx.QueryRow(ctx, `
		SELECT
			id::text,
			store_id::text,
			order_id,
			status,
			payment_type,
			gross_amount,
			currency,
			callback_url,
			metadata,
			midtrans_transaction_id,
			fraud_status,
			paid_at,
			expired_at,
			cancelled_at
		FROM transactions
		WHERE platform_order_id = $1
		FOR UPDATE
	`, platformOrderID).Scan(
		&item.ID,
		&item.StoreID,
		&item.OrderID,
		&item.Status,
		&item.PaymentType,
		&item.GrossAmount,
		&item.Currency,
		&item.CallbackURL,
		&item.Metadata,
		&item.MidtransTransactionID,
		&item.FraudStatus,
		&item.PaidAt,
		&item.ExpiredAt,
		&item.CancelledAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return transactionState{}, false, nil
		}

		return transactionState{}, false, err
	}

	return item, true, nil
}

type timestampUpdateInput struct {
	PaidAt      *time.Time
	ExpiredAt   *time.Time
	CancelledAt *time.Time
}

func buildTimestampUpdateInput(current transactionState, status string, notification MidtransNotification) timestampUpdateInput {
	switch status {
	case "paid":
		if current.PaidAt == nil {
			if settledAt := parseMidtransTime(notification.SettlementTime); settledAt != nil {
				return timestampUpdateInput{PaidAt: settledAt}
			}

			return timestampUpdateInput{PaidAt: parseMidtransTime(notification.TransactionTime)}
		}
	case "expired":
		if current.ExpiredAt == nil {
			return timestampUpdateInput{ExpiredAt: parseMidtransTime(notification.TransactionTime)}
		}
	case "cancelled":
		if current.CancelledAt == nil {
			return timestampUpdateInput{CancelledAt: parseMidtransTime(notification.TransactionTime)}
		}
	}

	return timestampUpdateInput{}
}

func finalPaidAt(current transactionState, update timestampUpdateInput) *time.Time {
	if update.PaidAt != nil {
		return update.PaidAt
	}

	return current.PaidAt
}

func parseMidtransTime(value string) *time.Time {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	location := time.FixedZone("WIB", 7*60*60)
	parsed, err := time.ParseInLocation("2006-01-02 15:04:05", trimmed, location)
	if err != nil {
		return nil
	}

	return &parsed
}

func buildEventType(transactionStatus string) string {
	trimmed := strings.TrimSpace(transactionStatus)
	if trimmed == "" {
		return "midtrans.notification"
	}

	return "midtrans." + strings.ToLower(trimmed)
}

func (s *Service) persistAuditLog(ctx context.Context, transactionID *string, storeID *string, requestID string, statusCode int, requestBody []byte, responseBody []byte, durationMS int, errorMessage *string) {
	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (
			id,
			store_id,
			transaction_id,
			request_id,
			actor_type,
			direction,
			method,
			url,
			status_code,
			request_headers,
			request_body,
			response_headers,
			response_body,
			error_message,
			duration_ms
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'midtrans_webhook', 'inbound', 'POST', '/v1/webhooks/midtrans', $4,
			'{}'::jsonb, $5::jsonb, '{}'::jsonb, $6::jsonb, $7, $8
		)
	`, storeID, transactionID, requestID, statusCode, auditmask.JSONText(requestBody), auditmask.JSONText(responseBody), auditmask.TextPointer(errorMessage), durationMS)
}

func (s *Service) insertAuditLogTx(ctx context.Context, tx pgx.Tx, transactionID *string, storeID *string, requestID string, statusCode int, requestBody []byte, responseBody []byte, durationMS int, errorMessage *string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO audit_logs (
			id,
			store_id,
			transaction_id,
			request_id,
			actor_type,
			direction,
			method,
			url,
			status_code,
			request_headers,
			request_body,
			response_headers,
			response_body,
			error_message,
			duration_ms
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'midtrans_webhook', 'inbound', 'POST', '/v1/webhooks/midtrans', $4,
			'{}'::jsonb, $5::jsonb, '{}'::jsonb, $6::jsonb, $7, $8
		)
	`, storeID, transactionID, requestID, statusCode, auditmask.JSONText(requestBody), auditmask.JSONText(responseBody), auditmask.TextPointer(errorMessage), durationMS)

	return err
}

func buildSuccessResponseBody(result ProcessResult) []byte {
	body, _ := json.Marshal(map[string]any{
		"success": true,
		"data":    result,
	})

	return body
}

func buildErrorResponseBody(code string, message string, requestID string) []byte {
	body, _ := json.Marshal(map[string]any{
		"success": false,
		"error": map[string]any{
			"code":       code,
			"message":    message,
			"request_id": requestID,
			"details":    map[string]any{},
		},
	})

	return body
}

func jsonText(value []byte) string {
	trimmed := strings.TrimSpace(string(value))
	if trimmed == "" {
		return "{}"
	}

	return trimmed
}

func stringPointer(value string) *string {
	return &value
}

func nullString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}

	return ""
}

func cloneMetadata(source map[string]any) map[string]any {
	if len(source) == 0 {
		return map[string]any{}
	}

	cloned := make(map[string]any, len(source))
	for key, value := range source {
		cloned[key] = value
	}

	return cloned
}

func paymentMethodFromMetadata(metadata map[string]any, paymentType string) string {
	if value, ok := metadata["paymentMethod"].(string); ok {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}

	switch strings.ToLower(strings.TrimSpace(paymentType)) {
	case "permata":
		return "permata"
	case "echannel":
		return "mandiri"
	case "gopay":
		return "gopay"
	case "qris":
		return "qris_gopay"
	default:
		return strings.ToLower(strings.TrimSpace(paymentType))
	}
}
