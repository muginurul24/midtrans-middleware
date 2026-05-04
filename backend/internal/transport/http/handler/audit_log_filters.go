package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"payment-platform/backend/internal/app/transaction"
	httpresponse "payment-platform/backend/internal/transport/http/response"
)

const auditLogDateLayout = "2006-01-02"

func decodeAuditLogListInput(w http.ResponseWriter, r *http.Request) (transaction.AuditLogListInput, bool) {
	limit := 50
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 || parsedLimit > 200 {
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audit log limit.", nil)
			return transaction.AuditLogListInput{}, false
		}
		limit = parsedLimit
	}

	offset := 0
	if rawOffset := r.URL.Query().Get("offset"); rawOffset != "" {
		parsedOffset, err := strconv.Atoi(rawOffset)
		if err != nil || parsedOffset < 0 {
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audit log offset.", nil)
			return transaction.AuditLogListInput{}, false
		}
		offset = parsedOffset
	}

	direction := strings.TrimSpace(r.URL.Query().Get("direction"))
	if direction != "" && !isAuditLogDirection(direction) {
		httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audit log direction filter.", nil)
		return transaction.AuditLogListInput{}, false
	}

	var statusCode *int
	if rawStatusCode := strings.TrimSpace(r.URL.Query().Get("status_code")); rawStatusCode != "" {
		parsedStatusCode, err := strconv.Atoi(rawStatusCode)
		if err != nil || parsedStatusCode < 100 || parsedStatusCode > 599 {
			httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audit log status_code filter.", nil)
			return transaction.AuditLogListInput{}, false
		}
		statusCode = &parsedStatusCode
	}

	createdFrom, ok := parseAuditLogDateQuery(w, r, "created_from")
	if !ok {
		return transaction.AuditLogListInput{}, false
	}

	createdToDate, ok := parseAuditLogDateQuery(w, r, "created_to")
	if !ok {
		return transaction.AuditLogListInput{}, false
	}

	if createdFrom != nil && createdToDate != nil && createdFrom.After(*createdToDate) {
		httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audit log date range.", nil)
		return transaction.AuditLogListInput{}, false
	}

	var createdTo *time.Time
	if createdToDate != nil {
		value := createdToDate.AddDate(0, 0, 1)
		createdTo = &value
	}

	return transaction.AuditLogListInput{
		Limit:       limit,
		Offset:      offset,
		Direction:   direction,
		Query:       strings.TrimSpace(r.URL.Query().Get("query")),
		RequestID:   strings.TrimSpace(r.URL.Query().Get("request_id")),
		OrderID:     strings.TrimSpace(r.URL.Query().Get("order_id")),
		Endpoint:    strings.TrimSpace(r.URL.Query().Get("endpoint")),
		StatusCode:  statusCode,
		CreatedFrom: createdFrom,
		CreatedTo:   createdTo,
	}, true
}

func parseAuditLogDateQuery(w http.ResponseWriter, r *http.Request, parameter string) (*time.Time, bool) {
	rawValue := strings.TrimSpace(r.URL.Query().Get(parameter))
	if rawValue == "" {
		return nil, true
	}

	parsed, err := time.ParseInLocation(auditLogDateLayout, rawValue, time.UTC)
	if err != nil {
		httpresponse.Error(w, r, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audit log date filter.", nil)
		return nil, false
	}

	value := parsed.UTC()
	return &value, true
}
