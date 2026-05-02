package webhookdelivery

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"payment-platform/backend/internal/platform/auditmask"
	platformmetrics "payment-platform/backend/internal/platform/metrics"
	"payment-platform/backend/internal/platform/security"
	"payment-platform/backend/internal/worker/tasks"
)

const (
	EventTransactionUpdated = "transaction.updated"
	QueueWebhook            = "webhook"
	defaultRetryDelay       = 20 * time.Second
	defaultMaxAttempts      = 10
)

var (
	ErrNotFound      = errors.New("webhook delivery not found")
	ErrStoreNotFound = errors.New("store not found")
	ErrInvalidState  = errors.New("invalid delivery state")
)

type Service struct {
	db            *pgxpool.Pool
	asynqClient   *asynq.Client
	httpClient    *http.Client
	webhookPepper string
	metrics       *platformmetrics.Metrics
	retryDelay    time.Duration
	maxAttempts   int
}

type StoreCallbackPayload struct {
	Event         string                `json:"event"`
	WebhookID     string                `json:"webhook_id"`
	StoreID       string                `json:"store_id"`
	OrderID       string                `json:"order_id"`
	TransactionID string                `json:"transaction_id"`
	Status        string                `json:"status"`
	PaymentType   string                `json:"payment_type"`
	Amount        int64                 `json:"amount"`
	Currency      string                `json:"currency"`
	PaidAt        *time.Time            `json:"paid_at"`
	Midtrans      StoreCallbackMidtrans `json:"midtrans"`
	Metadata      map[string]any        `json:"metadata"`
}

type StoreCallbackMidtrans struct {
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status,omitempty"`
	TransactionID     string `json:"transaction_id,omitempty"`
}

type CreateDeliveryInput struct {
	StoreID           string
	TransactionID     string
	MidtransWebhookID string
	CallbackURL       string
	Payload           StoreCallbackPayload
}

type Delivery struct {
	ID                string         `json:"id"`
	StoreID           string         `json:"store_id"`
	TransactionID     *string        `json:"transaction_id,omitempty"`
	MidtransWebhookID *string        `json:"midtrans_webhook_id,omitempty"`
	OrderID           *string        `json:"order_id,omitempty"`
	CallbackURL       string         `json:"callback_url"`
	EventType         string         `json:"event_type"`
	Status            string         `json:"status"`
	AttemptCount      int            `json:"attempt_count"`
	NextAttemptAt     *time.Time     `json:"next_attempt_at,omitempty"`
	DeliveredAt       *time.Time     `json:"delivered_at,omitempty"`
	FailedAt          *time.Time     `json:"failed_at,omitempty"`
	Payload           map[string]any `json:"payload,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
}

type DeliveryAttempt struct {
	ID             string         `json:"id"`
	AttemptNumber  int            `json:"attempt_number"`
	RequestHeaders map[string]any `json:"request_headers"`
	RequestBody    map[string]any `json:"request_body"`
	ResponseStatus *int           `json:"response_status,omitempty"`
	ResponseBody   *string        `json:"response_body,omitempty"`
	ErrorMessage   *string        `json:"error_message,omitempty"`
	DurationMS     *int           `json:"duration_ms,omitempty"`
	AttemptedAt    time.Time      `json:"attempted_at"`
}

type DeliveryDetail struct {
	Delivery Delivery          `json:"delivery"`
	Attempts []DeliveryAttempt `json:"attempts"`
}

type deliveryState struct {
	ID              string
	StoreID         string
	TransactionID   *string
	CallbackURL     string
	PayloadRaw      string
	Status          string
	AttemptCount    int
	EncryptedSecret *string
}

func NewService(db *pgxpool.Pool, asynqClient *asynq.Client, httpClient *http.Client, webhookPepper string, metrics *platformmetrics.Metrics) *Service {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	return &Service{
		db:            db,
		asynqClient:   asynqClient,
		httpClient:    httpClient,
		webhookPepper: webhookPepper,
		metrics:       metrics,
		retryDelay:    defaultRetryDelay,
		maxAttempts:   defaultMaxAttempts,
	}
}

func RetryDelay() time.Duration {
	return defaultRetryDelay
}

func MaxAttempts() int {
	return defaultMaxAttempts
}

func (s *Service) CreateDeliveryTx(ctx context.Context, tx pgx.Tx, input CreateDeliveryInput) (string, error) {
	callbackURL := strings.TrimSpace(input.CallbackURL)
	if callbackURL == "" {
		return "", ErrInvalidState
	}

	deliveryID := uuid.NewString()
	payload := input.Payload
	payload.Event = EventTransactionUpdated
	payload.WebhookID = deliveryID
	if payload.Metadata == nil {
		payload.Metadata = map[string]any{}
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO webhook_deliveries (
			id,
			store_id,
			transaction_id,
			midtrans_webhook_id,
			callback_url,
			event_type,
			payload,
			status,
			attempt_count,
			next_attempt_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7::jsonb, 'pending', 0, now()
		)
	`, deliveryID, input.StoreID, input.TransactionID, input.MidtransWebhookID, callbackURL, EventTransactionUpdated, string(payloadJSON)); err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "create_delivery")
		return "", err
	}

	return deliveryID, nil
}

func (s *Service) Enqueue(ctx context.Context, deliveryID string, storeID string, transactionID string) error {
	if s.asynqClient == nil {
		s.metrics.RecordRedisError("webhook_delivery", "enqueue_unavailable")
		return fmt.Errorf("asynq client unavailable")
	}

	payload, err := json.Marshal(tasks.WebhookDeliverPayload{
		WebhookDeliveryID: deliveryID,
		StoreID:           storeID,
		TransactionID:     transactionID,
	})
	if err != nil {
		return err
	}

	task := asynq.NewTask(tasks.TypeWebhookDeliver, payload)
	_, err = s.asynqClient.EnqueueContext(
		ctx,
		task,
		asynq.Queue(QueueWebhook),
		asynq.MaxRetry(s.maxAttempts-1),
	)
	if err != nil {
		s.metrics.RecordRedisError("webhook_delivery", "enqueue")
	}
	return err
}

func (s *Service) ProcessTask(ctx context.Context, payload tasks.WebhookDeliverPayload) error {
	if strings.TrimSpace(payload.WebhookDeliveryID) == "" {
		return asynq.SkipRetry
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "begin_tx")
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	state, err := s.loadDeliveryStateForUpdate(ctx, tx, payload.WebhookDeliveryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return asynq.SkipRetry
		}
		s.metrics.RecordDatabaseError("webhook_delivery", "load_delivery_state")
		return err
	}

	if state.Status == "success" {
		if err := tx.Commit(ctx); err != nil {
			s.metrics.RecordDatabaseError("webhook_delivery", "commit_success_noop")
			return err
		}
		return nil
	}

	attemptNumber := state.AttemptCount + 1
	requestID := buildAttemptRequestID(state.ID, attemptNumber)
	requestHeaders := map[string]string{
		"Content-Type":        "application/json",
		"X-Webhook-Id":        state.ID,
		"X-Webhook-Timestamp": strconv.FormatInt(time.Now().Unix(), 10),
	}

	permanentError := ""
	webhookSecret := ""
	if strings.TrimSpace(state.CallbackURL) == "" {
		permanentError = "missing callback URL"
	} else if state.EncryptedSecret == nil || strings.TrimSpace(*state.EncryptedSecret) == "" {
		permanentError = "missing store webhook secret"
	} else {
		webhookSecret, err = security.DecryptString(s.webhookPepper, *state.EncryptedSecret)
		if err != nil {
			permanentError = "failed to decrypt store webhook secret"
		}
	}

	if permanentError == "" {
		signature := signPayload(requestHeaders["X-Webhook-Timestamp"], state.PayloadRaw, webhookSecret)
		requestHeaders["X-Webhook-Signature"] = "sha256=" + signature
	}

	attemptStartedAt := time.Now()
	var responseStatus *int
	var responseBody *string
	var errorMessage *string
	success := false

	if permanentError != "" {
		errorMessage = stringPointer(permanentError)
	} else {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, state.CallbackURL, strings.NewReader(state.PayloadRaw))
		if err != nil {
			errorMessage = stringPointer(err.Error())
		} else {
			for key, value := range requestHeaders {
				req.Header.Set(key, value)
			}

			resp, err := s.httpClient.Do(req)
			if err != nil {
				errorMessage = stringPointer(err.Error())
			} else {
				defer resp.Body.Close()

				body, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
				status := resp.StatusCode
				responseStatus = &status
				responseText := string(body)
				if readErr != nil {
					responseText = fmt.Sprintf("failed to read response body: %v", readErr)
				}
				responseBody = &responseText
				success = resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusMultipleChoices
				if !success {
					errorMessage = stringPointer(fmt.Sprintf("callback returned status %d", resp.StatusCode))
				}
			}
		}
	}

	durationMS := int(time.Since(attemptStartedAt).Milliseconds())
	headersJSON := auditmask.HeadersText(requestHeaders)
	responseAudit := auditmask.MarshalText(map[string]any{
		"status_code": nullableIntValue(responseStatus),
		"body":        nullableStringValue(auditmask.TextPointer(responseBody)),
	})

	if err := s.insertAttemptTx(ctx, tx, insertAttemptInput{
		DeliveryID:     state.ID,
		AttemptNumber:  attemptNumber,
		RequestHeaders: headersJSON,
		RequestBody:    auditmask.JSONStringText(state.PayloadRaw),
		ResponseStatus: responseStatus,
		ResponseBody:   auditmask.TextPointer(responseBody),
		ErrorMessage:   auditmask.TextPointer(errorMessage),
		DurationMS:     durationMS,
	}); err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "insert_attempt")
		return err
	}

	if err := s.insertAuditLogTx(ctx, tx, insertAuditLogInput{
		RequestID:      requestID,
		StoreID:        state.StoreID,
		TransactionID:  state.TransactionID,
		ActorID:        state.ID,
		URL:            state.CallbackURL,
		StatusCode:     responseStatus,
		RequestHeaders: headersJSON,
		RequestBody:    auditmask.JSONStringText(state.PayloadRaw),
		ResponseBody:   responseAudit,
		ErrorMessage:   auditmask.TextPointer(errorMessage),
		DurationMS:     durationMS,
	}); err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "insert_audit_log")
		return err
	}

	now := time.Now().UTC()
	if success {
		if _, err := tx.Exec(ctx, `
			UPDATE webhook_deliveries
			SET
				status = 'success',
				attempt_count = $2,
				next_attempt_at = NULL,
				delivered_at = $3,
				failed_at = NULL,
				updated_at = now()
			WHERE id = $1
		`, state.ID, attemptNumber, now); err != nil {
			s.metrics.RecordDatabaseError("webhook_delivery", "mark_success")
			return err
		}

		if err := tx.Commit(ctx); err != nil {
			s.metrics.RecordDatabaseError("webhook_delivery", "commit_success")
			return err
		}
		s.metrics.RecordWebhookDelivery("success")
		return nil
	}

	finalFailure := permanentError != "" || attemptNumber >= s.maxAttempts
	if finalFailure {
		if _, err := tx.Exec(ctx, `
			UPDATE webhook_deliveries
			SET
				status = 'failed_permanently',
				attempt_count = $2,
				next_attempt_at = NULL,
				failed_at = $3,
				updated_at = now()
			WHERE id = $1
		`, state.ID, attemptNumber, now); err != nil {
			s.metrics.RecordDatabaseError("webhook_delivery", "mark_failed_permanently")
			return err
		}

		if err := tx.Commit(ctx); err != nil {
			s.metrics.RecordDatabaseError("webhook_delivery", "commit_failed_permanently")
			return err
		}
		s.metrics.RecordWebhookDelivery("failed_permanently")
		return nil
	}

	nextAttemptAt := now.Add(s.retryDelay)
	if _, err := tx.Exec(ctx, `
		UPDATE webhook_deliveries
		SET
			status = 'retrying',
			attempt_count = $2,
			next_attempt_at = $3,
			updated_at = now()
		WHERE id = $1
	`, state.ID, attemptNumber, nextAttemptAt); err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "mark_retrying")
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "commit_retrying")
		return err
	}
	s.metrics.RecordWebhookRetry("automatic")

	if errorMessage != nil {
		return errors.New(*errorMessage)
	}
	return errors.New("webhook delivery failed")
}

func (s *Service) ListForStore(ctx context.Context, userID string, storeID string, limit int) ([]Delivery, error) {
	exists, err := s.userOwnsStore(ctx, userID, storeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrStoreNotFound
	}

	rows, err := s.db.Query(ctx, `
		SELECT
			wd.id::text,
			wd.store_id::text,
			wd.transaction_id::text,
			wd.midtrans_webhook_id::text,
			t.order_id,
			wd.callback_url,
			wd.event_type,
			wd.status,
			wd.attempt_count,
			wd.next_attempt_at,
			wd.delivered_at,
			wd.failed_at,
			wd.created_at,
			wd.updated_at
		FROM webhook_deliveries wd
		LEFT JOIN transactions t ON t.id = wd.transaction_id
		WHERE wd.store_id = $1
		ORDER BY wd.created_at DESC
		LIMIT $2
	`, storeID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Delivery
	for rows.Next() {
		var item Delivery
		if err := rows.Scan(
			&item.ID,
			&item.StoreID,
			&item.TransactionID,
			&item.MidtransWebhookID,
			&item.OrderID,
			&item.CallbackURL,
			&item.EventType,
			&item.Status,
			&item.AttemptCount,
			&item.NextAttemptAt,
			&item.DeliveredAt,
			&item.FailedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}

		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *Service) GetByUser(ctx context.Context, userID string, deliveryID string) (DeliveryDetail, error) {
	delivery, err := s.getDeliveryByUser(ctx, userID, deliveryID, true)
	if err != nil {
		return DeliveryDetail{}, err
	}

	rows, err := s.db.Query(ctx, `
		SELECT
			id::text,
			attempt_number,
			request_headers,
			request_body,
			response_status,
			response_body,
			error_message,
			duration_ms,
			attempted_at
		FROM webhook_delivery_attempts
		WHERE webhook_delivery_id = $1
		ORDER BY attempted_at ASC, attempt_number ASC
	`, deliveryID)
	if err != nil {
		return DeliveryDetail{}, err
	}
	defer rows.Close()

	var attempts []DeliveryAttempt
	for rows.Next() {
		var attempt DeliveryAttempt
		if err := rows.Scan(
			&attempt.ID,
			&attempt.AttemptNumber,
			&attempt.RequestHeaders,
			&attempt.RequestBody,
			&attempt.ResponseStatus,
			&attempt.ResponseBody,
			&attempt.ErrorMessage,
			&attempt.DurationMS,
			&attempt.AttemptedAt,
		); err != nil {
			return DeliveryDetail{}, err
		}

		if attempt.RequestHeaders == nil {
			attempt.RequestHeaders = map[string]any{}
		}
		if attempt.RequestBody == nil {
			attempt.RequestBody = map[string]any{}
		}

		attempts = append(attempts, attempt)
	}

	return DeliveryDetail{
		Delivery: delivery,
		Attempts: attempts,
	}, rows.Err()
}

func (s *Service) ResendByUser(ctx context.Context, userID string, deliveryID string) (Delivery, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "begin_resend_tx")
		return Delivery{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var delivery Delivery
	err = tx.QueryRow(ctx, `
		SELECT
			wd.id::text,
			wd.store_id::text,
			wd.transaction_id::text,
			wd.midtrans_webhook_id::text,
			(
				SELECT t.order_id
				FROM transactions t
				WHERE t.id = wd.transaction_id
			),
			wd.callback_url,
			wd.event_type,
			wd.status,
			wd.attempt_count,
			wd.next_attempt_at,
			wd.delivered_at,
			wd.failed_at,
			wd.created_at,
			wd.updated_at
		FROM webhook_deliveries wd
		INNER JOIN stores s ON s.id = wd.store_id
		WHERE wd.id = $1 AND s.user_id = $2
		FOR UPDATE
	`, deliveryID, userID).Scan(
		&delivery.ID,
		&delivery.StoreID,
		&delivery.TransactionID,
		&delivery.MidtransWebhookID,
		&delivery.OrderID,
		&delivery.CallbackURL,
		&delivery.EventType,
		&delivery.Status,
		&delivery.AttemptCount,
		&delivery.NextAttemptAt,
		&delivery.DeliveredAt,
		&delivery.FailedAt,
		&delivery.CreatedAt,
		&delivery.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Delivery{}, ErrNotFound
		}
		s.metrics.RecordDatabaseError("webhook_delivery", "load_resend_delivery")
		return Delivery{}, err
	}

	if delivery.Status != "failed_permanently" {
		return Delivery{}, ErrInvalidState
	}

	if _, err := tx.Exec(ctx, `
		UPDATE webhook_deliveries
		SET
			status = 'pending',
			attempt_count = 0,
			next_attempt_at = now(),
			delivered_at = NULL,
			failed_at = NULL,
			updated_at = now()
		WHERE id = $1
	`, delivery.ID); err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "resend_reset_delivery")
		return Delivery{}, err
	}
	now := time.Now().UTC()
	delivery.Status = "pending"
	delivery.AttemptCount = 0
	delivery.NextAttemptAt = &now
	delivery.DeliveredAt = nil
	delivery.FailedAt = nil
	delivery.UpdatedAt = now

	if err := tx.Commit(ctx); err != nil {
		s.metrics.RecordDatabaseError("webhook_delivery", "commit_resend")
		return Delivery{}, err
	}

	if delivery.TransactionID == nil {
		return Delivery{}, ErrInvalidState
	}

	if err := s.Enqueue(ctx, delivery.ID, delivery.StoreID, *delivery.TransactionID); err != nil {
		return Delivery{}, err
	}
	s.metrics.RecordWebhookRetry("manual_resend")

	return delivery, nil
}

func (s *Service) loadDeliveryStateForUpdate(ctx context.Context, tx pgx.Tx, deliveryID string) (deliveryState, error) {
	var state deliveryState
	err := tx.QueryRow(ctx, `
		SELECT
			wd.id::text,
			wd.store_id::text,
			wd.transaction_id::text,
			wd.callback_url,
			wd.payload::text,
			wd.status,
			wd.attempt_count,
			s.webhook_secret_hash
		FROM webhook_deliveries wd
		INNER JOIN stores s ON s.id = wd.store_id
		WHERE wd.id = $1
		FOR UPDATE
	`, deliveryID).Scan(
		&state.ID,
		&state.StoreID,
		&state.TransactionID,
		&state.CallbackURL,
		&state.PayloadRaw,
		&state.Status,
		&state.AttemptCount,
		&state.EncryptedSecret,
	)
	return state, err
}

type insertAttemptInput struct {
	DeliveryID     string
	AttemptNumber  int
	RequestHeaders string
	RequestBody    string
	ResponseStatus *int
	ResponseBody   *string
	ErrorMessage   *string
	DurationMS     int
}

func (s *Service) insertAttemptTx(ctx context.Context, tx pgx.Tx, input insertAttemptInput) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO webhook_delivery_attempts (
			id,
			webhook_delivery_id,
			attempt_number,
			request_headers,
			request_body,
			response_status,
			response_body,
			error_message,
			duration_ms
		) VALUES (
			gen_random_uuid(), $1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8
		)
	`, input.DeliveryID, input.AttemptNumber, input.RequestHeaders, input.RequestBody, input.ResponseStatus, input.ResponseBody, input.ErrorMessage, input.DurationMS)
	return err
}

type insertAuditLogInput struct {
	RequestID      string
	StoreID        string
	TransactionID  *string
	ActorID        string
	URL            string
	StatusCode     *int
	RequestHeaders string
	RequestBody    string
	ResponseBody   string
	ErrorMessage   *string
	DurationMS     int
}

func (s *Service) insertAuditLogTx(ctx context.Context, tx pgx.Tx, input insertAuditLogInput) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO audit_logs (
			id,
			store_id,
			transaction_id,
			request_id,
			actor_type,
			actor_id,
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
			gen_random_uuid(), $1, $2, $3, 'webhook_delivery', $4, 'outbound', 'POST', $5, $6,
			$7::jsonb, $8::jsonb, '{}'::jsonb, $9::jsonb, $10, $11
		)
	`, input.StoreID, input.TransactionID, input.RequestID, input.ActorID, input.URL, input.StatusCode, input.RequestHeaders, input.RequestBody, input.ResponseBody, input.ErrorMessage, input.DurationMS)
	return err
}

func (s *Service) userOwnsStore(ctx context.Context, userID string, storeID string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM stores
			WHERE id = $1 AND user_id = $2
		)
	`, storeID, userID).Scan(&exists)
	return exists, err
}

func (s *Service) getDeliveryByUser(ctx context.Context, userID string, deliveryID string, includePayload bool) (Delivery, error) {
	var item Delivery

	selectPayload := "'{}'::jsonb"
	scanPayload := false
	if includePayload {
		selectPayload = "wd.payload"
		scanPayload = true
	}

	query := fmt.Sprintf(`
		SELECT
			wd.id::text,
			wd.store_id::text,
			wd.transaction_id::text,
			wd.midtrans_webhook_id::text,
			t.order_id,
			wd.callback_url,
			wd.event_type,
			wd.status,
			wd.attempt_count,
			wd.next_attempt_at,
			wd.delivered_at,
			wd.failed_at,
			%s,
			wd.created_at,
			wd.updated_at
		FROM webhook_deliveries wd
		INNER JOIN stores s ON s.id = wd.store_id
		LEFT JOIN transactions t ON t.id = wd.transaction_id
		WHERE wd.id = $1 AND s.user_id = $2
	`, selectPayload)

	if scanPayload {
		if err := s.db.QueryRow(ctx, query, deliveryID, userID).Scan(
			&item.ID,
			&item.StoreID,
			&item.TransactionID,
			&item.MidtransWebhookID,
			&item.OrderID,
			&item.CallbackURL,
			&item.EventType,
			&item.Status,
			&item.AttemptCount,
			&item.NextAttemptAt,
			&item.DeliveredAt,
			&item.FailedAt,
			&item.Payload,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return Delivery{}, ErrNotFound
			}
			return Delivery{}, err
		}
	} else {
		var ignoredPayload map[string]any
		if err := s.db.QueryRow(ctx, query, deliveryID, userID).Scan(
			&item.ID,
			&item.StoreID,
			&item.TransactionID,
			&item.MidtransWebhookID,
			&item.OrderID,
			&item.CallbackURL,
			&item.EventType,
			&item.Status,
			&item.AttemptCount,
			&item.NextAttemptAt,
			&item.DeliveredAt,
			&item.FailedAt,
			&ignoredPayload,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return Delivery{}, ErrNotFound
			}
			return Delivery{}, err
		}
	}

	if item.Payload == nil {
		item.Payload = map[string]any{}
	}

	return item, nil
}

func signPayload(timestamp string, rawBody string, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write([]byte(rawBody))
	return hex.EncodeToString(mac.Sum(nil))
}

func buildAttemptRequestID(deliveryID string, attemptNumber int) string {
	return fmt.Sprintf("whd_%s_%d", deliveryID, attemptNumber)
}

func nullableIntValue(value *int) any {
	if value == nil {
		return nil
	}
	return *value
}

func nullableStringValue(value *string) any {
	if value == nil {
		return nil
	}
	return *value
}

func stringPointer(value string) *string {
	return &value
}
