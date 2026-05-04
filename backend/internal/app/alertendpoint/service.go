package alertendpoint

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	platformmetrics "payment-platform/backend/internal/platform/metrics"
	"payment-platform/backend/internal/platform/security"
	"payment-platform/backend/internal/worker/tasks"
)

const (
	ChannelWebhook          = "webhook"
	ChannelSlackWebhook     = "slack_webhook"
	ChannelDiscordWebhook   = "discord_webhook"
	StatusActive            = "active"
	StatusInactive          = "inactive"
	DeliveryPending         = "pending"
	DeliveryRetrying        = "retrying"
	DeliverySuccess         = "success"
	DeliveryFailed          = "failed"
	EventWebhookFailed      = "webhook.failed_permanently"
	EventOperationalTest    = "operational_alert.test"
	QueueAlerts             = "alerts"
	defaultRetryDelay       = time.Minute
	defaultMaxAttempts      = 3
	sourceTypeWebhook       = "webhook_delivery"
	sourceTypeDashboardTest = "dashboard_test"
)

var (
	ErrNotFound   = errors.New("alert endpoint not found")
	ErrValidation = errors.New("validation error")
)

var supportedEvents = map[string]struct{}{
	EventWebhookFailed:   {},
	EventOperationalTest: {},
}

type Service struct {
	db          *pgxpool.Pool
	asynqClient *asynq.Client
	httpClient  *http.Client
	appEnv      string
	secret      string
	metrics     *platformmetrics.Metrics
	retryDelay  time.Duration
	maxAttempts int
}

type AlertEndpoint struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	Name            string     `json:"name"`
	Channel         string     `json:"channel"`
	DestinationURL  string     `json:"destination_url"`
	Events          []string   `json:"events"`
	Status          string     `json:"status"`
	HasAuthToken    bool       `json:"has_auth_token"`
	LastTestedAt    *time.Time `json:"last_tested_at,omitempty"`
	LastTriggeredAt *time.Time `json:"last_triggered_at,omitempty"`
	LastSuccessAt   *time.Time `json:"last_success_at,omitempty"`
	LastError       *string    `json:"last_error,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type CreateInput struct {
	Name           string
	Channel        string
	DestinationURL string
	Events         []string
	Status         string
	AuthToken      string
}

type UpdateInput struct {
	Name           *string
	Channel        *string
	DestinationURL *string
	Events         []string
	Status         *string
	AuthToken      *string
	ClearAuthToken bool
}

type TestDispatchResult struct {
	AlertDeliveryID string `json:"alert_delivery_id"`
	Status          string `json:"status"`
}

type deliveryState struct {
	ID                 string
	AlertEndpointID    string
	EventType          string
	Status             string
	AttemptCount       int
	PayloadRaw         string
	Channel            string
	DestinationURL     string
	EndpointStatus     string
	EncryptedAuthToken *string
}

type webhookFailureContext struct {
	DeliveryID     string
	StoreID        string
	StoreUserID    string
	StoreName      string
	StoreStatus    string
	CallbackURL    string
	AttemptCount   int
	FailedAt       *time.Time
	OrderID        *string
	TransactionID  *string
	ResponseStatus *int
	LastError      *string
}

func NewService(
	db *pgxpool.Pool,
	asynqClient *asynq.Client,
	httpClient *http.Client,
	appEnv string,
	secret string,
	metrics *platformmetrics.Metrics,
) *Service {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	return &Service{
		db:          db,
		asynqClient: asynqClient,
		httpClient:  httpClient,
		appEnv:      appEnv,
		secret:      secret,
		metrics:     metrics,
		retryDelay:  defaultRetryDelay,
		maxAttempts: defaultMaxAttempts,
	}
}

func RetryDelay() time.Duration {
	return defaultRetryDelay
}

func MaxAttempts() int {
	return defaultMaxAttempts
}

func (s *Service) ListByUser(ctx context.Context, userID string) ([]AlertEndpoint, error) {
	rows, err := s.db.Query(ctx, `
		SELECT
			id::text,
			user_id::text,
			name,
			channel,
			destination_url,
			events,
			status,
			auth_token_encrypted IS NOT NULL AND auth_token_encrypted <> '',
			last_tested_at,
			last_triggered_at,
			last_success_at,
			last_error,
			created_at,
			updated_at
		FROM alert_endpoints
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AlertEndpoint
	for rows.Next() {
		var item AlertEndpoint
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Name,
			&item.Channel,
			&item.DestinationURL,
			&item.Events,
			&item.Status,
			&item.HasAuthToken,
			&item.LastTestedAt,
			&item.LastTriggeredAt,
			&item.LastSuccessAt,
			&item.LastError,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *Service) CreateByUser(ctx context.Context, userID string, input CreateInput) (AlertEndpoint, error) {
	normalized, err := s.normalizeCreateInput(input)
	if err != nil {
		return AlertEndpoint{}, err
	}

	var encryptedAuthToken *string
	if normalized.AuthToken != "" {
		value, err := security.EncryptString(s.secret, normalized.AuthToken)
		if err != nil {
			return AlertEndpoint{}, err
		}
		encryptedAuthToken = &value
	}

	var created AlertEndpoint
	err = s.db.QueryRow(ctx, `
		INSERT INTO alert_endpoints (
			id,
			user_id,
			name,
			channel,
			destination_url,
			events,
			status,
			auth_token_encrypted
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING
			id::text,
			user_id::text,
			name,
			channel,
			destination_url,
			events,
			status,
			auth_token_encrypted IS NOT NULL AND auth_token_encrypted <> '',
			last_tested_at,
			last_triggered_at,
			last_success_at,
			last_error,
			created_at,
			updated_at
	`,
		uuid.NewString(),
		userID,
		normalized.Name,
		normalized.Channel,
		normalized.DestinationURL,
		normalized.Events,
		normalized.Status,
		encryptedAuthToken,
	).Scan(
		&created.ID,
		&created.UserID,
		&created.Name,
		&created.Channel,
		&created.DestinationURL,
		&created.Events,
		&created.Status,
		&created.HasAuthToken,
		&created.LastTestedAt,
		&created.LastTriggeredAt,
		&created.LastSuccessAt,
		&created.LastError,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		return AlertEndpoint{}, err
	}

	return created, nil
}

func (s *Service) UpdateByUser(ctx context.Context, userID string, endpointID string, input UpdateInput) (AlertEndpoint, error) {
	current, encryptedAuthToken, err := s.getEndpointForUpdate(ctx, userID, endpointID)
	if err != nil {
		return AlertEndpoint{}, err
	}

	name := current.Name
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}

	channel := current.Channel
	if input.Channel != nil {
		channel = strings.TrimSpace(strings.ToLower(*input.Channel))
	}

	destinationURL := current.DestinationURL
	if input.DestinationURL != nil {
		destinationURL = strings.TrimSpace(*input.DestinationURL)
	}

	events := current.Events
	if input.Events != nil {
		events = normalizeEvents(input.Events)
	}

	status := current.Status
	if input.Status != nil {
		status = strings.TrimSpace(strings.ToLower(*input.Status))
	}

	if input.ClearAuthToken {
		encryptedAuthToken = nil
	}

	if input.AuthToken != nil {
		value := strings.TrimSpace(*input.AuthToken)
		if value != "" {
			encryptedValue, err := security.EncryptString(s.secret, value)
			if err != nil {
				return AlertEndpoint{}, err
			}
			encryptedAuthToken = &encryptedValue
		}
	}

	normalized := CreateInput{
		Name:           name,
		Channel:        channel,
		DestinationURL: destinationURL,
		Events:         events,
		Status:         status,
	}
	if _, err := s.normalizeCreateInput(normalized); err != nil {
		return AlertEndpoint{}, err
	}

	var updated AlertEndpoint
	err = s.db.QueryRow(ctx, `
		UPDATE alert_endpoints
		SET
			name = $2,
			channel = $3,
			destination_url = $4,
			events = $5,
			status = $6,
			auth_token_encrypted = $7,
			updated_at = now()
		WHERE id = $1 AND user_id = $8
		RETURNING
			id::text,
			user_id::text,
			name,
			channel,
			destination_url,
			events,
			status,
			auth_token_encrypted IS NOT NULL AND auth_token_encrypted <> '',
			last_tested_at,
			last_triggered_at,
			last_success_at,
			last_error,
			created_at,
			updated_at
	`, endpointID, name, channel, destinationURL, events, status, encryptedAuthToken, userID).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Name,
		&updated.Channel,
		&updated.DestinationURL,
		&updated.Events,
		&updated.Status,
		&updated.HasAuthToken,
		&updated.LastTestedAt,
		&updated.LastTriggeredAt,
		&updated.LastSuccessAt,
		&updated.LastError,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AlertEndpoint{}, ErrNotFound
		}
		return AlertEndpoint{}, err
	}

	return updated, nil
}

func (s *Service) DeleteByUser(ctx context.Context, userID string, endpointID string) error {
	commandTag, err := s.db.Exec(ctx, `
		DELETE FROM alert_endpoints
		WHERE id = $1 AND user_id = $2
	`, endpointID, userID)
	if err != nil {
		return err
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) SendTestByUser(ctx context.Context, userID string, endpointID string) (TestDispatchResult, error) {
	endpoint, _, err := s.getEndpointForUpdate(ctx, userID, endpointID)
	if err != nil {
		return TestDispatchResult{}, err
	}

	payloadJSON, err := json.Marshal(map[string]any{
		"event":          EventOperationalTest,
		"severity":       "info",
		"message":        fmt.Sprintf("Test alert dari PayGate untuk endpoint %s.", endpoint.Name),
		"sent_at":        time.Now().UTC().Format(time.RFC3339),
		"dashboard_path": "/app/profile",
		"endpoint": map[string]any{
			"id":      endpoint.ID,
			"name":    endpoint.Name,
			"channel": endpoint.Channel,
			"status":  endpoint.Status,
		},
		"next_step": "Jika pesan ini masuk, endpoint operasional Anda sudah siap menerima alert webhook permanen.",
	})
	if err != nil {
		return TestDispatchResult{}, err
	}

	alertDeliveryID, err := s.createAlertDelivery(ctx, createAlertDeliveryInput{
		EndpointID: endpoint.ID,
		EventType:  EventOperationalTest,
		SourceType: sourceTypeDashboardTest,
		PayloadRaw: string(payloadJSON),
	})
	if err != nil {
		return TestDispatchResult{}, err
	}

	if err := s.enqueueAlert(ctx, alertDeliveryID); err != nil {
		return TestDispatchResult{}, err
	}

	return TestDispatchResult{
		AlertDeliveryID: alertDeliveryID,
		Status:          DeliveryPending,
	}, nil
}

func (s *Service) NotifyWebhookFailure(ctx context.Context, deliveryID string) error {
	if strings.TrimSpace(deliveryID) == "" {
		return nil
	}

	failure, err := s.loadWebhookFailureContext(ctx, deliveryID)
	if err != nil {
		return err
	}

	if failure == nil {
		return nil
	}

	endpoints, err := s.listActiveEndpointsForEvent(ctx, failure.StoreUserID, EventWebhookFailed)
	if err != nil {
		return err
	}

	if len(endpoints) == 0 {
		return nil
	}

	payloadJSON, err := json.Marshal(s.buildWebhookFailurePayload(*failure))
	if err != nil {
		return err
	}

	var enqueueErrs []string
	for _, endpoint := range endpoints {
		alertDeliveryID, err := s.createAlertDelivery(ctx, createAlertDeliveryInput{
			EndpointID:       endpoint.ID,
			StoreID:          &failure.StoreID,
			SourceDeliveryID: &failure.DeliveryID,
			EventType:        EventWebhookFailed,
			SourceType:       sourceTypeWebhook,
			PayloadRaw:       string(payloadJSON),
		})
		if err != nil {
			enqueueErrs = append(enqueueErrs, err.Error())
			continue
		}
		if err := s.enqueueAlert(ctx, alertDeliveryID); err != nil {
			enqueueErrs = append(enqueueErrs, err.Error())
		}
	}

	if len(enqueueErrs) > 0 {
		return fmt.Errorf("enqueue alert notifications: %s", strings.Join(enqueueErrs, "; "))
	}

	return nil
}

func (s *Service) ProcessTask(ctx context.Context, payload tasks.AlertNotifyPayload) error {
	if strings.TrimSpace(payload.AlertDeliveryID) == "" {
		return asynq.SkipRetry
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		s.metrics.RecordDatabaseError("alert_endpoint", "begin_tx")
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	state, err := s.loadDeliveryStateForUpdate(ctx, tx, payload.AlertDeliveryID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return asynq.SkipRetry
		}
		s.metrics.RecordDatabaseError("alert_endpoint", "load_delivery_state")
		return err
	}

	if state.Status == DeliverySuccess || state.Status == DeliveryFailed {
		if err := tx.Commit(ctx); err != nil {
			s.metrics.RecordDatabaseError("alert_endpoint", "commit_noop")
			return err
		}
		return nil
	}

	attemptNumber := state.AttemptCount + 1
	permanentError := ""
	if strings.TrimSpace(state.DestinationURL) == "" {
		permanentError = "missing destination URL"
	}
	if state.EndpointStatus != StatusActive {
		permanentError = "alert endpoint is inactive"
	}

	authToken := ""
	if permanentError == "" && state.EncryptedAuthToken != nil && strings.TrimSpace(*state.EncryptedAuthToken) != "" {
		authToken, err = security.DecryptString(s.secret, *state.EncryptedAuthToken)
		if err != nil {
			permanentError = "failed to decrypt endpoint auth token"
		}
	}

	body, contentType, buildErr := s.buildRequestBody(state.Channel, state.PayloadRaw)
	if permanentError == "" && buildErr != nil {
		permanentError = buildErr.Error()
	}

	requestStartedAt := time.Now().UTC()
	var responseStatus *int
	var responseBody *string
	var errorMessage *string
	success := false

	if permanentError != "" {
		errorMessage = stringPointer(permanentError)
	} else {
		req, err := http.NewRequestWithContext(
			ctx,
			http.MethodPost,
			state.DestinationURL,
			strings.NewReader(body),
		)
		if err != nil {
			errorMessage = stringPointer(err.Error())
		} else {
			req.Header.Set("Content-Type", contentType)
			req.Header.Set("User-Agent", "PayGate-Operational-Alert/1.0")
			req.Header.Set("X-PayGate-Alert-Event", state.EventType)
			req.Header.Set("X-PayGate-Alert-Delivery-Id", state.ID)
			if strings.TrimSpace(authToken) != "" {
				req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(authToken))
			}

			resp, err := s.httpClient.Do(req)
			if err != nil {
				errorMessage = stringPointer(err.Error())
			} else {
				defer resp.Body.Close()

				bodyBytes, readErr := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
				status := resp.StatusCode
				responseStatus = &status
				responseText := strings.TrimSpace(string(bodyBytes))
				if readErr != nil {
					responseText = fmt.Sprintf("failed to read response body: %v", readErr)
				}
				if responseText != "" {
					responseBody = &responseText
				}
				success = resp.StatusCode >= http.StatusOK && resp.StatusCode < http.StatusMultipleChoices
				if !success {
					errorMessage = stringPointer(fmt.Sprintf("destination returned status %d", resp.StatusCode))
				}
			}
		}
	}

	attemptedAt := time.Now().UTC()
	finalFailure := permanentError != "" || attemptNumber >= s.maxAttempts
	nextStatus := DeliveryRetrying
	if success {
		nextStatus = DeliverySuccess
	} else if finalFailure {
		nextStatus = DeliveryFailed
	}

	if _, err := tx.Exec(ctx, `
		UPDATE alert_deliveries
		SET
			status = $2,
			attempt_count = $3,
			response_status = $4,
			response_body = $5,
			error_message = $6,
			last_attempt_at = $7,
			delivered_at = $8,
			updated_at = now()
		WHERE id = $1
	`,
		state.ID,
		nextStatus,
		attemptNumber,
		responseStatus,
		responseBody,
		errorMessage,
		attemptedAt,
		timePointerIf(success, attemptedAt),
	); err != nil {
		s.metrics.RecordDatabaseError("alert_endpoint", "update_delivery_status")
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE alert_endpoints
		SET
			last_triggered_at = COALESCE($2, last_triggered_at),
			last_tested_at = CASE WHEN $3 THEN $2 ELSE last_tested_at END,
			last_success_at = CASE WHEN $4 THEN $2 ELSE last_success_at END,
			last_error = CASE
				WHEN $4 THEN NULL
				WHEN $5::text IS NOT NULL THEN $5::text
				ELSE last_error
			END,
			updated_at = now()
		WHERE id = $1
	`,
		state.AlertEndpointID,
		requestStartedAt,
		state.EventType == EventOperationalTest,
		success,
		errorMessage,
	); err != nil {
		s.metrics.RecordDatabaseError("alert_endpoint", "update_endpoint_status")
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		s.metrics.RecordDatabaseError("alert_endpoint", "commit_delivery_status")
		return err
	}

	if success {
		s.metrics.RecordOperationalAlertDispatch("success")
		return nil
	}

	if finalFailure {
		s.metrics.RecordOperationalAlertDispatch("failed")
		return nil
	}

	s.metrics.RecordOperationalAlertDispatch("retrying")
	if errorMessage != nil {
		return errors.New(*errorMessage)
	}
	return errors.New("alert notification failed")
}

type createAlertDeliveryInput struct {
	EndpointID       string
	StoreID          *string
	SourceDeliveryID *string
	EventType        string
	SourceType       string
	PayloadRaw       string
}

func (s *Service) createAlertDelivery(ctx context.Context, input createAlertDeliveryInput) (string, error) {
	deliveryID := uuid.NewString()
	_, err := s.db.Exec(ctx, `
		INSERT INTO alert_deliveries (
			id,
			alert_endpoint_id,
			store_id,
			source_delivery_id,
			source_type,
			event_type,
			status,
			payload
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
	`,
		deliveryID,
		input.EndpointID,
		input.StoreID,
		input.SourceDeliveryID,
		input.SourceType,
		input.EventType,
		DeliveryPending,
		input.PayloadRaw,
	)
	if err != nil {
		s.metrics.RecordDatabaseError("alert_endpoint", "create_delivery")
		return "", err
	}
	return deliveryID, nil
}

func (s *Service) enqueueAlert(ctx context.Context, alertDeliveryID string) error {
	if s.asynqClient == nil {
		s.metrics.RecordRedisError("alert_endpoint", "enqueue_unavailable")
		return fmt.Errorf("asynq client unavailable")
	}

	payload, err := json.Marshal(tasks.AlertNotifyPayload{
		AlertDeliveryID: alertDeliveryID,
	})
	if err != nil {
		return err
	}

	task := asynq.NewTask(tasks.TypeAlertNotify, payload)
	if _, err := s.asynqClient.EnqueueContext(
		ctx,
		task,
		asynq.Queue(QueueAlerts),
		asynq.MaxRetry(s.maxAttempts-1),
	); err != nil {
		s.metrics.RecordRedisError("alert_endpoint", "enqueue")
		return err
	}

	s.metrics.RecordOperationalAlertDispatch("queued")
	return nil
}

func (s *Service) listActiveEndpointsForEvent(ctx context.Context, userID string, eventType string) ([]AlertEndpoint, error) {
	rows, err := s.db.Query(ctx, `
		SELECT
			id::text,
			user_id::text,
			name,
			channel,
			destination_url,
			events,
			status,
			auth_token_encrypted IS NOT NULL AND auth_token_encrypted <> '',
			last_tested_at,
			last_triggered_at,
			last_success_at,
			last_error,
			created_at,
			updated_at
		FROM alert_endpoints
		WHERE user_id = $1
			AND status = $2
			AND $3 = ANY(events)
		ORDER BY created_at DESC
	`, userID, StatusActive, eventType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []AlertEndpoint
	for rows.Next() {
		var item AlertEndpoint
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Name,
			&item.Channel,
			&item.DestinationURL,
			&item.Events,
			&item.Status,
			&item.HasAuthToken,
			&item.LastTestedAt,
			&item.LastTriggeredAt,
			&item.LastSuccessAt,
			&item.LastError,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (s *Service) loadWebhookFailureContext(ctx context.Context, deliveryID string) (*webhookFailureContext, error) {
	var item webhookFailureContext
	err := s.db.QueryRow(ctx, `
		SELECT
			wd.id::text,
			wd.store_id::text,
			s.user_id::text,
			s.name,
			s.status,
			wd.callback_url,
			wd.attempt_count,
			wd.failed_at,
			t.order_id,
			wd.transaction_id::text,
			wda.response_status,
			wda.error_message
		FROM webhook_deliveries wd
		INNER JOIN stores s ON s.id = wd.store_id
		LEFT JOIN transactions t ON t.id = wd.transaction_id
		LEFT JOIN LATERAL (
			SELECT response_status, error_message
			FROM webhook_delivery_attempts
			WHERE webhook_delivery_id = wd.id
			ORDER BY attempt_number DESC
			LIMIT 1
		) wda ON true
		WHERE wd.id = $1 AND wd.status = 'failed_permanently'
	`, deliveryID).Scan(
		&item.DeliveryID,
		&item.StoreID,
		&item.StoreUserID,
		&item.StoreName,
		&item.StoreStatus,
		&item.CallbackURL,
		&item.AttemptCount,
		&item.FailedAt,
		&item.OrderID,
		&item.TransactionID,
		&item.ResponseStatus,
		&item.LastError,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &item, nil
}

func (s *Service) loadDeliveryStateForUpdate(ctx context.Context, tx pgx.Tx, deliveryID string) (deliveryState, error) {
	var state deliveryState
	err := tx.QueryRow(ctx, `
		SELECT
			ad.id::text,
			ad.alert_endpoint_id::text,
			ad.event_type,
			ad.status,
			ad.attempt_count,
			ad.payload::text,
			ae.channel,
			ae.destination_url,
			ae.status,
			ae.auth_token_encrypted
		FROM alert_deliveries ad
		INNER JOIN alert_endpoints ae ON ae.id = ad.alert_endpoint_id
		WHERE ad.id = $1
		FOR UPDATE OF ad, ae
	`, deliveryID).Scan(
		&state.ID,
		&state.AlertEndpointID,
		&state.EventType,
		&state.Status,
		&state.AttemptCount,
		&state.PayloadRaw,
		&state.Channel,
		&state.DestinationURL,
		&state.EndpointStatus,
		&state.EncryptedAuthToken,
	)
	if err != nil {
		return deliveryState{}, err
	}
	return state, nil
}

func (s *Service) buildWebhookFailurePayload(item webhookFailureContext) map[string]any {
	return map[string]any{
		"event":          EventWebhookFailed,
		"severity":       "critical",
		"message":        fmt.Sprintf("Webhook store %s gagal dikirim permanen dan membutuhkan tindak lanjut operator.", item.StoreName),
		"sent_at":        time.Now().UTC().Format(time.RFC3339),
		"dashboard_path": "/app/webhooks",
		"store": map[string]any{
			"id":           item.StoreID,
			"name":         item.StoreName,
			"status":       item.StoreStatus,
			"callback_url": item.CallbackURL,
		},
		"delivery": map[string]any{
			"id":              item.DeliveryID,
			"order_id":        derefString(item.OrderID),
			"transaction_id":  derefString(item.TransactionID),
			"attempt_count":   item.AttemptCount,
			"failed_at":       formatTime(item.FailedAt),
			"last_error":      derefString(item.LastError),
			"response_status": derefInt(item.ResponseStatus),
		},
		"next_step": "Buka tab Webhook Delivery di dashboard PayGate, tinjau response callback terakhir, lalu lakukan resend jika endpoint merchant sudah siap.",
	}
}

func (s *Service) buildRequestBody(channel string, payloadRaw string) (string, string, error) {
	switch channel {
	case ChannelWebhook:
		return payloadRaw, "application/json", nil
	case ChannelSlackWebhook:
		summary, err := summarizeAlertPayload(payloadRaw)
		if err != nil {
			return "", "", err
		}
		body, err := json.Marshal(map[string]any{
			"text": summary,
		})
		return string(body), "application/json", err
	case ChannelDiscordWebhook:
		summary, err := summarizeAlertPayload(payloadRaw)
		if err != nil {
			return "", "", err
		}
		body, err := json.Marshal(map[string]any{
			"content": summary,
		})
		return string(body), "application/json", err
	default:
		return "", "", ErrValidation
	}
}

func summarizeAlertPayload(payloadRaw string) (string, error) {
	var payload struct {
		Event   string `json:"event"`
		Message string `json:"message"`
		Store   struct {
			Name string `json:"name"`
		} `json:"store"`
		Delivery struct {
			OrderID      string `json:"order_id"`
			AttemptCount int    `json:"attempt_count"`
		} `json:"delivery"`
	}
	if err := json.Unmarshal([]byte(payloadRaw), &payload); err != nil {
		return "", err
	}

	switch payload.Event {
	case EventWebhookFailed:
		if payload.Delivery.OrderID != "" {
			return fmt.Sprintf(
				"PayGate alert: webhook gagal permanen untuk store %s, order %s, setelah %d percobaan.",
				fallbackString(payload.Store.Name, "tanpa nama"),
				payload.Delivery.OrderID,
				payload.Delivery.AttemptCount,
			), nil
		}
	case EventOperationalTest:
		return fallbackString(payload.Message, "PayGate test alert."), nil
	}

	return fallbackString(payload.Message, "PayGate operational alert."), nil
}

func (s *Service) getEndpointForUpdate(ctx context.Context, userID string, endpointID string) (AlertEndpoint, *string, error) {
	var item AlertEndpoint
	var encryptedAuthToken *string
	err := s.db.QueryRow(ctx, `
		SELECT
			id::text,
			user_id::text,
			name,
			channel,
			destination_url,
			events,
			status,
			auth_token_encrypted IS NOT NULL AND auth_token_encrypted <> '',
			last_tested_at,
			last_triggered_at,
			last_success_at,
			last_error,
			created_at,
			updated_at,
			auth_token_encrypted
		FROM alert_endpoints
		WHERE id = $1 AND user_id = $2
	`, endpointID, userID).Scan(
		&item.ID,
		&item.UserID,
		&item.Name,
		&item.Channel,
		&item.DestinationURL,
		&item.Events,
		&item.Status,
		&item.HasAuthToken,
		&item.LastTestedAt,
		&item.LastTriggeredAt,
		&item.LastSuccessAt,
		&item.LastError,
		&item.CreatedAt,
		&item.UpdatedAt,
		&encryptedAuthToken,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AlertEndpoint{}, nil, ErrNotFound
		}
		return AlertEndpoint{}, nil, err
	}

	return item, encryptedAuthToken, nil
}

func (s *Service) normalizeCreateInput(input CreateInput) (CreateInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Channel = strings.TrimSpace(strings.ToLower(input.Channel))
	input.DestinationURL = strings.TrimSpace(input.DestinationURL)
	input.Status = strings.TrimSpace(strings.ToLower(input.Status))
	input.AuthToken = strings.TrimSpace(input.AuthToken)
	input.Events = normalizeEvents(input.Events)

	if input.Status == "" {
		input.Status = StatusActive
	}
	if len(input.Events) == 0 {
		input.Events = []string{EventWebhookFailed}
	}

	if input.Name == "" || len(input.Name) > 80 {
		return CreateInput{}, ErrValidation
	}
	if !isSupportedChannel(input.Channel) {
		return CreateInput{}, ErrValidation
	}
	if input.Status != StatusActive && input.Status != StatusInactive {
		return CreateInput{}, ErrValidation
	}
	if len(input.Events) == 0 {
		return CreateInput{}, ErrValidation
	}
	for _, event := range input.Events {
		if _, ok := supportedEvents[event]; !ok || event == EventOperationalTest {
			return CreateInput{}, ErrValidation
		}
	}
	if err := s.validateDestinationURL(input.DestinationURL); err != nil {
		return CreateInput{}, err
	}

	return input, nil
}

func normalizeEvents(events []string) []string {
	seen := make(map[string]struct{}, len(events))
	result := make([]string, 0, len(events))
	for _, event := range events {
		normalized := strings.TrimSpace(strings.ToLower(event))
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func isSupportedChannel(channel string) bool {
	switch channel {
	case ChannelWebhook, ChannelSlackWebhook, ChannelDiscordWebhook:
		return true
	default:
		return false
	}
}

func (s *Service) validateDestinationURL(raw string) error {
	if strings.TrimSpace(raw) == "" {
		return ErrValidation
	}

	parsedURL, err := url.ParseRequestURI(raw)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return ErrValidation
	}

	switch parsedURL.Scheme {
	case "http":
		if s.appEnv == "production" {
			return ErrValidation
		}
	case "https":
	default:
		return ErrValidation
	}

	return nil
}

func formatTime(value *time.Time) any {
	if value == nil {
		return nil
	}
	return value.UTC().Format(time.RFC3339)
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func derefInt(value *int) any {
	if value == nil {
		return nil
	}
	return *value
}

func fallbackString(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

func timePointerIf(condition bool, value time.Time) *time.Time {
	if !condition {
		return nil
	}
	return &value
}

func stringPointer(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	trimmed := strings.TrimSpace(value)
	return &trimmed
}
