export type APIError = Error & {
	statusCode?: number;
	code?: string;
	requestId?: string;
};

export type TokenPair = {
	access_token: string;
	refresh_token: string;
	token_type: string;
	access_expires_at: string;
	refresh_expires_at: string;
};

export type User = {
	id: string;
	name: string;
	email: string;
	role: string;
	created_at: string;
	updated_at: string;
};

export type MFAState = {
	required: boolean;
	enabled: boolean;
	verified: boolean;
	setup_required: boolean;
	can_access_dashboard: boolean;
	recovery_codes_regenerated_at?: string | null;
};

export type MFASetup = {
	issuer: string;
	account_name: string;
	secret: string;
	otpauth_url: string;
};

export type MFAVerifyResponse = {
	mfa: MFAState;
	recovery_codes?: string[];
};

export type PasswordResetPreview = {
	reset_token: string;
	reset_path: string;
	expires_at: string;
};

export type PasswordResetRequestResponse = {
	message: string;
	preview?: PasswordResetPreview | null;
};

export type AlertEndpointChannel = "webhook" | "slack_webhook" | "discord_webhook";
export type AlertEndpointEvent = "webhook.failed_permanently";

export type AlertEndpoint = {
	id: string;
	user_id: string;
	name: string;
	channel: AlertEndpointChannel;
	destination_url: string;
	events: AlertEndpointEvent[];
	status: "active" | "inactive";
	has_auth_token: boolean;
	last_tested_at?: string | null;
	last_triggered_at?: string | null;
	last_success_at?: string | null;
	last_error?: string | null;
	created_at: string;
	updated_at: string;
};

export type AlertEndpointTestDispatch = {
	alert_delivery_id: string;
	status: string;
};

export type Store = {
	id: string;
	user_id: string;
	name: string;
	slug: string;
	domain?: string | null;
	default_callback_url?: string | null;
	status: "active" | "inactive";
	created_at: string;
	updated_at: string;
	webhook_secret?: string;
};

export type StoreSecret = {
	store_id: string;
	secret: string;
};

export type StoreToken = {
	id: string;
	store_id: string;
	name: string;
	token_prefix: string;
	scopes: string[];
	last_used_at?: string | null;
	expires_at?: string | null;
	revoked_at?: string | null;
	created_at: string;
	token?: string;
};

export type DashboardTransaction = {
	id: string;
	order_id: string;
	platform_order_id: string;
	midtrans_transaction_id?: string | null;
	payment_type: string;
	gross_amount: number;
	currency: string;
	status: string;
	fraud_status?: string | null;
	callback_url?: string | null;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
	paid_at?: string | null;
};

export type WebhookDelivery = {
	id: string;
	store_id: string;
	transaction_id?: string | null;
	midtrans_webhook_id?: string | null;
	order_id?: string | null;
	callback_url: string;
	event_type: string;
	status: string;
	attempt_count: number;
	response_status?: number | null;
	duration_ms?: number | null;
	last_attempt_at?: string | null;
	last_error?: string | null;
	next_attempt_at?: string | null;
	delivered_at?: string | null;
	failed_at?: string | null;
	created_at: string;
	updated_at: string;
};

export type WebhookDeliveryAttempt = {
	id: string;
	attempt_number: number;
	request_headers: Record<string, unknown>;
	request_body: Record<string, unknown>;
	response_status?: number | null;
	response_body?: string | null;
	error_message?: string | null;
	duration_ms?: number | null;
	attempted_at: string;
};

export type WebhookDeliveryDetail = {
	delivery: WebhookDelivery & { payload: Record<string, unknown> };
	attempts: WebhookDeliveryAttempt[];
};

export type PaginationMeta = {
	total: number;
	limit: number;
	offset: number;
	has_next: boolean;
};

export type DashboardTransactionListResponse = {
	transactions: DashboardTransaction[];
	meta: PaginationMeta;
};

export type WebhookDeliveryListResponse = {
	deliveries: WebhookDelivery[];
	meta: PaginationMeta;
};

export type AuditLog = {
	id: string;
	request_id: string;
	actor_type: string;
	actor_id?: string | null;
	direction: string;
	method?: string | null;
	url?: string | null;
	status_code?: number | null;
	request_body: Record<string, unknown>;
	response_body: Record<string, unknown>;
	error_message?: string | null;
	duration_ms?: number | null;
	created_at: string;
};

export type AuditLogListResponse = {
	logs: AuditLog[];
	meta: PaginationMeta;
};
