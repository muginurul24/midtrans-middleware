package handler

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	apitoken "payment-platform/backend/internal/app/token"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type StoreTokenHandler struct {
	service *apitoken.Service
}

func NewStoreTokenHandler(service *apitoken.Service) *StoreTokenHandler {
	return &StoreTokenHandler{service: service}
}

func (h *StoreTokenHandler) List(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	tokens, err := h.service.ListForStore(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"))
	if err != nil {
		if errors.Is(err, apitoken.ErrStoreNotFound) {
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch API tokens.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"tokens": tokens,
	})
}

func (h *StoreTokenHandler) Create(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	var request struct {
		Name      string     `json:"name"`
		Scopes    []string   `json:"scopes"`
		ExpiresAt *time.Time `json:"expires_at"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	created, err := h.service.CreateForStore(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"), apitoken.CreateInput{
		Name:      request.Name,
		Scopes:    request.Scopes,
		ExpiresAt: request.ExpiresAt,
	})
	if err != nil {
		switch {
		case errors.Is(err, apitoken.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid API token payload.", nil)
		case errors.Is(err, apitoken.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		case errors.Is(err, apitoken.ErrConflict):
			httpresponse.Error(w, r, http.StatusConflict, "CONFLICT", "API token prefix already exists.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create API token.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusCreated, created)
}

func (h *StoreTokenHandler) Delete(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	if err := h.service.RevokeForStore(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"), chi.URLParam(r, "token_id")); err != nil {
		switch {
		case errors.Is(err, apitoken.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		case errors.Is(err, apitoken.ErrTokenNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "API token not found.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to revoke API token.", nil)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *StoreTokenHandler) Rotate(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}
	setStoreID(r, chi.URLParam(r, "store_id"))

	created, err := h.service.RotateForStore(r.Context(), principal.UserID, principal.Role, chi.URLParam(r, "store_id"), chi.URLParam(r, "token_id"))
	if err != nil {
		switch {
		case errors.Is(err, apitoken.ErrStoreNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "Store not found.", nil)
		case errors.Is(err, apitoken.ErrTokenNotFound):
			httpresponse.Error(w, r, http.StatusNotFound, "NOT_FOUND", "API token not found.", nil)
		case errors.Is(err, apitoken.ErrTokenRevoked):
			httpresponse.Error(w, r, http.StatusConflict, "TOKEN_REVOKED", "API token has already been revoked.", nil)
		case errors.Is(err, apitoken.ErrConflict):
			httpresponse.Error(w, r, http.StatusConflict, "CONFLICT", "API token prefix already exists.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to rotate API token.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, created)
}
