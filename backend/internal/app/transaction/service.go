package transaction

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"payment-platform/backend/internal/integration/midtrans"
	"payment-platform/backend/internal/platform/auditmask"
	"payment-platform/backend/internal/platform/authz"
	platformmetrics "payment-platform/backend/internal/platform/metrics"
	"payment-platform/backend/internal/platform/requestlog"
)

var (
	ErrNotFound      = errors.New("transaction not found")
	ErrConflict      = errors.New("transaction conflict")
	ErrValidation    = errors.New("validation error")
	ErrUnauthorized  = errors.New("unauthorized")
	ErrMidtrans      = errors.New("midtrans error")
	ErrStoreNotFound = errors.New("store not found")
	ErrProcessing    = errors.New("transaction processing")
)

type Service struct {
	db             *pgxpool.Pool
	redisClient    redis.UniversalClient
	midtransClient *midtrans.Client
	metrics        *platformmetrics.Metrics
}

type Transaction struct {
	ID                    string         `json:"id"`
	OrderID               string         `json:"order_id"`
	PlatformOrderID       string         `json:"platform_order_id"`
	MidtransTransactionID *string        `json:"midtrans_transaction_id,omitempty"`
	PaymentType           string         `json:"payment_type"`
	GrossAmount           int64          `json:"gross_amount"`
	Currency              string         `json:"currency"`
	Status                string         `json:"status"`
	FraudStatus           *string        `json:"fraud_status,omitempty"`
	Metadata              map[string]any `json:"metadata"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
	PaidAt                *time.Time     `json:"paid_at,omitempty"`
}

type ChargeRequest struct {
	OrderID     string         `json:"order_id"`
	Amount      int64          `json:"amount"`
	Currency    string         `json:"currency"`
	PaymentType string         `json:"payment_type"`
	Bank        string         `json:"bank"`
	Customer    Customer       `json:"customer"`
	Items       []Item         `json:"items"`
	CallbackURL string         `json:"callback_url"`
	Metadata    map[string]any `json:"metadata"`
}

type Customer struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
}

type Item struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Price    int64  `json:"price"`
	Quantity int64  `json:"quantity"`
}

type ChargeInput struct {
	StoreID        string
	TokenID        string
	IdempotencyKey string
	RequestID      string
	Request        ChargeRequest
}

type ChargeResult struct {
	TransactionID   string               `json:"transaction_id"`
	OrderID         string               `json:"order_id"`
	PlatformOrderID string               `json:"platform_order_id"`
	Status          string               `json:"status"`
	PaymentType     string               `json:"payment_type"`
	Amount          int64                `json:"amount"`
	Midtrans        ChargeMidtransResult `json:"midtrans"`
}

type ChargeMidtransResult struct {
	TransactionID     string              `json:"transaction_id"`
	VANumbers         []midtrans.VANumber `json:"va_numbers,omitempty"`
	PermataVANumber   string              `json:"permata_va_number,omitempty"`
	BillKey           string              `json:"bill_key,omitempty"`
	BillerCode        string              `json:"biller_code,omitempty"`
	TransactionStatus string              `json:"transaction_status,omitempty"`
	FraudStatus       string              `json:"fraud_status,omitempty"`
}

type AuditLog struct {
	ID           string         `json:"id"`
	RequestID    string         `json:"request_id"`
	ActorType    string         `json:"actor_type"`
	ActorID      *string        `json:"actor_id,omitempty"`
	Direction    string         `json:"direction"`
	Method       *string        `json:"method,omitempty"`
	URL          *string        `json:"url,omitempty"`
	StatusCode   *int           `json:"status_code,omitempty"`
	RequestBody  map[string]any `json:"request_body"`
	ResponseBody map[string]any `json:"response_body"`
	ErrorMessage *string        `json:"error_message,omitempty"`
	DurationMS   *int           `json:"duration_ms,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
}

type DashboardTransaction struct {
	ID                    string         `json:"id"`
	OrderID               string         `json:"order_id"`
	PlatformOrderID       string         `json:"platform_order_id"`
	MidtransTransactionID *string        `json:"midtrans_transaction_id,omitempty"`
	PaymentType           string         `json:"payment_type"`
	GrossAmount           int64          `json:"gross_amount"`
	Currency              string         `json:"currency"`
	Status                string         `json:"status"`
	FraudStatus           *string        `json:"fraud_status,omitempty"`
	CallbackURL           *string        `json:"callback_url,omitempty"`
	Metadata              map[string]any `json:"metadata"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
	PaidAt                *time.Time     `json:"paid_at,omitempty"`
}

type DashboardTransactionListInput struct {
	Limit  int
	Offset int
	Status string
	Query  string
}

type AuditLogListInput struct {
	Limit     int
	Offset    int
	Direction string
	Query     string
}

type ListMeta struct {
	Total   int  `json:"total"`
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	HasNext bool `json:"has_next"`
}

type DashboardTransactionListResult struct {
	Transactions []DashboardTransaction `json:"transactions"`
	Meta         ListMeta               `json:"meta"`
}

type AuditLogListResult struct {
	Logs []AuditLog `json:"logs"`
	Meta ListMeta   `json:"meta"`
}

func NewService(db *pgxpool.Pool, redisClient redis.UniversalClient, midtransClient *midtrans.Client, metrics *platformmetrics.Metrics) *Service {
	return &Service{
		db:             db,
		redisClient:    redisClient,
		midtransClient: midtransClient,
		metrics:        metrics,
	}
}

func (s *Service) Charge(ctx context.Context, input ChargeInput) (ChargeResult, error) {
	requestStartedAt := time.Now()
	outcome := "internal_error"
	defer func() {
		s.metrics.RecordChargeRequest(outcome)
	}()

	requestlog.SetStoreID(ctx, input.StoreID)
	requestlog.SetOrderID(ctx, input.Request.OrderID)

	rawRequest, err := json.Marshal(input.Request)
	if err != nil {
		return ChargeResult{}, err
	}

	if err := validateChargeRequest(input.Request); err != nil {
		outcome = "validation_error"
		s.persistInboundChargeAuditLog(
			ctx,
			nil,
			input,
			rawRequest,
			http.StatusBadRequest,
			buildErrorResponseBody("VALIDATION_ERROR", "Invalid charge payload.", input.RequestID),
			int(time.Since(requestStartedAt).Milliseconds()),
			stringPointer(err.Error()),
		)
		return ChargeResult{}, err
	}

	if strings.TrimSpace(input.IdempotencyKey) == "" {
		outcome = "validation_error"
		s.persistInboundChargeAuditLog(
			ctx,
			nil,
			input,
			rawRequest,
			http.StatusBadRequest,
			buildErrorResponseBody("VALIDATION_ERROR", "Invalid charge payload.", input.RequestID),
			int(time.Since(requestStartedAt).Milliseconds()),
			stringPointer(ErrValidation.Error()),
		)
		return ChargeResult{}, ErrValidation
	}

	if s.midtransClient == nil {
		outcome = "midtrans_error"
		s.persistInboundChargeAuditLog(
			ctx,
			nil,
			input,
			rawRequest,
			http.StatusBadGateway,
			buildErrorResponseBody("MIDTRANS_ERROR", "Failed to create transaction on Midtrans.", input.RequestID),
			int(time.Since(requestStartedAt).Milliseconds()),
			stringPointer(ErrMidtrans.Error()),
		)
		return ChargeResult{}, ErrMidtrans
	}

	lockTTL := 60 * time.Second
	idempotencyLockKey := fmt.Sprintf("idempotency:store:%s:key:%s", input.StoreID, input.IdempotencyKey)
	orderLockKey := fmt.Sprintf("lock:store:%s:order:%s", input.StoreID, input.Request.OrderID)

	if err := s.acquireLock(ctx, idempotencyLockKey, lockTTL); err != nil {
		if !errors.Is(err, ErrProcessing) {
			s.metrics.RecordRedisError("transaction_charge", "acquire_idempotency_lock")
		}
		if errors.Is(err, ErrProcessing) {
			outcome = "processing_conflict"
			s.persistInboundChargeAuditLog(
				ctx,
				nil,
				input,
				rawRequest,
				http.StatusConflict,
				buildErrorResponseBody("TRANSACTION_CONFLICT", "Transaction is already being processed.", input.RequestID),
				int(time.Since(requestStartedAt).Milliseconds()),
				stringPointer(err.Error()),
			)
		}
		return ChargeResult{}, err
	}
	defer s.releaseLock(ctx, idempotencyLockKey)

	if err := s.acquireLock(ctx, orderLockKey, lockTTL); err != nil {
		if !errors.Is(err, ErrProcessing) {
			s.metrics.RecordRedisError("transaction_charge", "acquire_order_lock")
		}
		if errors.Is(err, ErrProcessing) {
			outcome = "processing_conflict"
			s.persistInboundChargeAuditLog(
				ctx,
				nil,
				input,
				rawRequest,
				http.StatusConflict,
				buildErrorResponseBody("TRANSACTION_CONFLICT", "Transaction is already being processed.", input.RequestID),
				int(time.Since(requestStartedAt).Milliseconds()),
				stringPointer(err.Error()),
			)
		}
		return ChargeResult{}, err
	}
	defer s.releaseLock(ctx, orderLockKey)

	storeData, err := s.getStoreData(ctx, input.StoreID)
	if err != nil {
		if errors.Is(err, ErrStoreNotFound) {
			outcome = "store_inactive"
			s.persistInboundChargeAuditLog(
				ctx,
				nil,
				input,
				rawRequest,
				http.StatusForbidden,
				buildErrorResponseBody("STORE_INACTIVE", "Store is inactive or unavailable.", input.RequestID),
				int(time.Since(requestStartedAt).Milliseconds()),
				stringPointer(err.Error()),
			)
		} else {
			s.metrics.RecordDatabaseError("transaction_charge", "get_store_data")
		}
		return ChargeResult{}, err
	}

	existing, found, err := s.findExistingTransaction(ctx, input.StoreID, input.Request.OrderID, rawRequest)
	if err != nil {
		if errors.Is(err, ErrConflict) {
			outcome = "payload_conflict"
			s.persistInboundChargeAuditLog(
				ctx,
				stringPointer(existing.TransactionID),
				input,
				rawRequest,
				http.StatusConflict,
				buildErrorResponseBody("TRANSACTION_CONFLICT", "Order ID already exists with different payload.", input.RequestID),
				int(time.Since(requestStartedAt).Milliseconds()),
				stringPointer(err.Error()),
			)
		} else {
			s.metrics.RecordDatabaseError("transaction_charge", "find_existing_transaction")
		}
		return ChargeResult{}, err
	}
	if found {
		requestlog.SetTransactionID(ctx, existing.TransactionID)
		outcome = "idempotency_replay"
		s.persistInboundChargeAuditLog(
			ctx,
			stringPointer(existing.TransactionID),
			input,
			rawRequest,
			http.StatusCreated,
			buildSuccessResponseBody(existing),
			int(time.Since(requestStartedAt).Milliseconds()),
			nil,
		)
		return existing, nil
	}

	callbackURL := strings.TrimSpace(input.Request.CallbackURL)
	if callbackURL == "" && storeData.DefaultCallbackURL != nil {
		callbackURL = *storeData.DefaultCallbackURL
	}

	midtransPayload, err := buildMidtransPayload(storeData.Slug, input.Request)
	if err != nil {
		return ChargeResult{}, err
	}

	midtransRequestBody, err := json.Marshal(midtransPayload)
	if err != nil {
		return ChargeResult{}, err
	}

	midtransStartedAt := time.Now()
	midtransResponse, midtransResponseBody, statusCode, err := s.midtransClient.Charge(ctx, midtransPayload)
	midtransElapsed := time.Since(midtransStartedAt)
	midtransDurationMS := int(midtransElapsed.Milliseconds())
	if err != nil {
		outcome = "midtrans_error"
		s.metrics.ObserveMidtransLatency(midtransElapsed, "error")
		s.logChargeAuditFailure(
			ctx,
			input,
			rawRequest,
			midtransRequestBody,
			midtransResponseBody,
			statusCode,
			int(time.Since(requestStartedAt).Milliseconds()),
			midtransDurationMS,
			err,
		)
		return ChargeResult{}, ErrMidtrans
	}
	s.metrics.ObserveMidtransLatency(midtransElapsed, "success")

	transactionID := uuid.NewString()
	internalStatus := MapMidtransStatus(midtransResponse.TransactionStatus, midtransResponse.FraudStatus)
	platformOrderID := midtransPayload.TransactionDetails.OrderID

	metadata := input.Request.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}

	result := buildChargeResult(
		transactionID,
		input.Request.OrderID,
		platformOrderID,
		internalStatus,
		input.Request.Amount,
		input.Request.PaymentType,
		midtransResponse,
	)
	requestlog.SetTransactionID(ctx, transactionID)

	if err := s.persistSuccessfulChargeTx(ctx, persistedTransaction{
		ID:                    transactionID,
		StoreID:               input.StoreID,
		OrderID:               input.Request.OrderID,
		PlatformOrderID:       platformOrderID,
		IdempotencyKey:        input.IdempotencyKey,
		MidtransTransactionID: midtransResponse.TransactionID,
		PaymentType:           input.Request.PaymentType,
		GrossAmount:           input.Request.Amount,
		Currency:              strings.ToUpper(strings.TrimSpace(input.Request.Currency)),
		Status:                internalStatus,
		FraudStatus:           nullString(midtransResponse.FraudStatus),
		CustomerName:          nullString(input.Request.Customer.Name),
		CustomerEmail:         nullString(input.Request.Customer.Email),
		CustomerPhone:         nullString(input.Request.Customer.Phone),
		CallbackURL:           nullString(callbackURL),
		Metadata:              metadata,
		RawRequest:            string(rawRequest),
		MidtransRequest:       string(midtransRequestBody),
		MidtransResponse:      string(midtransResponseBody),
	}, input, rawRequest, midtransRequestBody, midtransResponseBody, statusCode, int(time.Since(requestStartedAt).Milliseconds()), midtransDurationMS, result); err != nil {
		s.metrics.RecordDatabaseError("transaction_charge", "persist_successful_charge")
		return ChargeResult{}, err
	}

	if err := s.redisClient.Set(ctx, fmt.Sprintf("idempotency:store:%s:key:%s:result", input.StoreID, input.IdempotencyKey), transactionID, 24*time.Hour).Err(); err != nil {
		s.metrics.RecordRedisError("transaction_charge", "cache_idempotency_result")
	}

	outcome = "success"

	return result, nil
}

func (s *Service) GetByOrderID(ctx context.Context, storeID string, orderID string) (Transaction, error) {
	var item Transaction
	err := s.db.QueryRow(ctx, `
		SELECT
			id::text,
			order_id,
			platform_order_id,
			midtrans_transaction_id,
			payment_type,
			gross_amount,
			currency,
			status,
			fraud_status,
			metadata,
			created_at,
			updated_at,
			paid_at
		FROM transactions
		WHERE store_id = $1 AND order_id = $2
	`, storeID, orderID).Scan(
		&item.ID,
		&item.OrderID,
		&item.PlatformOrderID,
		&item.MidtransTransactionID,
		&item.PaymentType,
		&item.GrossAmount,
		&item.Currency,
		&item.Status,
		&item.FraudStatus,
		&item.Metadata,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.PaidAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Transaction{}, ErrNotFound
		}

		return Transaction{}, err
	}

	if item.Metadata == nil {
		item.Metadata = map[string]any{}
	}

	return item, nil
}

func (s *Service) ListAuditLogs(ctx context.Context, storeID string, input AuditLogListInput) (AuditLogListResult, error) {
	if input.Limit <= 0 {
		input.Limit = 50
	}
	if input.Offset < 0 {
		input.Offset = 0
	}

	whereSQL, args := buildAuditLogFilters(storeID, strings.TrimSpace(input.Direction), strings.TrimSpace(input.Query))

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM audit_logs
		WHERE %s
	`, whereSQL)

	var total int
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return AuditLogListResult{}, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT
			id::text,
			request_id,
			actor_type,
			actor_id,
			direction,
			method,
			url,
			status_code,
			request_body,
			response_body,
			error_message,
			duration_ms,
			created_at
		FROM audit_logs
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d
		OFFSET $%d
	`, whereSQL, len(args)+1, len(args)+2)

	args = append(args, input.Limit, input.Offset)
	rows, err := s.db.Query(ctx, selectQuery, args...)
	if err != nil {
		return AuditLogListResult{}, err
	}
	defer rows.Close()

	var items []AuditLog
	for rows.Next() {
		var item AuditLog
		if err := rows.Scan(
			&item.ID,
			&item.RequestID,
			&item.ActorType,
			&item.ActorID,
			&item.Direction,
			&item.Method,
			&item.URL,
			&item.StatusCode,
			&item.RequestBody,
			&item.ResponseBody,
			&item.ErrorMessage,
			&item.DurationMS,
			&item.CreatedAt,
		); err != nil {
			return AuditLogListResult{}, err
		}

		if item.RequestBody == nil {
			item.RequestBody = map[string]any{}
		}
		if item.ResponseBody == nil {
			item.ResponseBody = map[string]any{}
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return AuditLogListResult{}, err
	}

	if items == nil {
		items = []AuditLog{}
	}

	return AuditLogListResult{
		Logs: items,
		Meta: ListMeta{
			Total:   total,
			Limit:   input.Limit,
			Offset:  input.Offset,
			HasNext: input.Offset+len(items) < total,
		},
	}, nil
}

func (s *Service) ListDashboardTransactions(ctx context.Context, userID string, role string, storeID string, input DashboardTransactionListInput) (DashboardTransactionListResult, error) {
	exists, err := s.userOwnsStore(ctx, userID, role, storeID)
	if err != nil {
		return DashboardTransactionListResult{}, err
	}
	if !exists {
		return DashboardTransactionListResult{}, ErrStoreNotFound
	}

	if input.Limit <= 0 {
		input.Limit = 50
	}
	if input.Offset < 0 {
		input.Offset = 0
	}

	whereSQL, args := buildDashboardTransactionFilters(storeID, strings.TrimSpace(input.Status), strings.TrimSpace(input.Query))

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM transactions
		WHERE %s
	`, whereSQL)

	var total int
	if err := s.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return DashboardTransactionListResult{}, err
	}

	selectQuery := fmt.Sprintf(`
		SELECT
			id::text,
			order_id,
			platform_order_id,
			midtrans_transaction_id,
			payment_type,
			gross_amount,
			currency,
			status,
			fraud_status,
			callback_url,
			metadata,
			created_at,
			updated_at,
			paid_at
		FROM transactions
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d
		OFFSET $%d
	`, whereSQL, len(args)+1, len(args)+2)

	args = append(args, input.Limit, input.Offset)
	rows, err := s.db.Query(ctx, selectQuery, args...)
	if err != nil {
		return DashboardTransactionListResult{}, err
	}
	defer rows.Close()

	var items []DashboardTransaction
	for rows.Next() {
		var item DashboardTransaction
		if err := rows.Scan(
			&item.ID,
			&item.OrderID,
			&item.PlatformOrderID,
			&item.MidtransTransactionID,
			&item.PaymentType,
			&item.GrossAmount,
			&item.Currency,
			&item.Status,
			&item.FraudStatus,
			&item.CallbackURL,
			&item.Metadata,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.PaidAt,
		); err != nil {
			return DashboardTransactionListResult{}, err
		}

		if item.Metadata == nil {
			item.Metadata = map[string]any{}
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return DashboardTransactionListResult{}, err
	}

	if items == nil {
		items = []DashboardTransaction{}
	}

	return DashboardTransactionListResult{
		Transactions: items,
		Meta: ListMeta{
			Total:   total,
			Limit:   input.Limit,
			Offset:  input.Offset,
			HasNext: input.Offset+len(items) < total,
		},
	}, nil
}

func (s *Service) GetDashboardTransaction(ctx context.Context, userID string, role string, storeID string, transactionID string) (DashboardTransaction, error) {
	exists, err := s.userOwnsStore(ctx, userID, role, storeID)
	if err != nil {
		return DashboardTransaction{}, err
	}
	if !exists {
		return DashboardTransaction{}, ErrStoreNotFound
	}

	var item DashboardTransaction
	err = s.db.QueryRow(ctx, `
		SELECT
			id::text,
			order_id,
			platform_order_id,
			midtrans_transaction_id,
			payment_type,
			gross_amount,
			currency,
			status,
			fraud_status,
			callback_url,
			metadata,
			created_at,
			updated_at,
			paid_at
		FROM transactions
		WHERE store_id = $1 AND id = $2
	`, storeID, transactionID).Scan(
		&item.ID,
		&item.OrderID,
		&item.PlatformOrderID,
		&item.MidtransTransactionID,
		&item.PaymentType,
		&item.GrossAmount,
		&item.Currency,
		&item.Status,
		&item.FraudStatus,
		&item.CallbackURL,
		&item.Metadata,
		&item.CreatedAt,
		&item.UpdatedAt,
		&item.PaidAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return DashboardTransaction{}, ErrNotFound
		}

		return DashboardTransaction{}, err
	}

	if item.Metadata == nil {
		item.Metadata = map[string]any{}
	}

	return item, nil
}

func buildDashboardTransactionFilters(storeID string, status string, query string) (string, []any) {
	clauses := []string{"store_id = $1"}
	args := []any{storeID}

	if status != "" {
		args = append(args, status)
		clauses = append(clauses, fmt.Sprintf("status = $%d", len(args)))
	}

	if query != "" {
		args = append(args, "%"+query+"%")
		placeholder := fmt.Sprintf("$%d", len(args))
		clauses = append(clauses, fmt.Sprintf("(order_id ILIKE %s OR platform_order_id ILIKE %s)", placeholder, placeholder))
	}

	return strings.Join(clauses, " AND "), args
}

func (s *Service) ListDashboardAuditLogs(ctx context.Context, userID string, role string, storeID string, input AuditLogListInput) (AuditLogListResult, error) {
	exists, err := s.userOwnsStore(ctx, userID, role, storeID)
	if err != nil {
		return AuditLogListResult{}, err
	}
	if !exists {
		return AuditLogListResult{}, ErrStoreNotFound
	}

	return s.ListAuditLogs(ctx, storeID, input)
}

func buildAuditLogFilters(storeID string, direction string, query string) (string, []any) {
	clauses := []string{"store_id = $1"}
	args := []any{storeID}

	if direction != "" {
		args = append(args, direction)
		clauses = append(clauses, fmt.Sprintf("direction = $%d", len(args)))
	}

	if query != "" {
		args = append(args, "%"+query+"%")
		placeholder := fmt.Sprintf("$%d", len(args))
		clauses = append(clauses, fmt.Sprintf("("+
			"request_id ILIKE %[1]s OR "+
			"actor_type ILIKE %[1]s OR "+
			"COALESCE(method, '') ILIKE %[1]s OR "+
			"COALESCE(url, '') ILIKE %[1]s OR "+
			"COALESCE(request_body->>'order_id', '') ILIKE %[1]s OR "+
			"COALESCE(response_body->>'order_id', '') ILIKE %[1]s"+
			")", placeholder))
	}

	return strings.Join(clauses, " AND "), args
}

type storeData struct {
	Slug               string
	DefaultCallbackURL *string
}

type midtransTransactionDetails struct {
	OrderID     string `json:"order_id"`
	GrossAmount int64  `json:"gross_amount"`
}

type midtransCustomerDetails struct {
	FirstName string `json:"first_name,omitempty"`
	Email     string `json:"email,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

type midtransItemDetail struct {
	ID       string `json:"id,omitempty"`
	Price    int64  `json:"price"`
	Quantity int64  `json:"quantity"`
	Name     string `json:"name"`
}

type midtransChargePayload struct {
	PaymentType        string                     `json:"payment_type"`
	TransactionDetails midtransTransactionDetails `json:"transaction_details"`
	BankTransfer       map[string]any             `json:"bank_transfer,omitempty"`
	EChannel           map[string]any             `json:"echannel,omitempty"`
	CustomerDetails    *midtransCustomerDetails   `json:"customer_details,omitempty"`
	ItemDetails        []midtransItemDetail       `json:"item_details,omitempty"`
}

type persistedTransaction struct {
	ID                    string
	StoreID               string
	OrderID               string
	PlatformOrderID       string
	IdempotencyKey        string
	MidtransTransactionID string
	PaymentType           string
	GrossAmount           int64
	Currency              string
	Status                string
	FraudStatus           *string
	CustomerName          *string
	CustomerEmail         *string
	CustomerPhone         *string
	CallbackURL           *string
	Metadata              map[string]any
	RawRequest            string
	MidtransRequest       string
	MidtransResponse      string
}

func (s *Service) acquireLock(ctx context.Context, key string, ttl time.Duration) error {
	acquired, err := s.redisClient.SetNX(ctx, key, "1", ttl).Result()
	if err != nil {
		return err
	}

	if !acquired {
		return ErrProcessing
	}

	return nil
}

func (s *Service) releaseLock(ctx context.Context, key string) {
	if err := s.redisClient.Del(ctx, key).Err(); err != nil {
		s.metrics.RecordRedisError("transaction_charge", "release_lock")
	}
}

func (s *Service) getStoreData(ctx context.Context, storeID string) (storeData, error) {
	var item storeData
	err := s.db.QueryRow(ctx, `
		SELECT slug, default_callback_url
		FROM stores
		WHERE id = $1 AND status = 'active'
	`, storeID).Scan(&item.Slug, &item.DefaultCallbackURL)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return storeData{}, ErrStoreNotFound
		}

		return storeData{}, err
	}

	return item, nil
}

func (s *Service) userOwnsStore(ctx context.Context, userID string, role string, storeID string) (bool, error) {
	if authz.IsAdmin(role) {
		return s.storeExists(ctx, storeID)
	}

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

func (s *Service) storeExists(ctx context.Context, storeID string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM stores
			WHERE id = $1
		)
	`, storeID).Scan(&exists)
	return exists, err
}

func (s *Service) findExistingTransaction(ctx context.Context, storeID string, orderID string, rawRequest []byte) (ChargeResult, bool, error) {
	var transactionID string
	var platformOrderID string
	var paymentType string
	var grossAmount int64
	var status string
	var midtransResponseText string
	var samePayload bool

	err := s.db.QueryRow(ctx, `
		SELECT
			id::text,
			platform_order_id,
			payment_type,
			gross_amount,
			status,
			midtrans_response::text,
			raw_request = $3::jsonb
		FROM transactions
		WHERE store_id = $1 AND order_id = $2
	`, storeID, orderID, string(rawRequest)).Scan(
		&transactionID,
		&platformOrderID,
		&paymentType,
		&grossAmount,
		&status,
		&midtransResponseText,
		&samePayload,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ChargeResult{}, false, nil
		}

		return ChargeResult{}, false, err
	}

	var response midtrans.ChargeResponse
	if midtransResponseText != "" && midtransResponseText != "{}" {
		if err := json.Unmarshal([]byte(midtransResponseText), &response); err != nil {
			return ChargeResult{}, false, err
		}
	}

	result := buildChargeResult(transactionID, orderID, platformOrderID, status, grossAmount, paymentType, response)
	if !samePayload {
		return result, false, ErrConflict
	}

	return result, true, nil
}

func (s *Service) persistTransaction(ctx context.Context, item persistedTransaction) error {
	if item.Metadata == nil {
		item.Metadata = map[string]any{}
	}

	_, err := s.db.Exec(ctx, `
		INSERT INTO transactions (
			id,
			store_id,
			order_id,
			platform_order_id,
			idempotency_key,
			midtrans_transaction_id,
			payment_type,
			gross_amount,
			currency,
			status,
			fraud_status,
			customer_name,
			customer_email,
			customer_phone,
			callback_url,
			metadata,
			raw_request,
			midtrans_request,
			midtrans_response
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb, $19::jsonb
		)
	`, item.ID, item.StoreID, item.OrderID, item.PlatformOrderID, item.IdempotencyKey, item.MidtransTransactionID,
		item.PaymentType, item.GrossAmount, item.Currency, item.Status, item.FraudStatus, item.CustomerName,
		item.CustomerEmail, item.CustomerPhone, item.CallbackURL, item.Metadata, item.RawRequest, item.MidtransRequest, item.MidtransResponse,
	)

	return err
}

func (s *Service) persistSuccessfulChargeTx(ctx context.Context, item persistedTransaction, input ChargeInput, rawRequest []byte, midtransRequest []byte, midtransResponse []byte, statusCode int, requestDurationMS int, midtransDurationMS int, result ChargeResult) error {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if err := s.insertTransactionTx(ctx, tx, item); err != nil {
		return err
	}

	if err := s.insertInboundChargeAuditLogTx(
		ctx,
		tx,
		stringPointer(item.ID),
		input,
		rawRequest,
		http.StatusCreated,
		buildSuccessResponseBody(result),
		requestDurationMS,
		nil,
	); err != nil {
		return err
	}

	if err := s.insertOutboundChargeAuditLogTx(
		ctx,
		tx,
		stringPointer(item.ID),
		input.RequestID,
		input.StoreID,
		midtransRequest,
		midtransResponse,
		statusCode,
		midtransDurationMS,
		nil,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *Service) insertTransactionTx(ctx context.Context, tx pgx.Tx, item persistedTransaction) error {
	if item.Metadata == nil {
		item.Metadata = map[string]any{}
	}

	_, err := tx.Exec(ctx, `
		INSERT INTO transactions (
			id,
			store_id,
			order_id,
			platform_order_id,
			idempotency_key,
			midtrans_transaction_id,
			payment_type,
			gross_amount,
			currency,
			status,
			fraud_status,
			customer_name,
			customer_email,
			customer_phone,
			callback_url,
			metadata,
			raw_request,
			midtrans_request,
			midtrans_response
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17::jsonb, $18::jsonb, $19::jsonb
		)
	`, item.ID, item.StoreID, item.OrderID, item.PlatformOrderID, item.IdempotencyKey, item.MidtransTransactionID,
		item.PaymentType, item.GrossAmount, item.Currency, item.Status, item.FraudStatus, item.CustomerName,
		item.CustomerEmail, item.CustomerPhone, item.CallbackURL, item.Metadata, item.RawRequest, item.MidtransRequest, item.MidtransResponse,
	)

	return err
}

func (s *Service) persistChargeAuditLogs(ctx context.Context, transactionID string, input ChargeInput, rawRequest []byte, midtransRequest []byte, midtransResponse []byte, statusCode int, requestDurationMS int, midtransDurationMS int, result ChargeResult) {
	s.persistInboundChargeAuditLog(
		ctx,
		stringPointer(transactionID),
		input,
		rawRequest,
		http.StatusCreated,
		buildSuccessResponseBody(result),
		requestDurationMS,
		nil,
	)

	s.persistOutboundChargeAuditLog(ctx, stringPointer(transactionID), input.RequestID, input.StoreID, midtransRequest, midtransResponse, statusCode, midtransDurationMS, nil)
}

func (s *Service) persistInboundChargeAuditLog(ctx context.Context, transactionID *string, input ChargeInput, rawRequest []byte, statusCode int, responseBody []byte, durationMS int, errorMessage *string) {
	requestHeaders := auditmask.HeadersText(map[string]string{
		"authorization":   "Bearer " + input.TokenID,
		"idempotency-key": input.IdempotencyKey,
	})

	responseJSON := auditmask.JSONText(responseBody)
	requestJSON := auditmask.JSONText(rawRequest)

	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (
			id, store_id, transaction_id, request_id, actor_type, actor_id, direction, method, url, status_code,
			request_headers, request_body, response_headers, response_body, error_message, duration_ms
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'store_api_token', $4, 'inbound', 'POST', '/v1/transactions/charge', $5,
			$6::jsonb, $7::jsonb, '{}'::jsonb, $8::jsonb, $9, $10
		)
	`, input.StoreID, transactionID, input.RequestID, input.TokenID, statusCode,
		requestHeaders, requestJSON, responseJSON, auditmask.TextPointer(errorMessage), durationMS,
	)
}

func (s *Service) insertInboundChargeAuditLogTx(ctx context.Context, tx pgx.Tx, transactionID *string, input ChargeInput, rawRequest []byte, statusCode int, responseBody []byte, durationMS int, errorMessage *string) error {
	requestHeaders := auditmask.HeadersText(map[string]string{
		"authorization":   "Bearer " + input.TokenID,
		"idempotency-key": input.IdempotencyKey,
	})

	responseJSON := auditmask.JSONText(responseBody)
	requestJSON := auditmask.JSONText(rawRequest)

	_, err := tx.Exec(ctx, `
		INSERT INTO audit_logs (
			id, store_id, transaction_id, request_id, actor_type, actor_id, direction, method, url, status_code,
			request_headers, request_body, response_headers, response_body, error_message, duration_ms
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'store_api_token', $4, 'inbound', 'POST', '/v1/transactions/charge', $5,
			$6::jsonb, $7::jsonb, '{}'::jsonb, $8::jsonb, $9, $10
		)
	`, input.StoreID, transactionID, input.RequestID, input.TokenID, statusCode,
		requestHeaders, requestJSON, responseJSON, auditmask.TextPointer(errorMessage), durationMS,
	)
	return err
}

func (s *Service) persistOutboundChargeAuditLog(ctx context.Context, transactionID *string, requestID string, storeID string, midtransRequest []byte, midtransResponse []byte, statusCode int, durationMS int, errorMessage *string) {
	requestHeaders := auditmask.HeadersText(map[string]string{
		"accept":        "application/json",
		"authorization": "Basic placeholder",
		"content-type":  "application/json",
	})

	_, _ = s.db.Exec(ctx, `
		INSERT INTO audit_logs (
			id, store_id, transaction_id, request_id, actor_type, direction, method, url, status_code,
			request_headers, request_body, response_headers, response_body, error_message, duration_ms
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'platform', 'outbound', 'POST', $4, $5,
			$6::jsonb, $7::jsonb, '{}'::jsonb, $8::jsonb, $9, $10
		)
	`, storeID, transactionID, requestID, s.midtransClient.BaseURL()+"/charge", statusCode,
		requestHeaders, auditmask.JSONText(midtransRequest), auditmask.JSONText(midtransResponse), auditmask.TextPointer(errorMessage), durationMS,
	)
}

func (s *Service) insertOutboundChargeAuditLogTx(ctx context.Context, tx pgx.Tx, transactionID *string, requestID string, storeID string, midtransRequest []byte, midtransResponse []byte, statusCode int, durationMS int, errorMessage *string) error {
	requestHeaders := auditmask.HeadersText(map[string]string{
		"accept":        "application/json",
		"authorization": "Basic placeholder",
		"content-type":  "application/json",
	})

	_, err := tx.Exec(ctx, `
		INSERT INTO audit_logs (
			id, store_id, transaction_id, request_id, actor_type, direction, method, url, status_code,
			request_headers, request_body, response_headers, response_body, error_message, duration_ms
		) VALUES (
			gen_random_uuid(), $1, $2, $3, 'platform', 'outbound', 'POST', $4, $5,
			$6::jsonb, $7::jsonb, '{}'::jsonb, $8::jsonb, $9, $10
		)
	`, storeID, transactionID, requestID, s.midtransClient.BaseURL()+"/charge", statusCode,
		requestHeaders, auditmask.JSONText(midtransRequest), auditmask.JSONText(midtransResponse), auditmask.TextPointer(errorMessage), durationMS,
	)
	return err
}

func (s *Service) logChargeAuditFailure(ctx context.Context, input ChargeInput, rawRequest []byte, midtransRequest []byte, midtransResponse []byte, statusCode int, requestDurationMS int, midtransDurationMS int, failure error) {
	s.persistInboundChargeAuditLog(
		ctx,
		nil,
		input,
		rawRequest,
		http.StatusBadGateway,
		buildErrorResponseBody("MIDTRANS_ERROR", "Failed to create transaction on Midtrans.", input.RequestID),
		requestDurationMS,
		stringPointer(failure.Error()),
	)

	s.persistOutboundChargeAuditLog(
		ctx,
		nil,
		input.RequestID,
		input.StoreID,
		midtransRequest,
		midtransResponse,
		statusCode,
		midtransDurationMS,
		stringPointer(failure.Error()),
	)
}

func validateChargeRequest(request ChargeRequest) error {
	if strings.TrimSpace(request.OrderID) == "" ||
		request.Amount <= 0 ||
		strings.TrimSpace(request.Currency) == "" ||
		strings.TrimSpace(request.PaymentType) == "" ||
		strings.TrimSpace(request.Bank) == "" {
		return ErrValidation
	}

	if strings.ToUpper(strings.TrimSpace(request.Currency)) != "IDR" {
		return ErrValidation
	}

	if strings.TrimSpace(request.PaymentType) != "bank_transfer" {
		return ErrValidation
	}

	switch strings.ToLower(strings.TrimSpace(request.Bank)) {
	case "bca", "bni", "bri", "cimb", "permata", "mandiri":
	default:
		return ErrValidation
	}

	if strings.TrimSpace(request.CallbackURL) != "" {
		parsedURL, err := url.ParseRequestURI(strings.TrimSpace(request.CallbackURL))
		if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
			return ErrValidation
		}
	}

	if len(request.Items) > 0 {
		var total int64
		for _, item := range request.Items {
			if item.Quantity <= 0 || item.Price < 0 || strings.TrimSpace(item.Name) == "" {
				return ErrValidation
			}
			total += item.Price * item.Quantity
		}
		if total != request.Amount {
			return ErrValidation
		}
	}

	return nil
}

func buildMidtransPayload(storeSlug string, request ChargeRequest) (midtransChargePayload, error) {
	platformOrderID := storeSlug + "_" + strings.TrimSpace(request.OrderID)
	bank := strings.ToLower(strings.TrimSpace(request.Bank))

	payload := midtransChargePayload{
		PaymentType: mappedPaymentType(bank),
		TransactionDetails: midtransTransactionDetails{
			OrderID:     platformOrderID,
			GrossAmount: request.Amount,
		},
	}

	if request.Customer.Name != "" || request.Customer.Email != "" || request.Customer.Phone != "" {
		payload.CustomerDetails = &midtransCustomerDetails{
			FirstName: strings.TrimSpace(request.Customer.Name),
			Email:     strings.TrimSpace(request.Customer.Email),
			Phone:     strings.TrimSpace(request.Customer.Phone),
		}
	}

	if len(request.Items) > 0 {
		payload.ItemDetails = make([]midtransItemDetail, 0, len(request.Items))
		for _, item := range request.Items {
			payload.ItemDetails = append(payload.ItemDetails, midtransItemDetail{
				ID:       item.ID,
				Price:    item.Price,
				Quantity: item.Quantity,
				Name:     item.Name,
			})
		}
	}

	switch bank {
	case "bca", "bni", "bri", "cimb":
		payload.BankTransfer = map[string]any{"bank": bank}
	case "permata":
	case "mandiri":
		payload.EChannel = map[string]any{
			"bill_info1": "Payment:",
			"bill_info2": truncate(storeSlug+" "+request.OrderID, 30),
		}
	default:
		return midtransChargePayload{}, ErrValidation
	}

	return payload, nil
}

func mappedPaymentType(bank string) string {
	switch bank {
	case "permata":
		return "permata"
	case "mandiri":
		return "echannel"
	default:
		return "bank_transfer"
	}
}

func buildChargeResult(transactionID string, orderID string, platformOrderID string, status string, amount int64, paymentType string, response midtrans.ChargeResponse) ChargeResult {
	return ChargeResult{
		TransactionID:   transactionID,
		OrderID:         orderID,
		PlatformOrderID: platformOrderID,
		Status:          status,
		PaymentType:     paymentType,
		Amount:          amount,
		Midtrans: ChargeMidtransResult{
			TransactionID:     response.TransactionID,
			VANumbers:         response.VANumbers,
			PermataVANumber:   response.PermataVANumber,
			BillKey:           response.BillKey,
			BillerCode:        response.BillerCode,
			TransactionStatus: response.TransactionStatus,
			FraudStatus:       response.FraudStatus,
		},
	}
}

func buildSuccessResponseBody(result ChargeResult) []byte {
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

func bytesOrDefault(value []byte) string {
	trimmed := strings.TrimSpace(string(value))
	if trimmed == "" {
		return "{}"
	}

	return trimmed
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}

	return value[:max]
}

func nullString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func stringPointer(value string) *string {
	return &value
}
