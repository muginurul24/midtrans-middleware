package requestlog

import (
	"context"
	"strings"
	"sync"
)

type contextKey string

const fieldsKey contextKey = "request_log_fields"

type Fields struct {
	mu            sync.RWMutex
	storeID       string
	transactionID string
	orderID       string
	errorCode     string
}

type Snapshot struct {
	StoreID       string
	TransactionID string
	OrderID       string
	ErrorCode     string
}

func WithFields(ctx context.Context) context.Context {
	if FieldsFromContext(ctx) != nil {
		return ctx
	}

	return context.WithValue(ctx, fieldsKey, &Fields{})
}

func FieldsFromContext(ctx context.Context) *Fields {
	fields, _ := ctx.Value(fieldsKey).(*Fields)
	return fields
}

func SnapshotFromContext(ctx context.Context) Snapshot {
	fields := FieldsFromContext(ctx)
	if fields == nil {
		return Snapshot{}
	}

	fields.mu.RLock()
	defer fields.mu.RUnlock()

	return Snapshot{
		StoreID:       fields.storeID,
		TransactionID: fields.transactionID,
		OrderID:       fields.orderID,
		ErrorCode:     fields.errorCode,
	}
}

func SetStoreID(ctx context.Context, value string) {
	set(ctx, func(fields *Fields) {
		fields.storeID = normalize(value)
	})
}

func SetTransactionID(ctx context.Context, value string) {
	set(ctx, func(fields *Fields) {
		fields.transactionID = normalize(value)
	})
}

func SetOrderID(ctx context.Context, value string) {
	set(ctx, func(fields *Fields) {
		fields.orderID = normalize(value)
	})
}

func SetErrorCode(ctx context.Context, value string) {
	set(ctx, func(fields *Fields) {
		fields.errorCode = normalize(value)
	})
}

func set(ctx context.Context, apply func(*Fields)) {
	fields := FieldsFromContext(ctx)
	if fields == nil {
		return
	}

	fields.mu.Lock()
	defer fields.mu.Unlock()

	apply(fields)
}

func normalize(value string) string {
	return strings.TrimSpace(value)
}
