package httpresponse

import (
	"encoding/json"
	"net/http"

	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"payment-platform/backend/internal/platform/requestlog"
)

func JSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if payload == nil {
		return
	}

	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(true)

	_ = encoder.Encode(payload)
}

func Success(w http.ResponseWriter, statusCode int, data any) {
	JSON(w, statusCode, map[string]any{
		"success": true,
		"data":    data,
	})
}

func Error(w http.ResponseWriter, r *http.Request, statusCode int, code string, message string, details map[string]any) {
	if details == nil {
		details = map[string]any{}
	}

	requestlog.SetErrorCode(r.Context(), code)

	JSON(w, statusCode, map[string]any{
		"success": false,
		"error": map[string]any{
			"code":       code,
			"message":    message,
			"request_id": chimiddleware.GetReqID(r.Context()),
			"details":    details,
		},
	})
}
