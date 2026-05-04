import { get, writable } from "svelte/store";

import { env } from "$lib/api/env";
import type {
	APIError,
	AlertEndpoint,
	AlertEndpointTestDispatch,
	AuditLogListResponse,
	DashboardTransactionListResponse,
	MFASetup,
	MFAState,
	MFAVerifyResponse,
	PasswordResetRequestResponse,
	Store,
	StoreSecret,
	StoreToken,
	TokenPair,
	User,
	WebhookDeliveryDetail,
	WebhookDeliveryListResponse,
} from "$lib/api/types";

export type SessionPersistence = "local" | "session";

type StoredSession = {
	user: User;
	tokens: TokenPair;
	mfa: MFAState;
	persistence: SessionPersistence;
};

type SessionState = {
	isReady: boolean;
	isBootstrapping: boolean;
	user: User | null;
	tokens: TokenPair | null;
	mfa: MFAState | null;
	persistence: SessionPersistence;
};

const storageKey = "paygate-dashboard-session";

let refreshPromise: Promise<TokenPair> | null = null;
let bootstrapPromise: Promise<void> | null = null;
let pendingRedirect = "/app";

function isBrowser() {
	return typeof window !== "undefined";
}

function getStorage(type: SessionPersistence) {
	if (!isBrowser()) return null;
	return type === "local" ? window.localStorage : window.sessionStorage;
}

function clearStoredSession() {
	if (!isBrowser()) return;
	window.localStorage.removeItem(storageKey);
	window.sessionStorage.removeItem(storageKey);
}

function readStoredSession(): StoredSession | null {
	if (!isBrowser()) return null;

	for (const type of ["session", "local"] as const) {
		const storage = getStorage(type);
		const raw = storage?.getItem(storageKey);
		if (!raw) continue;

		try {
			const parsed = JSON.parse(raw) as StoredSession;
			return {
				...parsed,
				persistence: parsed.persistence === "session" ? "session" : "local",
			};
		} catch {
			storage?.removeItem(storageKey);
		}
	}

	return null;
}

function writeStoredSession(session: StoredSession | null) {
	clearStoredSession();
	if (!isBrowser() || !session) return;
	getStorage(session.persistence)?.setItem(storageKey, JSON.stringify(session));
}

function decodeJWTPayload(token: string) {
	if (!isBrowser()) return null;

	const [, payload] = token.split(".");
	if (!payload) return null;

	try {
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
		return JSON.parse(window.atob(padded)) as { exp?: number };
	} catch {
		return null;
	}
}

function isTokenExpired(token: string, skewSeconds = 30) {
	const payload = decodeJWTPayload(token);
	if (!payload?.exp) return true;
	return payload.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}

function createAPIError(message: string, input?: Partial<APIError>) {
	const error = new Error(message) as APIError;
	error.statusCode = input?.statusCode;
	error.code = input?.code;
	error.requestId = input?.requestId;
	return error;
}

async function parseResponse<T>(response: Response): Promise<T> {
	const payload = (await response.json().catch(() => null)) as
		| { success?: boolean; data?: T; error?: { code?: string; message?: string; request_id?: string } }
		| null;

	if (!response.ok || payload?.success === false) {
		throw createAPIError(payload?.error?.message ?? `Request failed with status ${response.status}.`, {
			statusCode: response.status,
			code: payload?.error?.code,
			requestId: payload?.error?.request_id,
		});
	}

	return (payload?.data ?? null) as T;
}

const initialSession = readStoredSession();

function buildInitialState(): SessionState {
	return {
		isReady: false,
		isBootstrapping: false,
		user: initialSession?.user ?? null,
		tokens: initialSession?.tokens ?? null,
		mfa: initialSession?.mfa ?? null,
		persistence: initialSession?.persistence ?? "local",
	};
}

export const session = writable<SessionState>(buildInitialState());

function applySession(
	user: User,
	tokens: TokenPair,
	mfa: MFAState,
	persistence: SessionPersistence,
	ready = true,
) {
	const next: StoredSession = { user, tokens, mfa, persistence };
	writeStoredSession(next);
	session.set({
		isReady: ready,
		isBootstrapping: false,
		user,
		tokens,
		mfa,
		persistence,
	});
}

export function clearSession() {
	writeStoredSession(null);
	session.set({
		isReady: true,
		isBootstrapping: false,
		user: null,
		tokens: null,
		mfa: null,
		persistence: "local",
	});
}

export function setPendingRedirect(path: string) {
	pendingRedirect = path.startsWith("/app") ? path : "/app";
}

export function consumePendingRedirect() {
	const next = pendingRedirect;
	pendingRedirect = "/app";
	return next;
}

async function performFetch<T>(
	path: string,
	init?: RequestInit & { skipAuth?: boolean; accessTokenOverride?: string },
): Promise<T> {
	const state = get(session);
	const skipAuth = init?.skipAuth ?? false;
	const accessToken = init?.accessTokenOverride ?? state.tokens?.access_token;
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type") && init?.body !== undefined) {
		headers.set("Content-Type", "application/json");
	}

	if (!skipAuth && accessToken) {
		headers.set("Authorization", `Bearer ${accessToken}`);
	}

	const response = await fetch(new URL(path, env.apiBaseURL), {
		...init,
		headers,
	});

	if (!skipAuth && response.status === 401 && state.tokens?.refresh_token) {
		const nextTokens = await refreshTokens();
		return performFetch<T>(path, {
			...init,
			accessTokenOverride: nextTokens.access_token,
		});
	}

	return parseResponse<T>(response);
}

export async function apiFetch<T>(path: string, init?: RequestInit & { skipAuth?: boolean }) {
	try {
		return await performFetch<T>(path, init);
	} catch (error) {
		const apiError = error as APIError;
		if (apiError.statusCode === 401) {
			clearSession();
		}
		throw apiError;
	}
}

export async function refreshTokens(): Promise<TokenPair> {
	const state = get(session);
	if (!state.tokens?.refresh_token) {
		throw createAPIError("Missing refresh token.");
	}

	if (refreshPromise) {
		return refreshPromise;
	}

	refreshPromise = fetch(new URL("/v1/dashboard/auth/refresh", env.apiBaseURL), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			refresh_token: state.tokens.refresh_token,
		}),
	})
		.then((response) => parseResponse<{ tokens: TokenPair; mfa: MFAState }>(response))
		.then(({ tokens, mfa }) => {
			const current = get(session);
			if (!current.user) {
				throw createAPIError("Missing current user.");
			}

			applySession(current.user, tokens, mfa, current.persistence);
			return tokens;
		})
		.catch((error) => {
			clearSession();
			throw error;
		})
		.finally(() => {
			refreshPromise = null;
		});

	return refreshPromise;
}

export async function bootstrapSession(options?: { preferRefresh?: boolean }) {
	if (bootstrapPromise) return bootstrapPromise;

	const stored = readStoredSession();
	if (!stored) {
		session.update((current) => ({
			...current,
			isReady: true,
			isBootstrapping: false,
			user: null,
			tokens: null,
			mfa: null,
		}));
		return;
	}

	session.update((current) => ({
		...current,
		isBootstrapping: true,
		isReady: false,
	}));

	bootstrapPromise = (async () => {
		try {
			let tokens = stored.tokens;
			const refreshExpired = !tokens.refresh_token || isTokenExpired(tokens.refresh_token);
			if (refreshExpired) {
				clearStoredSession();
				session.set({
					isReady: true,
					isBootstrapping: false,
					user: null,
					tokens: null,
					mfa: null,
					persistence: "local",
				});
				return;
			}

			const accessExpired = !tokens.access_token || isTokenExpired(tokens.access_token);
			if (options?.preferRefresh || accessExpired) {
				const refreshPayload = await fetch(new URL("/v1/dashboard/auth/refresh", env.apiBaseURL), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						refresh_token: tokens.refresh_token,
					}),
				}).then((response) => parseResponse<{ tokens: TokenPair; mfa: MFAState }>(response));

				tokens = refreshPayload.tokens;
			}

			let meResponse = await fetch(new URL("/v1/dashboard/me", env.apiBaseURL), {
				headers: {
					Authorization: `Bearer ${tokens.access_token}`,
				},
			});

			if (meResponse.status === 401 && tokens.refresh_token && !isTokenExpired(tokens.refresh_token)) {
				const refreshPayload = await fetch(new URL("/v1/dashboard/auth/refresh", env.apiBaseURL), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						refresh_token: tokens.refresh_token,
					}),
				}).then((response) => parseResponse<{ tokens: TokenPair; mfa: MFAState }>(response));

				tokens = refreshPayload.tokens;
				meResponse = await fetch(new URL("/v1/dashboard/me", env.apiBaseURL), {
					headers: {
						Authorization: `Bearer ${tokens.access_token}`,
					},
				});
			}

			const data = await parseResponse<{ user: User; mfa: MFAState }>(meResponse);
			applySession(data.user, tokens, data.mfa, stored.persistence);
		} catch {
			clearStoredSession();
			session.set({
				isReady: true,
				isBootstrapping: false,
				user: null,
				tokens: null,
				mfa: null,
				persistence: "local",
			});
		} finally {
			bootstrapPromise = null;
		}
	})();

	return bootstrapPromise;
}

export async function reloadSession() {
	const state = get(session);
	if (!state.tokens) {
		throw createAPIError("Missing active session.");
	}

	const data = await apiFetch<{ user: User; mfa: MFAState }>("/v1/dashboard/me");
	applySession(data.user, state.tokens, data.mfa, state.persistence);
	return data.mfa;
}

export async function login(
	input: { email: string; password: string },
	options?: { persistence?: SessionPersistence },
) {
	const data = await apiFetch<{ user: User; tokens: TokenPair; mfa: MFAState }>(
		"/v1/dashboard/auth/login",
		{
			method: "POST",
			skipAuth: true,
			body: JSON.stringify(input),
		},
	);

	applySession(data.user, data.tokens, data.mfa, options?.persistence ?? "local");
	return data.mfa;
}

export async function register(
	input: { name: string; email: string; password: string },
	options?: { persistence?: SessionPersistence },
) {
	const data = await apiFetch<{ user: User; tokens: TokenPair; mfa: MFAState }>(
		"/v1/dashboard/auth/register",
		{
			method: "POST",
			skipAuth: true,
			body: JSON.stringify(input),
		},
	);

	applySession(data.user, data.tokens, data.mfa, options?.persistence ?? "local");
	return data.mfa;
}

export async function logout() {
	try {
		if (get(session).tokens?.access_token) {
			await apiFetch<void>("/v1/dashboard/auth/logout", {
				method: "POST",
			});
		}
	} finally {
		clearSession();
	}
}

export async function changePassword(input: { current_password: string; new_password: string }) {
	return apiFetch<void>("/v1/dashboard/auth/change-password", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function requestPasswordReset(input: { email: string }) {
	return apiFetch<PasswordResetRequestResponse>("/v1/dashboard/auth/forgot-password", {
		method: "POST",
		skipAuth: true,
		body: JSON.stringify(input),
	});
}

export async function resetPassword(input: { token: string; new_password: string }) {
	await apiFetch<void>("/v1/dashboard/auth/reset-password", {
		method: "POST",
		skipAuth: true,
		body: JSON.stringify(input),
	});
}

export async function setupMfa(rotate = false) {
	return apiFetch<MFASetup>(rotate ? "/v1/dashboard/auth/mfa/rotate" : "/v1/dashboard/auth/mfa/setup", {
		method: "POST",
	});
}

export async function verifyMfa(code: string) {
	const data = await apiFetch<MFAVerifyResponse>("/v1/dashboard/auth/mfa/verify", {
		method: "POST",
		body: JSON.stringify({ code }),
	});

	await reloadSession();
	return data;
}

export async function disableMfa(code: string) {
	const data = await apiFetch<{ mfa: MFAState }>("/v1/dashboard/auth/mfa/disable", {
		method: "POST",
		body: JSON.stringify({ code }),
	});

	const current = get(session);
	if (current.user && current.tokens) {
		applySession(current.user, current.tokens, data.mfa, current.persistence);
	}

	return data.mfa;
}

export async function regenerateRecoveryCodes(code: string) {
	const data = await apiFetch<{ recovery_codes: string[] }>(
		"/v1/dashboard/auth/mfa/recovery/regenerate",
		{
			method: "POST",
			body: JSON.stringify({ code }),
		},
	);

	await reloadSession();
	return data.recovery_codes ?? [];
}

export const dashboardApi = {
	listAlertEndpoints() {
		return apiFetch<{ endpoints: AlertEndpoint[] }>("/v1/dashboard/alert-endpoints").then(
			(data) => data.endpoints ?? [],
		);
	},
	createAlertEndpoint(input: {
		name: string;
		channel: "webhook" | "slack_webhook" | "discord_webhook";
		destination_url: string;
		events?: string[];
		status?: "active" | "inactive";
		auth_token?: string;
	}) {
		return apiFetch<AlertEndpoint>("/v1/dashboard/alert-endpoints", {
			method: "POST",
			body: JSON.stringify(input),
		});
	},
	updateAlertEndpoint(
		endpointID: string,
		input: {
			name?: string;
			channel?: "webhook" | "slack_webhook" | "discord_webhook";
			destination_url?: string;
			events?: string[];
			status?: "active" | "inactive";
			auth_token?: string;
			clear_auth_token?: boolean;
		},
	) {
		return apiFetch<AlertEndpoint>(`/v1/dashboard/alert-endpoints/${endpointID}`, {
			method: "PATCH",
			body: JSON.stringify(input),
		});
	},
	deleteAlertEndpoint(endpointID: string) {
		return apiFetch<void>(`/v1/dashboard/alert-endpoints/${endpointID}`, {
			method: "DELETE",
		});
	},
	sendTestAlertEndpoint(endpointID: string) {
		return apiFetch<AlertEndpointTestDispatch>(
			`/v1/dashboard/alert-endpoints/${endpointID}/test`,
			{
				method: "POST",
			},
		);
	},
	listStores() {
		return apiFetch<{ stores: Store[] }>("/v1/dashboard/stores").then((data) => data.stores ?? []);
	},
	createStore(input: {
		name: string;
		domain?: string;
		default_callback_url?: string;
	}) {
		return apiFetch<Store & { webhook_secret: string }>("/v1/dashboard/stores", {
			method: "POST",
			body: JSON.stringify(input),
		});
	},
	updateStore(
		storeID: string,
		input: {
			name?: string | null;
			domain?: string | null;
			default_callback_url?: string | null;
			status?: string | null;
		},
	) {
		return apiFetch<Store>(`/v1/dashboard/stores/${storeID}`, {
			method: "PATCH",
			body: JSON.stringify(input),
		});
	},
	deactivateStore(storeID: string) {
		return apiFetch<void>(`/v1/dashboard/stores/${storeID}`, {
			method: "DELETE",
		});
	},
	viewWebhookSecret(storeID: string) {
		return apiFetch<StoreSecret>(`/v1/dashboard/stores/${storeID}/webhook-secret`);
	},
	rotateWebhookSecret(storeID: string) {
		return apiFetch<StoreSecret>(`/v1/dashboard/stores/${storeID}/webhook-secret/rotate`, {
			method: "POST",
		});
	},
	listTokens(storeID: string) {
		return apiFetch<{ tokens: StoreToken[] }>(`/v1/dashboard/stores/${storeID}/api-tokens`).then(
			(data) => data.tokens ?? [],
		);
	},
	createToken(
		storeID: string,
		input: { name: string; scopes?: string[]; expires_at?: string | null },
	) {
		return apiFetch<StoreToken>(`/v1/dashboard/stores/${storeID}/api-tokens`, {
			method: "POST",
			body: JSON.stringify(input),
		});
	},
	revokeToken(storeID: string, tokenID: string) {
		return apiFetch<void>(`/v1/dashboard/stores/${storeID}/api-tokens/${tokenID}`, {
			method: "DELETE",
		});
	},
	rotateToken(storeID: string, tokenID: string) {
		return apiFetch<StoreToken>(`/v1/dashboard/stores/${storeID}/api-tokens/${tokenID}/rotate`, {
			method: "POST",
		});
	},
	listTransactions(storeID: string, input?: { limit?: number; offset?: number; status?: string; query?: string }) {
		const params = new URLSearchParams();
		if (input?.limit) params.set("limit", String(input.limit));
		if (input?.offset) params.set("offset", String(input.offset));
		if (input?.status && input.status !== "all") params.set("status", input.status);
		if (input?.query) params.set("query", input.query);

		const suffix = params.size > 0 ? `?${params.toString()}` : "";
		return apiFetch<DashboardTransactionListResponse>(
			`/v1/dashboard/stores/${storeID}/transactions${suffix}`,
		);
	},
	getTransaction(storeID: string, transactionID: string) {
		return apiFetch<import("$lib/api/types").DashboardTransaction>(
			`/v1/dashboard/stores/${storeID}/transactions/${transactionID}`,
		);
	},
	listWebhookDeliveries(
		storeID: string,
		input?: { limit?: number; offset?: number; status?: string; query?: string },
	) {
		const params = new URLSearchParams();
		if (input?.limit) params.set("limit", String(input.limit));
		if (input?.offset) params.set("offset", String(input.offset));
		if (input?.status && input.status !== "all") params.set("status", input.status);
		if (input?.query) params.set("query", input.query);

		const suffix = params.size > 0 ? `?${params.toString()}` : "";
		return apiFetch<WebhookDeliveryListResponse>(
			`/v1/dashboard/stores/${storeID}/webhook-deliveries${suffix}`,
		);
	},
	getWebhookDelivery(deliveryID: string) {
		return apiFetch<WebhookDeliveryDetail>(`/v1/dashboard/webhook-deliveries/${deliveryID}`);
	},
	resendWebhookDelivery(deliveryID: string) {
		return apiFetch<import("$lib/api/types").WebhookDelivery>(
			`/v1/dashboard/webhook-deliveries/${deliveryID}/resend`,
			{
				method: "POST",
			},
		);
	},
	listAuditLogs(
		storeID: string,
		input?: {
			limit?: number;
			offset?: number;
			direction?: string;
			query?: string;
			request_id?: string;
			order_id?: string;
			endpoint?: string;
			status_code?: string;
			created_from?: string;
			created_to?: string;
		},
	) {
		const params = new URLSearchParams();
		if (input?.limit) params.set("limit", String(input.limit));
		if (input?.offset) params.set("offset", String(input.offset));
		if (input?.direction && input.direction !== "all") params.set("direction", input.direction);
		if (input?.query) params.set("query", input.query);
		if (input?.request_id) params.set("request_id", input.request_id);
		if (input?.order_id) params.set("order_id", input.order_id);
		if (input?.endpoint) params.set("endpoint", input.endpoint);
		if (input?.status_code) params.set("status_code", input.status_code);
		if (input?.created_from) params.set("created_from", input.created_from);
		if (input?.created_to) params.set("created_to", input.created_to);

		const suffix = params.size > 0 ? `?${params.toString()}` : "";
		return apiFetch<AuditLogListResponse>(`/v1/dashboard/stores/${storeID}/audit-logs${suffix}`);
	},
};
