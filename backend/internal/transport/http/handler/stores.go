package handler

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"payment-platform/backend/internal/app/store"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type StoreHandler struct {
	service *store.Service
}

func NewStoreHandler(service *store.Service) *StoreHandler {
	return &StoreHandler{service: service}
}

func (h *StoreHandler) List(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	stores, err := h.service.ListByUser(r.Context(), principal.UserID, principal.Role)
	if err != nil {
		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch stores.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"stores": stores,
	})
}

func (h *StoreHandler) Create(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	var request struct {
		Name               string `json:"name"`
		Slug               string `json:"slug"`
		Domain             string `json:"domain"`
		DefaultCallbackURL string `json:"default_callback_url"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	created, err := h.service.Create(r.Context(), principal.UserID, store.CreateInput{
		Name:               request.Name,
		Slug:               request.Slug,
		Domain:             request.Domain,
		DefaultCallbackURL: request.DefaultCallbackURL,
	})
	if err != nil {
		switch {
		case errors.Is(err, store.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid store payload.", nil)
		case errors.Is(err, store.ErrConflict):
			httpresponse.Error(w, r, http.StatusConflict, "CONFLICT", "Store slug already exists.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create store.", nil)
		}
		return
	}
	setStoreID(r, created.ID)

	httpresponse.Success(w, http.StatusCreated, created)
}

func (h *StoreHandler) Get(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	item, err := h.service.GetByUser(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch store.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, item)
}

func (h *StoreHandler) Update(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	var request struct {
		Name               *string `json:"name"`
		Domain             *string `json:"domain"`
		DefaultCallbackURL *string `json:"default_callback_url"`
		Status             *string `json:"status"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	item, err := h.service.UpdateByUser(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"), store.UpdateInput{
		Name:               request.Name,
		Domain:             request.Domain,
		DefaultCallbackURL: request.DefaultCallbackURL,
		Status:             request.Status,
	})
	if err != nil {
		switch {
		case errors.Is(err, store.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid store update payload.", nil)
		case errors.Is(err, store.ErrNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update store.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, item)
}

func (h *StoreHandler) ViewWebhookSecret(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	secret, err := h.service.ViewWebhookSecretByUser(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to reveal webhook secret.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, secret)
}

func (h *StoreHandler) RotateWebhookSecret(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	secret, err := h.service.RotateWebhookSecretByUser(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to rotate webhook secret.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, secret)
}

func (h *StoreHandler) Delete(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	if err := h.service.DeactivateByUser(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id")); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to deactivate store.", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
