package tasks

const TypeWebhookDeliver = "webhook.deliver"

type WebhookDeliverPayload struct {
	WebhookDeliveryID string `json:"webhook_delivery_id"`
	StoreID           string `json:"store_id"`
	TransactionID     string `json:"transaction_id"`
}
