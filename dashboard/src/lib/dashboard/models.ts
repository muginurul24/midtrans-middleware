export type OverviewMetric = {
	label: string;
	value: string;
	delta: string;
	trend: "up" | "down" | "neutral";
	helper: string;
	tone: "default" | "emerald" | "blue" | "orange";
};

export type StoreHealthSummary = {
	storeId: string;
	storeName: string;
	storeStatus: "active" | "inactive";
	callbackUrl?: string | null;
	score: number;
	healthLabel: "Sehat" | "Stabil" | "Perlu perhatian" | "Kritis";
	tone: "emerald" | "blue" | "amber" | "red";
	transactionCount: number;
	paidCount: number;
	successRate: number;
	failedDeliveries: number;
	retryingDeliveries: number;
	summary: string;
};

export type StoreObservabilitySummary = {
	storeId: string;
	storeName: string;
	storeStatus: "active" | "inactive";
	callbackUrl?: string | null;
	totalDeliveries: number;
	successfulDeliveries: number;
	successRatio: number;
	p95LatencyMs: number | null;
	averageLatencyMs: number | null;
	recentRetrying: number;
	previousRetrying: number;
	retryDelta: number;
	recentFailed: number;
	previousFailed: number;
	failedDelta: number;
	latestAttemptAt?: string | null;
	latestResponseStatus?: number | null;
	tone: "emerald" | "blue" | "amber" | "red";
	summary: string;
};

export type OperationalAlert = {
	id: string;
	severity: "critical" | "warning" | "info";
	category:
		| "webhook_failed"
		| "webhook_retrying"
		| "store_inactive"
		| "callback_missing";
	title: string;
	summary: string;
	storeId: string;
	storeName: string;
	orderId?: string;
	deliveryId?: string;
	callbackUrl?: string | null;
	statusLabel: string;
	actionLabel: string;
	attemptLabel?: string;
	timeLabel?: string;
	canResend?: boolean;
	createdAt?: string;
};

export type OverviewStore = {
	id: string;
	label: string;
	domain: string;
	callback: string;
	status: "active" | "inactive";
};

export type OverviewTransaction = {
	id: string;
	orderId: string;
	storeId: string;
	store: string;
	amount: number;
	method: string;
	type: string;
	status: "paid" | "pending" | "failed" | "expired" | "cancelled" | "challenge";
	time: string;
	platformOrderId: string;
	callbackUrl?: string | null;
	createdAt: string;
	updatedAt: string;
	paidAt?: string | null;
	midtransTransactionId?: string | null;
	fraudStatus?: string | null;
	metadata: Record<string, unknown>;
};

export type OverviewWebhookDelivery = {
	id: string;
	storeId: string;
	orderId: string;
	store: string;
	status: "success" | "retrying" | "failed_permanently" | "pending";
	attempt: number;
	time: string;
	statusCode: number;
	callbackUrl: string;
	eventType: string;
	responseStatus?: number | null;
	durationMs?: number | null;
	lastAttemptAt?: string | null;
	lastError?: string | null;
	createdAt: string;
};

export type GlobalSearchAuditLog = {
	id: string;
	requestId: string;
	storeId: string;
	storeName: string;
	method: string;
	url: string;
	statusCode?: number | null;
	errorMessage?: string | null;
	createdAt: string;
};
