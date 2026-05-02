package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	httpresponse "payment-platform/backend/internal/transport/http/response"
)

const (
	defaultJSONBodyLimit = 64 << 10
	chargeJSONBodyLimit  = 256 << 10
)

func decodeJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	return decodeJSONWithLimit(w, r, destination, defaultJSONBodyLimit)
}

func decodeChargeJSON(w http.ResponseWriter, r *http.Request, destination any) bool {
	return decodeJSONWithLimit(w, r, destination, chargeJSONBodyLimit)
}

func decodeJSONWithLimit(w http.ResponseWriter, r *http.Request, destination any, maxBytes int64) bool {
	if maxBytes <= 0 {
		maxBytes = defaultJSONBodyLimit
	}

	bodyReader := http.MaxBytesReader(w, r.Body, maxBytes)
	defer bodyReader.Close()

	decoder := json.NewDecoder(bodyReader)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Request payload is too large.", nil)
			return false
		}

		httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid JSON payload.", nil)
		return false
	}

	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid JSON payload.", nil)
		return false
	}

	return true
}
