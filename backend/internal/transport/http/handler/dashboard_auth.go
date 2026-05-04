package handler

import (
	"errors"
	"net/http"

	"payment-platform/backend/internal/app/auth"
	httpmiddleware "payment-platform/backend/internal/transport/http/middleware"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

type DashboardAuthHandler struct {
	service *auth.Service
}

func NewDashboardAuthHandler(service *auth.Service) *DashboardAuthHandler {
	return &DashboardAuthHandler{service: service}
}

func (h *DashboardAuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	user, tokens, mfa, err := h.service.Register(r.Context(), auth.RegisterInput{
		Name:     request.Name,
		Email:    request.Email,
		Password: request.Password,
	})
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid register payload.", nil)
		case errors.Is(err, auth.ErrEmailExists):
			httpresponse.Error(w, r, http.StatusConflict, "CONFLICT", "Email is already registered.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to register user.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusCreated, map[string]any{
		"user":   user,
		"tokens": tokens,
		"mfa":    mfa,
	})
}

func (h *DashboardAuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	user, tokens, mfa, err := h.service.Login(r.Context(), auth.LoginInput{
		Email:    request.Email,
		Password: request.Password,
	})
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid login payload.", nil)
		case errors.Is(err, auth.ErrInvalidCredentials):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to login.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"user":   user,
		"tokens": tokens,
		"mfa":    mfa,
	})
}

func (h *DashboardAuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Email string `json:"email"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	result, err := h.service.RequestPasswordReset(r.Context(), request.Email)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid forgot password payload.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to prepare password reset.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusAccepted, result)
}

func (h *DashboardAuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	err := h.service.ResetPassword(r.Context(), request.Token, request.NewPassword)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid reset password payload.", nil)
		case errors.Is(err, auth.ErrPasswordResetInvalid):
			httpresponse.Error(w, r, http.StatusBadRequest, "RESET_TOKEN_INVALID", "Reset token is invalid, expired, or already used.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to reset password.", nil)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DashboardAuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var request struct {
		RefreshToken string `json:"refresh_token"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	tokens, mfa, err := h.service.Refresh(r.Context(), request.RefreshToken)
	if err != nil {
		if errors.Is(err, auth.ErrUnauthorized) {
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid refresh token.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to refresh session.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"tokens": tokens,
		"mfa":    mfa,
	})
}

func (h *DashboardAuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	if err := h.service.Logout(r.Context(), principal); err != nil {
		if errors.Is(err, auth.ErrUnauthorized) {
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Session already revoked.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to logout.", nil)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DashboardAuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	var request struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	err := h.service.ChangePassword(r.Context(), principal, request.CurrentPassword, request.NewPassword)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid password payload.", nil)
		case errors.Is(err, auth.ErrUnauthorized):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session.", nil)
		case errors.Is(err, auth.ErrCurrentPasswordInvalid):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Current password is incorrect.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to change password.", nil)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *DashboardAuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	user, mfa, err := h.service.Me(r.Context(), principal)
	if err != nil {
		if errors.Is(err, auth.ErrUnauthorized) {
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "User not found.", nil)
			return
		}

		httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch current user.", nil)
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"user": user,
		"mfa":  mfa,
	})
}

func (h *DashboardAuthHandler) SetupMFA(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	setup, err := h.service.SetupTOTP(r.Context(), principal)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrUnauthorized):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session.", nil)
		case errors.Is(err, auth.ErrMFAAlreadyEnabled):
			httpresponse.Error(w, r, http.StatusConflict, "MFA_ALREADY_ENABLED", "MFA is already enabled.", nil)
		case errors.Is(err, auth.ErrMFAVerificationPending):
			httpresponse.Error(w, r, http.StatusConflict, "MFA_VERIFICATION_REQUIRED", "Verify the current MFA state first.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to prepare MFA setup.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, setup)
}

func (h *DashboardAuthHandler) VerifyMFA(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	var request struct {
		Code string `json:"code"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	result, err := h.service.VerifyTOTP(r.Context(), principal, request.Code)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid MFA payload.", nil)
		case errors.Is(err, auth.ErrUnauthorized):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session.", nil)
		case errors.Is(err, auth.ErrMFASetupRequired):
			httpresponse.Error(w, r, http.StatusConflict, "MFA_SETUP_REQUIRED", "MFA setup has not been completed.", nil)
		case errors.Is(err, auth.ErrInvalidMFACode):
			httpresponse.Error(w, r, http.StatusUnauthorized, "MFA_CODE_INVALID", "Invalid MFA code.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to verify MFA.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"mfa":            result.MFA,
		"recovery_codes": result.RecoveryCodes,
	})
}

func (h *DashboardAuthHandler) RotateMFA(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	setup, err := h.service.RotateTOTP(r.Context(), principal)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrUnauthorized):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session.", nil)
		case errors.Is(err, auth.ErrMFAVerificationPending):
			httpresponse.Error(w, r, http.StatusConflict, "MFA_VERIFICATION_REQUIRED", "Verify this session before rotating MFA.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to rotate MFA setup.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, setup)
}

func (h *DashboardAuthHandler) DisableMFA(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	var request struct {
		Code string `json:"code"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	mfa, err := h.service.DisableTOTP(r.Context(), principal, request.Code)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid MFA payload.", nil)
		case errors.Is(err, auth.ErrUnauthorized):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session.", nil)
		case errors.Is(err, auth.ErrInvalidMFACode):
			httpresponse.Error(w, r, http.StatusUnauthorized, "MFA_CODE_INVALID", "Invalid MFA or recovery code.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to disable MFA.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"mfa": mfa,
	})
}

func (h *DashboardAuthHandler) RegenerateRecoveryCodes(w http.ResponseWriter, r *http.Request) {
	principal, ok := httpmiddleware.DashboardPrincipalFromContext(r.Context())
	if !ok {
		httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Missing dashboard principal.", nil)
		return
	}

	var request struct {
		Code string `json:"code"`
	}

	if !decodeJSON(w, r, &request) {
		return
	}

	recoveryCodes, err := h.service.RegenerateRecoveryCodes(r.Context(), principal, request.Code)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrValidation):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid MFA payload.", nil)
		case errors.Is(err, auth.ErrUnauthorized):
			httpresponse.Error(w, r, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid session.", nil)
		case errors.Is(err, auth.ErrMFASetupRequired):
			httpresponse.Error(w, r, http.StatusConflict, "MFA_SETUP_REQUIRED", "MFA is not enabled yet.", nil)
		case errors.Is(err, auth.ErrInvalidMFACode):
			httpresponse.Error(w, r, http.StatusUnauthorized, "MFA_CODE_INVALID", "Invalid MFA or recovery code.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to regenerate recovery codes.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, map[string]any{
		"recovery_codes": recoveryCodes,
	})
}
