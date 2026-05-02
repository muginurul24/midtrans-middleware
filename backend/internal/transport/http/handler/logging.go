package handler

import (
	"net/http"

	"payment-platform/backend/internal/platform/requestlog"
)

func setStoreID(r *http.Request, value string) {
	requestlog.SetStoreID(r.Context(), value)
}

func setTransactionID(r *http.Request, value string) {
	requestlog.SetTransactionID(r.Context(), value)
}

func setOrderID(r *http.Request, value string) {
	requestlog.SetOrderID(r.Context(), value)
}

func setOptionalStoreID(r *http.Request, value *string) {
	if value == nil {
		return
	}

	setStoreID(r, *value)
}

func setOptionalTransactionID(r *http.Request, value *string) {
	if value == nil {
		return
	}

	setTransactionID(r, *value)
}

func setOptionalOrderID(r *http.Request, value *string) {
	if value == nil {
		return
	}

	setOrderID(r, *value)
}
