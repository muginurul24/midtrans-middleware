package tasks

const TypeAlertNotify = "alert.notify"

type AlertNotifyPayload struct {
	AlertDeliveryID string `json:"alert_delivery_id"`
}
