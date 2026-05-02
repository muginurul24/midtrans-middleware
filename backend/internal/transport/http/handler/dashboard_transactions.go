package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"payment-platform/backend/internal/app/transaction"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type DashboardTransactionHandler struct {
	service *transaction.Service
}

func NewDashboardTransactionHandler(service *transaction.Service) *DashboardTransactionHandler {
	return &DashboardTransactionHandler{service: service}
}

func (h *DashboardTransactionHandler) ListForStore(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	limit := 50
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 || parsedLimit > 200 {
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid transaction limit.", nil)
			return
		}
		limit = parsedLimit
	}

	items, err := h.service.ListDashboardTransactions(r.Context(), principal.UserID, chi.URLParam(r, "store_id"), limit)
	if err != nil {
		switch {
		case errors.Is(err, transaction.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch transactions.", nil)
		}
		return
	}

	if items == nil {
		items = []transaction.DashboardTransaction{}
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"transactions": items,
	})
}

func (h *DashboardTransactionHandler) GetForStore(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))
	setTransactionID(r, chi.URLParam(r, "transaction_id"))

	item, err := h.service.GetDashboardTransaction(
		r.Context(),
		principal.UserID,
		chi.URLParam(r, "store_id"),
		chi.URLParam(r, "transaction_id"),
	)
	if err != nil {
		switch {
		case errors.Is(err, transaction.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		case errors.Is(err, transaction.ErrNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Transaction not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch transaction.", nil)
		}
		return
	}
	setOrderID(r, item.OrderID)
	setTransactionID(r, item.ID)

	httpresponse.Success(w, http.StatusOK, item)
}

func (h *DashboardTransactionHandler) ListAuditLogsForStore(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	limit := 50
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 || parsedLimit > 200 {
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audit log limit.", nil)
			return
		}
		limit = parsedLimit
	}

	items, err := h.service.ListDashboardAuditLogs(r.Context(), principal.UserID, chi.URLParam(r, "store_id"), limit)
	if err != nil {
		switch {
		case errors.Is(err, transaction.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch audit logs.", nil)
		}
		return
	}

	if items == nil {
		items = []transaction.AuditLog{}
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"logs": items,
	})
}
