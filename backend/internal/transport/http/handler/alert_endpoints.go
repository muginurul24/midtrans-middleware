package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"payment-platform/backend/internal/app/alertendpoint"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type AlertEndpointHandler struct {
	service *alertendpoint.Service
}

func NewAlertEndpointHandler(service *alertendpoint.Service) *AlertEndpointHandler {
	return &AlertEndpointHandler{service: service}
}

func (h *AlertEndpointHandler) List(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	items, err := h.service.ListByUser(r.Context(), principal.UserID)
	if err != nil {
		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch operational alert endpoints.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"endpoints": items,
	})
}

func (h *AlertEndpointHandler) Create(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	var request struct {
		Name           string   `json:"name"`
		Channel        string   `json:"channel"`
		DestinationURL string   `json:"destination_url"`
		Events         []string `json:"events"`
		Status         string   `json:"status"`
		AuthToken      string   `json:"auth_token"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}

	item, err := h.service.CreateByUser(r.Context(), principal.UserID, alertendpoint.CreateInput{
		Name:           request.Name,
		Channel:        request.Channel,
		DestinationURL: request.DestinationURL,
		Events:         request.Events,
		Status:         request.Status,
		AuthToken:      request.AuthToken,
	})
	if err != nil {
		switch {
		case errors.Is(err, alertendpoint.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid alert endpoint payload.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create alert endpoint.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusCreated, item)
}

func (h *AlertEndpointHandler) Update(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	var request struct {
		Name           *string  `json:"name"`
		Channel        *string  `json:"channel"`
		DestinationURL *string  `json:"destination_url"`
		Events         []string `json:"events"`
		Status         *string  `json:"status"`
		AuthToken      *string  `json:"auth_token"`
		ClearAuthToken bool     `json:"clear_auth_token"`
	}
	if !decodeJSON(w, r, &request) {
		return
	}

	item, err := h.service.UpdateByUser(r.Context(), principal.UserID, chi.URLParam(r, "endpoint_id"), alertendpoint.UpdateInput{
		Name:           request.Name,
		Channel:        request.Channel,
		DestinationURL: request.DestinationURL,
		Events:         request.Events,
		Status:         request.Status,
		AuthToken:      request.AuthToken,
		ClearAuthToken: request.ClearAuthToken,
	})
	if err != nil {
		switch {
		case errors.Is(err, alertendpoint.ErrNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Alert endpoint not found.", nil)
		case errors.Is(err, alertendpoint.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid alert endpoint payload.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update alert endpoint.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, item)
}

func (h *AlertEndpointHandler) Delete(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	err := h.service.DeleteByUser(r.Context(), principal.UserID, chi.URLParam(r, "endpoint_id"))
	if err != nil {
		switch {
		case errors.Is(err, alertendpoint.ErrNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Alert endpoint not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete alert endpoint.", nil)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AlertEndpointHandler) SendTest(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	result, err := h.service.SendTestByUser(r.Context(), principal.UserID, chi.URLParam(r, "endpoint_id"))
	if err != nil {
		switch {
		case errors.Is(err, alertendpoint.ErrNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Alert endpoint not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to enqueue test alert.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusAccepted, result)
}
