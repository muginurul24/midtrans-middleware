package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"payment-platform/backend/internal/app/transaction"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type StoreAPIHandler struct {
	service *transaction.Service
}

func NewStoreAPIHandler(service *transaction.Service) *StoreAPIHandler {
	return &StoreAPIHandler{service: service}
}

func (h *StoreAPIHandler) Charge(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.StorePrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing store principal.", nil)
		return
	}

	if !hasScope(principal.Scopes, "transaction:create") {
		httpresponse.Error(w, r, http.StatusForbidden, "FORBIDDEN", "Token scope does not allow creating transactions.", nil)
		return
	}
	setStoreID(r, principal.StoreID)

	var request transaction.ChargeRequest
	if !decodeChargeJSON(w, r, &request) {
		return
	}
	setOrderID(r, request.OrderID)

	result, err := h.service.Charge(r.Context(), transaction.ChargeInput{
		StoreID:        principal.StoreID,
		TokenID:        principal.TokenID,
		IdempotencyKey: strings.TrimSpace(r.Header.Get("Idempotency-Key")),
		RequestID:      chimiddleware.GetReqID(r.Context()),
		Request:        request,
	})
	if err != nil {
		switch {
		case errors.Is(err, transaction.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid charge payload.", nil)
		case errors.Is(err, transaction.ErrConflict):
			httpresponse.Error(w, r, http.StatusConflict, "TRANSACTION_CONFLICT", "Order ID already exists with different payload.", nil)
		case errors.Is(err, transaction.ErrProcessing):
			httpresponse.Error(w, r, http.StatusConflict, "TRANSACTION_CONFLICT", "Transaction is already being processed.", nil)
		case errors.Is(err, transaction.ErrMidtrans):
			httpresponse.Error(w, r, http.StatusBadGateway, "MIDTRANS_ERROR", "Failed to create transaction on Midtrans.", nil)
		case errors.Is(err, transaction.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusForbidden, "STORE_INACTIVE", "Store is inactive or unavailable.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create transaction.", nil)
		}
		return
	}
	setTransactionID(r, result.TransactionID)
	setOrderID(r, result.OrderID)

	httpresponse.Success(w, http.StatusCreated, result)
}

func (h *StoreAPIHandler) GetTransaction(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.StorePrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing store principal.", nil)
		return
	}

	if !hasScope(principal.Scopes, "transaction:read") {
		httpresponse.Error(w, r, http.StatusForbidden, "FORBIDDEN", "Token scope does not allow reading transactions.", nil)
		return
	}
	setStoreID(r, principal.StoreID)
	setOrderID(r, chi.URLParam(r, "order_id"))

	item, err := h.service.GetByOrderID(r.Context(), principal.StoreID, chi.URLParam(r, "order_id"))
	if err != nil {
		if errors.Is(err, transaction.ErrNotFound) {
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Transaction not found.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch transaction.", nil)
		return
	}
	setTransactionID(r, item.ID)
	setOrderID(r, item.OrderID)

	httpresponse.Success(w, http.StatusOK, item)
}

func (h *StoreAPIHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.StorePrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing store principal.", nil)
		return
	}

	if !hasScope(principal.Scopes, "transaction:read") {
		httpresponse.Error(w, r, http.StatusForbidden, "FORBIDDEN", "Token scope does not allow reading audit logs.", nil)
		return
	}
	setStoreID(r, principal.StoreID)

	input, ok := decodeAuditLogListInput(w, r)
	if !ok {
		return
	}

	items, err := h.service.ListAuditLogs(r.Context(), principal.StoreID, input)
	if err != nil {
		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch audit logs.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, items)
}

func hasScope(scopes []string, required string) bool {
	for _, scope := range scopes {
		if scope == required {
			return true
		}
	}

	return false
}
