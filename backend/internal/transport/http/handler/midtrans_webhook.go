package handler

import (
	"errors"
	"io"
	"net/http"

	chimiddleware "github.com/go-chi/chi/v5/middleware"

	"payment-platform/backend/internal/app/webhook"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

const webhookBodyLimit = 1 << 20

type MidtransWebhookHandler struct {
	service *webhook.Service
}

func NewMidtransWebhookHandler(service *webhook.Service) *MidtransWebhookHandler {
	return &MidtransWebhookHandler{service: service}
}

func (h *MidtransWebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	bodyReader := http.MaxBytesReader(w, r.Body, webhookBodyLimit)
	defer bodyReader.Close()

	rawBody, err := io.ReadAll(bodyReader)
	if err != nil {
		httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid Midtrans webhook payload.", nil)
		return
	}

	result, err := h.service.Process(r.Context(), webhook.ProcessInput{
		RequestID: chimiddleware.GetReqID(r.Context()),
		RawBody:   rawBody,
	})
	if err != nil {
		switch {
		case errors.Is(err, webhook.ErrInvalidPayload):
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid Midtrans webhook payload.", nil)
		case errors.Is(err, webhook.ErrInvalidSignature):
			httpresponse.Error(w, r, http.StatusUnauthorized, "WEBHOOK_SIGNATURE_INVALID", "Invalid Midtrans webhook signature.", nil)
		default:
			httpresponse.Error(w, r, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to process Midtrans webhook.", nil)
		}
		return
	}

	httpresponse.Success(w, http.StatusOK, result)
}
