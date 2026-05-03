package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"payment-platform/backend/internal/app/webhookdelivery"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type WebhookDeliveryHandler struct {
	service *webhookdelivery.Service
}

func NewWebhookDeliveryHandler(service *webhookdelivery.Service) *WebhookDeliveryHandler {
	return &WebhookDeliveryHandler{service: service}
}

func (h *WebhookDeliveryHandler) ListForStore(w http.ResponseWriter, r *http.Request) {
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
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid webhook delivery limit.", nil)
			return
		}
		limit = parsedLimit
	}

	offset := 0
	if rawOffset := r.URL.Query().Get("offset"); rawOffset != "" {
		parsedOffset, err := strconv.Atoi(rawOffset)
		if err != nil || parsedOffset < 0 {
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid webhook delivery offset.", nil)
			return
		}
		offset = parsedOffset
	}

	status := r.URL.Query().Get("status")
	if status != "" && !isWebhookDeliveryStatus(status) {
		httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid webhook delivery status filter.", nil)
		return
	}

	items, err := h.service.ListForStore(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"), webhookdelivery.DeliveryListInput{
		Limit:  limit,
		Offset: offset,
		Status: status,
		Query:  r.URL.Query().Get("query"),
	})
	if err != nil {
		switch {
		case errors.Is(err, webhookdelivery.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch webhook deliveries.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, items)
}

func (h *WebhookDeliveryHandler) Get(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	detail, err := h.service.GetByUser(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "delivery_id"))
	if err != nil {
		switch {
		case errors.Is(err, webhookdelivery.ErrNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Webhook delivery not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch webhook delivery.", nil)
		}
		return
	}
	setStoreID(r, detail.Delivery.StoreID)
	setOptionalTransactionID(r, detail.Delivery.TransactionID)
	setOptionalOrderID(r, detail.Delivery.OrderID)

	httpresponse.Success(w, http.StatusOK, detail)
}

func (h *WebhookDeliveryHandler) Resend(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	item, err := h.service.ResendByUser(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "delivery_id"))
	if err != nil {
		switch {
		case errors.Is(err, webhookdelivery.ErrNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Webhook delivery not found.", nil)
		case errors.Is(err, webhookdelivery.ErrInvalidState):
			httpresponse.Error(w, r, http.StatusConflict, "WEBHOOK_RESEND_NOT_ALLOWED", "Webhook delivery cannot be resent in its current state.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to resend webhook delivery.", nil)
		}
		return
	}
	setStoreID(r, item.StoreID)
	setOptionalTransactionID(r, item.TransactionID)
	setOptionalOrderID(r, item.OrderID)

	httpresponse.Success(w, http.StatusAccepted, item)
}

func isWebhookDeliveryStatus(value string) bool {
	switch value {
	case "pending", "retrying", "success", "failed_permanently":
		return true
	default:
		return false
	}
}
