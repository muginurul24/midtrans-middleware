export type OverviewMetric = {
	label: string;
	value: string;
	delta: string;
	trend: "up" | "down" | "neutral";
	helper: string;
	tone: "default" | "emerald" | "blue" | "orange";
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
	createdAt: string;
};
