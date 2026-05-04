export type StoreStatus = 'active' | 'inactive'

export type Store = {
  id: string
  user_id: string
  name: string
  slug: string
  domain?: string | null
  default_callback_url?: string | null
  status: StoreStatus
  created_at: string
  updated_at: string
  webhook_secret?: string
}

export type StoreToken = {
  id: string
  store_id: string
  name: string
  token_prefix: string
  scopes: string[]
  last_used_at?: string | null
  expires_at?: string | null
  revoked_at?: string | null
  created_at: string
  token?: string
}

export type TokenCreateFormValues = {
  name: string
  scopes: string[]
}

export type StoreCreateForm = {
  name: string
  slug: string
  domain: string
  default_callback_url: string
}

export type StoreSettingsForm = {
  name: string
  domain: string
  default_callback_url: string
  status: StoreStatus
}

export type PasswordForm = {
  current_password: string
  new_password: string
}

export type DashboardTransaction = {
  id: string
  order_id: string
  platform_order_id: string
  midtrans_transaction_id?: string | null
  payment_type: string
  gross_amount: number
  currency: string
  status: string
  fraud_status?: string | null
  callback_url?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  paid_at?: string | null
}

export type PaginationMeta = {
  total: number
  limit: number
  offset: number
  has_next: boolean
}

export type DashboardTransactionListResponse = {
  transactions: DashboardTransaction[]
  meta: PaginationMeta
}

export type AuditLog = {
  id: string
  request_id: string
  actor_type: string
  actor_id?: string | null
  direction: string
  method?: string | null
  url?: string | null
  status_code?: number | null
  request_body: Record<string, unknown>
  response_body: Record<string, unknown>
  error_message?: string | null
  duration_ms?: number | null
  created_at: string
}

export type AuditLogListResponse = {
  logs: AuditLog[]
  meta: PaginationMeta
}

export type AuditLogFilters = {
  direction: string
  query: string
  requestId: string
  orderId: string
  endpoint: string
  statusCode: string
  createdFrom: string
  createdTo: string
}

export type WebhookDelivery = {
  id: string
  store_id: string
  transaction_id?: string | null
  midtrans_webhook_id?: string | null
  order_id?: string | null
  callback_url: string
  event_type: string
  status: string
  attempt_count: number
  next_attempt_at?: string | null
  delivered_at?: string | null
  failed_at?: string | null
  created_at: string
  updated_at: string
}

export type WebhookDeliveryAttempt = {
  id: string
  attempt_number: number
  request_headers: Record<string, unknown>
  request_body: Record<string, unknown>
  response_status?: number | null
  response_body?: string | null
  error_message?: string | null
  duration_ms?: number | null
  attempted_at: string
}

export type WebhookDeliveryDetail = {
  delivery: WebhookDelivery & { payload: Record<string, unknown> }
  attempts: WebhookDeliveryAttempt[]
}

export type WebhookDeliveryListResponse = {
  deliveries: WebhookDelivery[]
  meta: PaginationMeta
}

export type FilterOption = {
  value: string
  label: string
}

export type DashboardTab = 'overview' | 'tokens' | 'transactions' | 'audit' | 'webhooks' | 'docs' | 'profile'
