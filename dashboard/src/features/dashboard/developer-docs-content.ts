import { env } from '@/lib/env'

const apiBaseURL = env.apiBaseURL.replace(/\/$/, '')

export const developerTokenSnippet = `curl -X POST ${apiBaseURL}/v1/dashboard/stores/{store_id}/api-tokens \\
  -H "Authorization: Bearer <dashboard_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Backend Production",
    "scopes": ["transaction:create", "transaction:read"]
  }'`

export const developerChargeSnippet = `curl -X POST ${apiBaseURL}/v1/transactions/charge \\
  -H "Authorization: Bearer <store_api_token>" \\
  -H "Idempotency-Key: INV-2026-0001" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "INV-2026-0001",
    "amount": 150000,
    "currency": "IDR",
    "payment_type": "bank_transfer",
    "bank": "bca",
    "customer": {
      "name": "Budi",
      "email": "budi@example.com",
      "phone": "08123456789"
    },
    "items": [
      {
        "id": "SKU-001",
        "name": "Produk A",
        "price": 150000,
        "quantity": 1
      }
    ],
    "callback_url": "https://tokouser.com/api/payment/callback",
    "metadata": {
      "cart_id": "cart_123"
    }
  }'`

export const developerChargeSuccessSnippet = `{
  "success": true,
  "data": {
    "transaction_id": "7dd41ec0-1c48-492a-b2df-8be28b4115b8",
    "order_id": "INV-2026-0001",
    "platform_order_id": "store123_INV-2026-0001",
    "status": "pending",
    "payment_type": "bank_transfer",
    "amount": 150000,
    "midtrans": {
      "transaction_id": "midtrans_transaction_id",
      "va_numbers": [
        {
          "bank": "bca",
          "va_number": "1234567890123456"
        }
      ],
      "transaction_status": "pending",
      "fraud_status": "accept"
    }
  }
}`

export const developerChargeErrorSnippet = `{
  "success": false,
  "error": {
    "code": "TRANSACTION_CONFLICT",
    "message": "Order ID already exists with different payload.",
    "request_id": "req_abc123",
    "details": {}
  }
}`

export const developerWebhookHeadersSnippet = `POST https://tokouser.com/api/payment/callback
Content-Type: application/json
X-Webhook-Id: <delivery_id>
X-Webhook-Timestamp: <unix_timestamp>
X-Webhook-Signature: sha256=<signature>`

export const developerSignatureSnippet = `signature = hex(
  hmac_sha256(
    key = webhook_secret,
    message = X-Webhook-Timestamp + "." + raw_request_body
  )
)`

export const developerWebhookPayloadSnippet = `{
  "event": "transaction.updated",
  "webhook_id": "2f18a945-0f89-4713-958e-7dc238cb4d9d",
  "store_id": "9ab66fb6-cfbd-44ba-8df9-499c53e55d12",
  "order_id": "INV-2026-0001",
  "transaction_id": "7dd41ec0-1c48-492a-b2df-8be28b4115b8",
  "status": "paid",
  "payment_type": "bank_transfer",
  "amount": 150000,
  "currency": "IDR",
  "midtrans": {
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "transaction_id": "midtrans_transaction_id"
  },
  "metadata": {
    "cart_id": "cart_123"
  }
}`

export const developerReliabilityRules = [
  'Idempotency-Key wajib unik per order charge.',
  'Replay dengan order_id dan payload yang sama akan mengembalikan transaksi lama, bukan membuat transaksi baru.',
  'Replay dengan order_id yang sama tetapi payload berbeda akan gagal dengan TRANSACTION_CONFLICT.',
  'Rate limit default adalah 60 request per menit per token dan 300 request per menit per store.',
]

export const statusLegend = [
  'paid/success -> sukses',
  'pending/retrying -> menunggu atau sedang dicoba ulang',
  'failed/failed_permanently -> gagal dan butuh investigasi',
  'expired/cancelled -> transaksi berhenti sebelum dibayar',
]
