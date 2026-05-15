# Store API End-to-End

Dokumen ini menunjukkan alur minimum store developer dari pembuatan token sampai membaca status transaksi.

## 1. Prasyarat

- API lokal atau environment target sudah hidup.
- Dashboard user sudah punya `store_id`.
- Anda punya `dashboard_access_token` untuk membuat Store API token.

Contoh base URL:

```bash
export API_BASE_URL="http://localhost:8080"
export STORE_ID="<store_id>"
export DASHBOARD_ACCESS_TOKEN="<dashboard_access_token>"
```

## 2. Buat Store API Token

```bash
curl -X POST "$API_BASE_URL/v1/dashboard/stores/$STORE_ID/api-tokens" \
  -H "Authorization: Bearer $DASHBOARD_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Backend Production",
    "scopes": ["transaction:create", "transaction:read"]
  }'
```

Response sukses:

```json
{
  "success": true,
  "data": {
    "id": "4a5d6f8b-4d6e-4b2f-97d4-f87f86d70df6",
    "store_id": "9ab66fb6-cfbd-44ba-8df9-499c53e55d12",
    "name": "Backend Production",
    "token_prefix": "tok_paygate_7sQ2m",
    "scopes": ["transaction:create", "transaction:read"],
    "last_used_at": null,
    "expires_at": null,
    "revoked_at": null,
    "created_at": "2026-05-02T10:00:00Z",
    "token": "tok_paygate_example_7sQ2m3pZ8m2d2Kb1bV6Jr9qL"
  }
}
```

Simpan `data.token` segera. Nilai ini hanya tampil pada response create atau rotate token.

```bash
export STORE_API_TOKEN="<data.token>"
```

## 3. Buat Charge

Gunakan `Idempotency-Key` unik untuk setiap order.

```bash
export ORDER_ID="INV-2026-0001"

curl -X POST "$API_BASE_URL/v1/transactions/charge" \
  -H "Authorization: Bearer $STORE_API_TOKEN" \
  -H "Idempotency-Key: $ORDER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "INV-2026-0001",
    "amount": 150000,
    "currency": "IDR",
    "payment_type": "bank_transfer",
    "bank": "bsi",
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
  }'
```

Response sukses:

```json
{
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
          "bank": "bsi",
          "va_number": "1234567890123456"
        }
      ],
      "transaction_status": "pending",
      "fraud_status": "accept"
    }
  }
}
```

## 4. Baca Status Transaksi

```bash
curl "$API_BASE_URL/v1/transactions/$ORDER_ID" \
  -H "Authorization: Bearer $STORE_API_TOKEN"
```

Contoh response setelah webhook settlement diproses:

```json
{
  "success": true,
  "data": {
    "id": "7dd41ec0-1c48-492a-b2df-8be28b4115b8",
    "order_id": "INV-2026-0001",
    "platform_order_id": "store123_INV-2026-0001",
    "midtrans_transaction_id": "midtrans_transaction_id",
    "payment_type": "bank_transfer",
    "gross_amount": 150000,
    "currency": "IDR",
    "status": "paid",
    "fraud_status": "accept",
    "metadata": {
      "cart_id": "cart_123"
    },
    "created_at": "2026-05-02T10:25:12Z",
    "updated_at": "2026-05-02T10:31:00Z",
    "paid_at": "2026-05-02T10:30:00Z"
  }
}
```

## 5. Error yang Perlu Ditangani

Payload berbeda dengan `order_id` yang sama:

```json
{
  "success": false,
  "error": {
    "code": "TRANSACTION_CONFLICT",
    "message": "Order ID already exists with different payload.",
    "request_id": "req_abc123",
    "details": {}
  }
}
```

Rate limit:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded.",
    "request_id": "req_abc123",
    "details": {
      "token_limit": 60,
      "store_limit": 300
    }
  }
}
```

## 6. Aturan Integrasi Penting

- Replay dengan `Idempotency-Key` dan payload yang sama akan mengembalikan transaksi lama.
- Replay dengan `order_id` yang sama tetapi payload berbeda akan gagal dengan `TRANSACTION_CONFLICT`.
- Rate limit default adalah 60 request per menit per token dan 300 request per menit per store.
- Callback URL dapat dikirim per request atau memakai `default_callback_url` store.
