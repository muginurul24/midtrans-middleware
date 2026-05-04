<script lang="ts">
	import { onDestroy } from "svelte";
	import { goto } from "$lib/spa";
	import { toast } from "svelte-sonner";
	import {
		BookOpenIcon,
		DownloadIcon,
		KeyRoundIcon,
		LoaderCircleIcon,
		PlusIcon,
		RefreshCcwIcon,
	} from "@lucide/svelte";

	import type {
		AlertEndpoint,
		AuditLog,
		APIError,
		DashboardTransaction,
		Store,
		StoreSecret,
		StoreToken,
		WebhookDeliveryDetail,
	} from "$lib/api/types";
	import {
		changePassword,
		dashboardApi,
		logout,
		reloadSession,
		session,
	} from "$lib/auth/session";
	import AppSidebar from "$lib/components/app-sidebar.svelte";
	import ApiDocsPanel from "$lib/components/api-docs-panel.svelte";
	import AlertEndpointsPanel from "$lib/components/alert-endpoints-panel.svelte";
	import Calendar01 from "$lib/components/calendar-01.svelte";
	import ChartAreaInteractive from "$lib/components/chart-area-interactive.svelte";
	import DataTable from "$lib/components/data-table.svelte";
	import GlobalSearchSheet from "$lib/components/global-search-sheet.svelte";
	import OperationalAlertsPanel from "$lib/components/operational-alerts-panel.svelte";
	import ProfileSessionPanel from "$lib/components/profile-session-panel.svelte";
	import SavedViewPanel from "$lib/components/saved-view-panel.svelte";
	import SectionCards from "$lib/components/section-cards.svelte";
	import SiteHeader from "$lib/components/site-header.svelte";
	import StoreHealthPanel from "$lib/components/store-health-panel.svelte";
	import StoreObservabilityPanel from "$lib/components/store-observability-panel.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as Select from "$lib/components/ui/select";
	import * as Sheet from "$lib/components/ui/sheet";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import type {
		GlobalSearchAuditLog,
		OperationalAlert,
		OverviewMetric,
		OverviewTransaction,
		OverviewWebhookDelivery,
		StoreHealthSummary,
		StoreObservabilitySummary,
	} from "$lib/dashboard/models";
	import {
		dashboardTabMeta,
		resolveDashboardTab,
	} from "$lib/dashboard/tabs";
	import {
		createSavedView,
		loadSavedViews,
		persistSavedViews,
		type DashboardSavedView,
	} from "$lib/dashboard/saved-views";
	import { downloadCSV, exportTimestamp, slugifyFilenamePart } from "$lib/export/csv";

	export let route:
		| {
				result?: {
					path?: {
						params?: Record<string, string>;
					};
				};
		  }
		| undefined = undefined;

	type RangeKey = "7d" | "30d" | "month";
	type TransactionSavedFilters = {
		query: string;
		status: string;
	};
	type WebhookSavedFilters = {
		query: string;
		status: string;
	};
	type AuditSavedFilters = {
		query: string;
	};

	let selectedStore = "all";
	let selectedRange: RangeKey = "7d";
	let transactionQuery = "";
	let transactionStatus = "all";
	let webhookQuery = "";
	let webhookStatus = "all";
	let auditQuery = "";
	let stores: Store[] = [];
	let storeTokens: StoreToken[] = [];
	let auditLogs: AuditLog[] = [];
	let transactions: OverviewTransaction[] = [];
	let webhookDeliveries: OverviewWebhookDelivery[] = [];
	let storesLoading = false;
	let workspaceLoading = false;
	let storesRevision = 0;
	let workspaceError = "";
	let revealedSecret: StoreSecret | null = null;
	let lastIssuedToken: StoreToken | null = null;
	let detailOpen = false;
	let detailLoading = false;
	let detailMode: "transaction" | "webhook" = "transaction";
	let transactionDetail: DashboardTransaction | null = null;
	let webhookDetail: WebhookDeliveryDetail | null = null;
	let operationalAlertsOpen = false;
	let createStoreSubmitting = false;
	let updateStoreSubmitting = false;
	let tokenSubmitting = false;
	let passwordSubmitting = false;
	let profileRefreshing = false;
	let alertEndpointsLoading = false;
	let alertEndpointSaving = false;
	let alertEndpointTestingId: string | null = null;
	let alertEndpointDeletingId: string | null = null;
	let createStoreForm = {
		name: "",
		domain: "",
		defaultCallbackURL: "",
	};
	let updateStoreForm = {
		name: "",
		domain: "",
		defaultCallbackURL: "",
		status: "active",
	};
	let tokenForm = {
		name: "",
		scopes: "transaction:create, transaction:read",
	};
	let initializedUserId = "";
	let workspaceKey = "";
	let managedStoreKey = "";
	let pageLoading = false;
	let pageError = "";
	let globalSearchOpen = false;
	let globalSearchQuery = "";
	let globalSearchLoading = false;
	let globalSearchError = "";
	let globalSearchTimer: ReturnType<typeof setTimeout> | null = null;
	let globalSearchRequestID = 0;
	let globalSearchResults: {
		stores: Store[];
		transactions: OverviewTransaction[];
		webhooks: OverviewWebhookDelivery[];
		auditLogs: GlobalSearchAuditLog[];
	} = {
		stores: [],
		transactions: [],
		webhooks: [],
		auditLogs: [],
	};
	let savedViewsUserId = "";
	let profileAlertUserId = "";
	let alertEndpoints: AlertEndpoint[] = [];
	let transactionSavedViews: DashboardSavedView<TransactionSavedFilters>[] = [];
	let webhookSavedViews: DashboardSavedView<WebhookSavedFilters>[] = [];
	let auditSavedViews: DashboardSavedView<AuditSavedFilters>[] = [];

	$: activeTab = resolveDashboardTab(route?.result?.path?.params?.tab);
	$: activeStoreLabel =
		selectedStore === "all"
			? "Semua Toko"
			: stores.find((store) => store.id === selectedStore)?.name ?? "Semua Toko";
	$: activeTransactionViewId =
		transactionSavedViews.find(
			(view) =>
				view.storeId === selectedStore &&
				view.filters.query === transactionQuery &&
				view.filters.status === transactionStatus,
		)?.id ?? "";
	$: activeWebhookViewId =
		webhookSavedViews.find(
			(view) =>
				view.storeId === selectedStore &&
				view.filters.query === webhookQuery &&
				view.filters.status === webhookStatus,
		)?.id ?? "";
	$: activeAuditViewId =
		auditSavedViews.find(
			(view) => view.storeId === selectedStore && view.filters.query === auditQuery,
		)?.id ?? "";
	$: transactionViewSuggestion =
		transactionQuery.trim().length > 0
			? `Transaksi • ${transactionQuery.trim().slice(0, 24)}`
			: transactionStatus !== "all"
				? `Transaksi • ${transactionStatus}`
				: `Transaksi • ${activeStoreLabel}`;
	$: webhookViewSuggestion =
		webhookQuery.trim().length > 0
			? `Webhook • ${webhookQuery.trim().slice(0, 24)}`
			: webhookStatus !== "all"
				? `Webhook • ${webhookStatus}`
				: `Webhook • ${activeStoreLabel}`;
	$: auditViewSuggestion =
		auditQuery.trim().length > 0
			? `Audit • ${auditQuery.trim().slice(0, 24)}`
			: `Audit • ${activeStoreLabel}`;
	$: currentManagedStoreId =
		selectedStore !== "all" ? selectedStore : stores[0]?.id ?? "";
	$: currentManagedStore = stores.find((store) => store.id === currentManagedStoreId) ?? null;
	$: if (currentManagedStore && currentManagedStore.id !== managedStoreKey) {
		managedStoreKey = currentManagedStore.id;
		revealedSecret = null;
		lastIssuedToken = null;
		updateStoreForm = {
			name: currentManagedStore.name,
			domain: currentManagedStore.domain ?? "",
			defaultCallbackURL: currentManagedStore.default_callback_url ?? "",
			status: currentManagedStore.status,
		};
	}
	$: if ($session.isReady && $session.user?.id && $session.user.id !== initializedUserId) {
		initializedUserId = $session.user.id;
		void loadStores();
	}
	$: if ($session.isReady && !$session.user && initializedUserId) {
		initializedUserId = "";
		stores = [];
		storeTokens = [];
		auditLogs = [];
		transactions = [];
		webhookDeliveries = [];
	}
	$: if ($session.user?.id && $session.user.id !== savedViewsUserId) {
		savedViewsUserId = $session.user.id;
		transactionSavedViews = loadSavedViews<TransactionSavedFilters>(savedViewsUserId, "transactions");
		webhookSavedViews = loadSavedViews<WebhookSavedFilters>(savedViewsUserId, "webhooks");
		auditSavedViews = loadSavedViews<AuditSavedFilters>(savedViewsUserId, "audit");
	}
	$: if (!$session.user && savedViewsUserId) {
		savedViewsUserId = "";
		transactionSavedViews = [];
		webhookSavedViews = [];
		auditSavedViews = [];
	}
	$: if (activeTab === "profile" && $session.user?.id && $session.user.id !== profileAlertUserId) {
		profileAlertUserId = $session.user.id;
		void loadAlertEndpoints();
	}
	$: if (!$session.user && profileAlertUserId) {
		profileAlertUserId = "";
		alertEndpoints = [];
	}
	$: {
		const nextKey = `${initializedUserId}:${storesRevision}:${activeTab}:${selectedStore}`;
		if (initializedUserId && activeTab !== "profile" && stores.length >= 0 && nextKey !== workspaceKey) {
			workspaceKey = nextKey;
			void loadWorkspace();
		}
	}
	$: pageLoading = activeTab === "profile" ? false : storesLoading || workspaceLoading;
	$: pageError = activeTab === "profile" ? "" : workspaceError;

	function formatRp(amount: number) {
		return `Rp ${amount.toLocaleString("id-ID")}`;
	}

	function formatDateTime(value?: string | null) {
		if (!value) return "Belum tersedia";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "Belum tersedia";
		return new Intl.DateTimeFormat("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "Asia/Jakarta",
		}).format(date);
	}

	function formatRelativeTime(value?: string | null) {
		if (!value) return "Baru saja";
		const date = new Date(value);
		const diff = Date.now() - date.getTime();
		if (Number.isNaN(diff)) return "Baru saja";
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return "Baru saja";
		if (minutes < 60) return `${minutes} menit lalu`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} jam lalu`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `${days} hari lalu`;
		return formatDateTime(value);
	}

	function rangeStart(range: RangeKey) {
		const now = new Date();
		if (range === "7d") {
			return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		}
		if (range === "30d") {
			return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		}
		return new Date(now.getFullYear(), now.getMonth(), 1);
	}

	function rangeLabel(range: RangeKey) {
		if (range === "7d") return "7 Hari Terakhir";
		if (range === "30d") return "30 Hari Terakhir";
		return "Bulan Ini";
	}

	function midpointBetween(start: Date, end: Date) {
		return new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
	}

	function percentile(values: number[], p: number) {
		if (values.length === 0) return null;
		const sorted = [...values].sort((left, right) => left - right);
		const position = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1);
		return sorted[position] ?? sorted[sorted.length - 1] ?? null;
	}

	function resetGlobalSearchResults() {
		globalSearchResults = {
			stores: [],
			transactions: [],
			webhooks: [],
			auditLogs: [],
		};
	}

	function getSearchScopedStores() {
		return selectedStore === "all"
			? stores
			: stores.filter((store) => store.id === selectedStore);
	}

	function normalizeTransactionStatus(value: string): OverviewTransaction["status"] {
		switch (value) {
			case "paid":
			case "pending":
			case "failed":
			case "expired":
			case "cancelled":
			case "challenge":
				return value;
			default:
				return "pending";
		}
	}

	function normalizeWebhookStatus(value: string): OverviewWebhookDelivery["status"] {
		switch (value) {
			case "success":
			case "retrying":
			case "failed_permanently":
			case "pending":
				return value;
			default:
				return "pending";
		}
	}

	function paymentMethodLabel(paymentType: string) {
		switch (paymentType) {
			case "bank_transfer":
				return "Bank Transfer";
			case "qris":
				return "QRIS";
			case "gopay":
				return "GoPay";
			case "shopeepay":
				return "ShopeePay";
			case "cstore":
				return "Convenience Store";
			default:
				return paymentType.replaceAll("_", " ");
		}
	}

	function rangeFiltered<T extends { createdAt: string }>(items: T[]) {
		const start = rangeStart(selectedRange);
		return items.filter((item) => new Date(item.createdAt) >= start);
	}

	function toOverviewTransaction(store: Store, item: DashboardTransaction): OverviewTransaction {
		return {
			id: item.id,
			orderId: item.order_id,
			storeId: store.id,
			store: store.name,
			amount: item.gross_amount,
			method: paymentMethodLabel(item.payment_type),
			type: item.payment_type,
			status: normalizeTransactionStatus(item.status),
			time: formatRelativeTime(item.created_at),
			platformOrderId: item.platform_order_id,
			callbackUrl: item.callback_url,
			createdAt: item.created_at,
			updatedAt: item.updated_at,
			paidAt: item.paid_at,
			midtransTransactionId: item.midtrans_transaction_id,
			fraudStatus: item.fraud_status,
			metadata: item.metadata ?? {},
		};
	}

	function toOverviewWebhook(store: Store, item: import("$lib/api/types").WebhookDelivery): OverviewWebhookDelivery {
		return {
			id: item.id,
			storeId: store.id,
			orderId: item.order_id ?? "-",
			store: store.name,
			status: normalizeWebhookStatus(item.status),
			attempt: item.attempt_count,
			time: formatRelativeTime(item.created_at),
			statusCode:
				item.response_status ??
				(item.status === "success" ? 200 : item.status === "retrying" ? 504 : 0),
			callbackUrl: item.callback_url,
			eventType: item.event_type,
			responseStatus: item.response_status,
			durationMs: item.duration_ms,
			lastAttemptAt: item.last_attempt_at,
			lastError: item.last_error,
			createdAt: item.created_at,
		};
	}

	async function fetchAllTransactionsForStore(store: Store) {
		const items: OverviewTransaction[] = [];
		let offset = 0;
		const limit = 200;

		while (true) {
			const response = await dashboardApi.listTransactions(store.id, { limit, offset });
			items.push(...response.transactions.map((item) => toOverviewTransaction(store, item)));
			if (!response.meta.has_next) break;
			offset += response.transactions.length;
			if (offset > 2000) break;
		}

		return items;
	}

	async function fetchAllDeliveriesForStore(store: Store) {
		const items: OverviewWebhookDelivery[] = [];
		let offset = 0;
		const limit = 200;

		while (true) {
			const response = await dashboardApi.listWebhookDeliveries(store.id, { limit, offset });
			items.push(...response.deliveries.map((item) => toOverviewWebhook(store, item)));
			if (!response.meta.has_next) break;
			offset += response.deliveries.length;
			if (offset > 2000) break;
		}

		return items;
	}

	function getScopedStores() {
		return selectedStore === "all"
			? stores.filter((store) => store.status === "active")
			: stores.filter((store) => store.id === selectedStore);
	}

	async function loadTransactionsForScopedStores(scopedStores: Store[]) {
		return Promise.all(scopedStores.map((store) => fetchAllTransactionsForStore(store))).then((groups) =>
			groups.flat().sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
		);
	}

	async function loadDeliveriesForScopedStores(scopedStores: Store[]) {
		return Promise.all(scopedStores.map((store) => fetchAllDeliveriesForStore(store))).then((groups) =>
			groups.flat().sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)),
		);
	}

	async function searchTransactionsForStores(scopedStores: Store[], query: string) {
		return Promise.all(
			scopedStores.map(async (store) => {
				const response = await dashboardApi.listTransactions(store.id, {
					limit: 5,
					query,
				});
				return response.transactions.map((item) => toOverviewTransaction(store, item));
			}),
		).then((groups) =>
			groups
				.flat()
				.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
				.slice(0, 8),
		);
	}

	async function searchDeliveriesForStores(scopedStores: Store[], query: string) {
		return Promise.all(
			scopedStores.map(async (store) => {
				const response = await dashboardApi.listWebhookDeliveries(store.id, {
					limit: 5,
					query,
				});
				return response.deliveries.map((item) => toOverviewWebhook(store, item));
			}),
		).then((groups) =>
			groups
				.flat()
				.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
				.slice(0, 8),
		);
	}

	async function searchAuditLogsForStores(scopedStores: Store[], query: string) {
		return Promise.all(
			scopedStores.map(async (store) => {
				const response = await dashboardApi.listAuditLogs(store.id, {
					limit: 5,
					query,
				});
				return response.logs.map((item) => ({
					id: item.id,
					requestId: item.request_id,
					storeId: store.id,
					storeName: store.name,
					method: item.method ?? "HTTP",
					url: item.url ?? "-",
					statusCode: item.status_code,
					errorMessage: item.error_message,
					createdAt: item.created_at,
				}));
			}),
		).then((groups) =>
			groups
				.flat()
				.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
				.slice(0, 8),
		);
	}

	async function loadStores() {
		storesLoading = true;
		workspaceError = "";
		try {
			const nextStores = await dashboardApi.listStores();
			stores = nextStores;
			if (selectedStore !== "all" && !stores.some((store) => store.id === selectedStore)) {
				selectedStore = "all";
			}
			storesRevision += 1;
		} catch (caught) {
			const apiError = caught as APIError;
			workspaceError = apiError.message;
		} finally {
			storesLoading = false;
		}
	}

	async function loadAlertEndpoints() {
		if (!$session.user) return;

		alertEndpointsLoading = true;
		try {
			alertEndpoints = await dashboardApi.listAlertEndpoints();
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		} finally {
			alertEndpointsLoading = false;
		}
	}

	function wait(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function refreshAlertEndpointsAfterDispatch(
		endpointID: string,
		previousSnapshot?: {
			last_tested_at: string | null;
			last_success_at: string | null;
			last_triggered_at: string | null;
			last_error: string | null;
		},
	) {
		const maxAttempts = 6;

		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			await wait(attempt === 0 ? 600 : 900);
			await loadAlertEndpoints();

			const nextEndpoint = alertEndpoints.find((item) => item.id === endpointID);
			if (!nextEndpoint || !previousSnapshot) return;

			const hasChanged =
				nextEndpoint.last_tested_at !== previousSnapshot.last_tested_at ||
				nextEndpoint.last_success_at !== previousSnapshot.last_success_at ||
				nextEndpoint.last_triggered_at !== previousSnapshot.last_triggered_at ||
				nextEndpoint.last_error !== previousSnapshot.last_error;

			if (hasChanged) return;
		}
	}

	async function loadWorkspace() {
		workspaceLoading = true;
		workspaceError = "";
		try {
			if (activeTab === "profile" || activeTab === "docs") {
				return;
			}

			if (activeTab === "stores") {
				storeTokens = currentManagedStoreId
					? await dashboardApi.listTokens(currentManagedStoreId)
					: [];
				return;
			}

			if (activeTab === "audit") {
				auditLogs =
					selectedStore === "all"
						? []
						: (await dashboardApi.listAuditLogs(selectedStore, { limit: 100 })).logs ?? [];
				return;
			}

			const scopedStores = getScopedStores();

			if (scopedStores.length === 0) {
				if (activeTab === "overview" || activeTab === "transactions") {
					transactions = [];
				}
				if (activeTab === "overview" || activeTab === "webhooks") {
					webhookDeliveries = [];
				}
				return;
			}

			if (activeTab === "transactions") {
				transactions = await loadTransactionsForScopedStores(scopedStores);
				return;
			}

			if (activeTab === "webhooks") {
				webhookDeliveries = await loadDeliveriesForScopedStores(scopedStores);
				return;
			}

			const [nextTransactions, nextDeliveries] = await Promise.all([
				loadTransactionsForScopedStores(scopedStores),
				loadDeliveriesForScopedStores(scopedStores),
			]);

			transactions = nextTransactions;
			webhookDeliveries = nextDeliveries;
		} catch (caught) {
			const apiError = caught as APIError;
			workspaceError = apiError.message;
		} finally {
			workspaceLoading = false;
		}
	}

	async function runGlobalSearch(query: string) {
		const normalizedQuery = query.trim();
		if (normalizedQuery.length < 2) {
			globalSearchLoading = false;
			globalSearchError = "";
			resetGlobalSearchResults();
			return;
		}

		const requestID = ++globalSearchRequestID;
		globalSearchLoading = true;
		globalSearchError = "";

		const scopedStores = getSearchScopedStores();
		const searchableStores = selectedStore === "all" ? stores : scopedStores;
		const loweredQuery = normalizedQuery.toLowerCase();
		const storeResults = searchableStores
			.filter((store) => {
				const haystack = `${store.name} ${store.slug} ${store.domain ?? ""}`.toLowerCase();
				return haystack.includes(loweredQuery);
			})
			.slice(0, 6);

		try {
			const [transactionResults, webhookResults, auditResults] = await Promise.all([
				scopedStores.length > 0
					? searchTransactionsForStores(scopedStores, normalizedQuery)
					: Promise.resolve([]),
				scopedStores.length > 0
					? searchDeliveriesForStores(scopedStores, normalizedQuery)
					: Promise.resolve([]),
				scopedStores.length > 0
					? searchAuditLogsForStores(scopedStores, normalizedQuery)
					: Promise.resolve([]),
			]);

			if (requestID !== globalSearchRequestID) return;

			globalSearchResults = {
				stores: storeResults,
				transactions: transactionResults,
				webhooks: webhookResults,
				auditLogs: auditResults,
			};
		} catch (caught) {
			if (requestID !== globalSearchRequestID) return;
			const apiError = caught as APIError;
			globalSearchError = apiError.message;
			resetGlobalSearchResults();
		} finally {
			if (requestID === globalSearchRequestID) {
				globalSearchLoading = false;
			}
		}
	}

	function handleGlobalSearchQueryChange(value: string) {
		globalSearchQuery = value;
		globalSearchError = "";

		if (globalSearchTimer) {
			clearTimeout(globalSearchTimer);
			globalSearchTimer = null;
		}

		if (value.trim().length < 2) {
			globalSearchRequestID += 1;
			globalSearchLoading = false;
			resetGlobalSearchResults();
			return;
		}

		globalSearchTimer = setTimeout(() => {
			void runGlobalSearch(value);
		}, 250);
	}

	function openGlobalSearch() {
		globalSearchOpen = true;
		if (globalSearchQuery.trim().length >= 2) {
			void runGlobalSearch(globalSearchQuery);
		}
	}

	function handleGlobalSearchShortcut(event: KeyboardEvent) {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			openGlobalSearch();
		}
	}

	async function handleSearchStoreSelect(store: Store) {
		globalSearchOpen = false;
		selectedStore = store.id;
		goto("/app/stores");
	}

	async function handleSearchTransactionSelect(item: OverviewTransaction) {
		globalSearchOpen = false;
		selectedStore = item.storeId;
		goto("/app/transactions");
		await openTransactionDetail(item);
	}

	async function handleSearchWebhookSelect(item: OverviewWebhookDelivery) {
		globalSearchOpen = false;
		selectedStore = item.storeId;
		goto("/app/webhooks");
		await openWebhookDetail(item);
	}

	async function handleSearchAuditSelect(item: GlobalSearchAuditLog) {
		globalSearchOpen = false;
		selectedStore = item.storeId;
		auditQuery = item.requestId;
		goto("/app/audit");
	}

	onDestroy(() => {
		if (globalSearchTimer) {
			clearTimeout(globalSearchTimer);
		}
	});

	$: rangedTransactions = rangeFiltered(transactions);
	$: rangedDeliveries = rangeFiltered(webhookDeliveries);
	$: successfulTransactions = rangedTransactions.filter((item) => item.status === "paid");
	$: failedDeliveries = rangedDeliveries.filter((item) => item.status === "failed_permanently");
	$: retryingDeliveries = rangedDeliveries.filter((item) => item.status === "retrying");
	$: successRate =
		rangedTransactions.length === 0
			? 0
			: Math.round((successfulTransactions.length / rangedTransactions.length) * 1000) / 10;
	$: metrics = [
		{
			label: "Total Transaksi",
			value: rangedTransactions.length.toLocaleString("id-ID"),
			delta: `${rangedTransactions.length} order`,
			trend: "neutral",
			helper: rangeLabel(selectedRange).toLowerCase(),
			tone: "default",
		},
		{
			label: "Revenue",
			value: formatRp(
				successfulTransactions.reduce((total, item) => total + item.amount, 0),
			),
			delta: `${successfulTransactions.length} paid`,
			trend: successfulTransactions.length > 0 ? "up" : "neutral",
			helper: "akumulasi transaksi sukses",
			tone: "emerald",
		},
		{
			label: "Success Rate",
			value: `${successRate.toFixed(1)}%`,
			delta: `${successfulTransactions.length}/${rangedTransactions.length || 0}`,
			trend: successRate >= 90 ? "up" : successRate > 0 ? "down" : "neutral",
			helper: "status paid dalam rentang aktif",
			tone: "blue",
		},
		{
			label: "Webhook Gagal",
			value: failedDeliveries.length.toLocaleString("id-ID"),
			delta: `${retryingDeliveries.length} retrying`,
			trend: failedDeliveries.length > 0 ? "neutral" : "up",
			helper: "delivery butuh intervensi operator",
			tone: "orange",
		},
	] satisfies OverviewMetric[];
	$: healthScopedStores =
		selectedStore === "all" ? stores : stores.filter((store) => store.id === selectedStore);
	$: storeHealthSummaries = healthScopedStores
		.map((store) => {
			const storeTransactions = rangedTransactions.filter((item) => item.storeId === store.id);
			const storeDeliveries = rangedDeliveries.filter((item) => item.storeId === store.id);
			const paidCount = storeTransactions.filter((item) => item.status === "paid").length;
			const failedStoreDeliveries = storeDeliveries.filter(
				(item) => item.status === "failed_permanently",
			).length;
			const retryingStoreDeliveries = storeDeliveries.filter(
				(item) => item.status === "retrying",
			).length;
			const storeSuccessRate =
				storeTransactions.length === 0
					? 100
					: Math.round((paidCount / storeTransactions.length) * 1000) / 10;
			const inactivePenalty = store.status === "inactive" ? 35 : 0;
			const failurePenalty = Math.min(failedStoreDeliveries * 18, 54);
			const retryPenalty = Math.min(retryingStoreDeliveries * 8, 24);
			const successPenalty =
				storeTransactions.length === 0 ? 0 : Math.round((100 - storeSuccessRate) * 0.35);
			const score = Math.max(
				0,
				Math.min(100, 100 - inactivePenalty - failurePenalty - retryPenalty - successPenalty),
			);

			let healthLabel: StoreHealthSummary["healthLabel"] = "Sehat";
			let tone: StoreHealthSummary["tone"] = "emerald";

			if (score < 60) {
				healthLabel = "Kritis";
				tone = "red";
			} else if (score < 75) {
				healthLabel = "Perlu perhatian";
				tone = "amber";
			} else if (score < 90) {
				healthLabel = "Stabil";
				tone = "blue";
			}

			let summary = "Store aktif, tidak ada delivery yang membutuhkan intervensi operator.";
			if (store.status === "inactive") {
				summary =
					"Store sedang nonaktif. Aktifkan kembali hanya jika callback merchant sudah siap menerima charge dan webhook.";
			} else if (failedStoreDeliveries > 0) {
				summary = `${failedStoreDeliveries} delivery gagal permanent. Prioritaskan audit callback merchant dan resend setelah endpoint sehat.`;
			} else if (retryingStoreDeliveries > 0) {
				summary = `${retryingStoreDeliveries} delivery masih retrying. Pantau callback merchant agar issue tidak berubah menjadi gagal permanent.`;
			} else if (storeTransactions.length === 0) {
				summary =
					"Belum ada transaksi dalam rentang aktif. Gunakan store ini untuk smoke charge atau onboarding merchant baru.";
			}

			return {
				storeId: store.id,
				storeName: store.name,
				storeStatus: store.status,
				callbackUrl: store.default_callback_url,
				score,
				healthLabel,
				tone,
				transactionCount: storeTransactions.length,
				paidCount,
				successRate: storeSuccessRate,
				failedDeliveries: failedStoreDeliveries,
				retryingDeliveries: retryingStoreDeliveries,
				summary,
			} satisfies StoreHealthSummary;
		})
		.sort(
			(a, b) =>
				a.score - b.score ||
				b.failedDeliveries - a.failedDeliveries ||
				a.storeName.localeCompare(b.storeName),
		);
	$: averageHealthScore =
		storeHealthSummaries.length === 0
			? 0
			: Math.round(
					storeHealthSummaries.reduce((total, item) => total + item.score, 0) /
						storeHealthSummaries.length,
				);
	$: attentionStoreCount = storeHealthSummaries.filter(
		(item) =>
			item.storeStatus !== "active" ||
			item.failedDeliveries > 0 ||
			item.retryingDeliveries > 0 ||
			item.score < 75,
	).length;
	$: observabilityStart = rangeStart(selectedRange);
	$: observabilityMidpoint = midpointBetween(observabilityStart, new Date());
	$: observabilityScopedStores =
		selectedStore === "all" ? stores : stores.filter((store) => store.id === selectedStore);
	$: storeObservabilitySummaries = observabilityScopedStores
		.map((store) => {
			const storeDeliveries = rangedDeliveries.filter((item) => item.storeId === store.id);
			const recentDeliveries = storeDeliveries.filter(
				(item) => new Date(item.createdAt) >= observabilityMidpoint,
			);
			const previousDeliveries = storeDeliveries.filter((item) => {
				const createdAt = new Date(item.createdAt);
				return createdAt >= observabilityStart && createdAt < observabilityMidpoint;
			});
			const successfulDeliveries = storeDeliveries.filter((item) => item.status === "success");
			const successRatio =
				storeDeliveries.length === 0
					? 100
					: Math.round((successfulDeliveries.length / storeDeliveries.length) * 1000) / 10;
			const successfulLatencies = successfulDeliveries
				.map((item) => item.durationMs ?? null)
				.filter((value): value is number => typeof value === "number" && value >= 0);
			const fallbackLatencies = storeDeliveries
				.map((item) => item.durationMs ?? null)
				.filter((value): value is number => typeof value === "number" && value >= 0);
			const latencySource = successfulLatencies.length > 0 ? successfulLatencies : fallbackLatencies;
			const p95LatencyMs = percentile(latencySource, 95);
			const averageLatencyMs =
				latencySource.length === 0
					? null
					: Math.round(
							latencySource.reduce((total, value) => total + value, 0) / latencySource.length,
						);
			const recentRetrying = recentDeliveries.filter((item) => item.status === "retrying").length;
			const previousRetrying = previousDeliveries.filter((item) => item.status === "retrying").length;
			const retryDelta = recentRetrying - previousRetrying;
			const recentFailed = recentDeliveries.filter(
				(item) => item.status === "failed_permanently",
			).length;
			const previousFailed = previousDeliveries.filter(
				(item) => item.status === "failed_permanently",
			).length;
			const failedDelta = recentFailed - previousFailed;
			const latestAttempt = [...storeDeliveries].sort(
				(left, right) =>
					Date.parse(right.lastAttemptAt ?? right.createdAt) -
					Date.parse(left.lastAttemptAt ?? left.createdAt),
			)[0];

			let tone: StoreObservabilitySummary["tone"] = "emerald";
			if (recentFailed > 0 || successRatio < 90) {
				tone = "red";
			} else if (recentRetrying > 0 || retryDelta > 0 || (p95LatencyMs ?? 0) >= 2500) {
				tone = "amber";
			} else if ((p95LatencyMs ?? 0) >= 1500 || successRatio < 97) {
				tone = "blue";
			}

			let summary =
				"Latency callback masih stabil dan tidak ada indikasi retry/failure yang meningkat pada window terbaru.";
			if (store.status !== "active") {
				summary =
					"Store sedang nonaktif. Gunakan observability ini sebagai baseline sebelum store diaktifkan kembali untuk merchant.";
			} else if (recentFailed > 0) {
				summary = `${recentFailed} delivery gagal permanent pada window terbaru. Audit response callback merchant dan cek apakah last error berubah setelah resend.`;
			} else if (retryDelta > 0 && recentRetrying > 0) {
				summary = `Retry aktif meningkat ${retryDelta > 0 ? `+${retryDelta}` : retryDelta} dibanding window sebelumnya. Callback merchant mulai melambat atau tidak konsisten.`;
			} else if ((p95LatencyMs ?? 0) >= 2500) {
				summary = `Latency p95 callback mencapai ${p95LatencyMs} ms. Belum tentu gagal, tetapi operator sebaiknya cek performa endpoint merchant sebelum antrean retry ikut naik.`;
			} else if (storeDeliveries.length === 0) {
				summary =
					"Belum ada delivery webhook pada rentang aktif. Jalankan smoke charge jika merchant ini baru onboarding.";
			}

			return {
				storeId: store.id,
				storeName: store.name,
				storeStatus: store.status,
				callbackUrl: store.default_callback_url,
				totalDeliveries: storeDeliveries.length,
				successfulDeliveries: successfulDeliveries.length,
				successRatio,
				p95LatencyMs,
				averageLatencyMs,
				recentRetrying,
				previousRetrying,
				retryDelta,
				recentFailed,
				previousFailed,
				failedDelta,
				latestAttemptAt: latestAttempt?.lastAttemptAt ?? latestAttempt?.createdAt ?? null,
				latestResponseStatus: latestAttempt?.responseStatus ?? null,
				tone,
				summary,
			} satisfies StoreObservabilitySummary;
		})
		.sort((left, right) => {
			const toneRank = { red: 0, amber: 1, blue: 2, emerald: 3 } satisfies Record<
				StoreObservabilitySummary["tone"],
				number
			>;
			return (
				toneRank[left.tone] - toneRank[right.tone] ||
				right.recentFailed - left.recentFailed ||
				right.retryDelta - left.retryDelta ||
				left.storeName.localeCompare(right.storeName)
			);
		});
	$: averageObservabilitySuccessRatio =
		storeObservabilitySummaries.length === 0
			? 100
			: Math.round(
					(storeObservabilitySummaries.reduce((total, item) => total + item.successRatio, 0) /
						storeObservabilitySummaries.length) *
						10,
				) / 10;
	$: averageObservabilityP95LatencyMs = (() => {
		const p95Values = storeObservabilitySummaries
			.map((item) => item.p95LatencyMs)
			.filter((value): value is number => typeof value === "number" && value >= 0);
		if (p95Values.length === 0) return null;
		return Math.round(p95Values.reduce((total, value) => total + value, 0) / p95Values.length);
	})();
	$: observabilityAttentionCount = storeObservabilitySummaries.filter(
		(item) =>
			item.tone === "red" ||
			item.tone === "amber" ||
			item.recentFailed > 0 ||
			item.recentRetrying > 0,
	).length;
	$: configurationScopedStores =
		selectedStore === "all" ? stores : stores.filter((store) => store.id === selectedStore);
	$: operationalAlerts = [
		...failedDeliveries.map((item) => ({
			id: `failed:${item.id}`,
			severity: "critical",
			category: "webhook_failed",
			title: `Delivery gagal permanent untuk ${item.orderId}`,
			summary: `Webhook ke backend merchant tidak pernah berhasil setelah ${item.attempt} attempt. Audit callback merchant, cek response body, lalu resend hanya setelah endpoint benar-benar sehat.`,
			storeId: item.storeId,
			storeName: item.store,
			orderId: item.orderId,
			deliveryId: item.id,
			callbackUrl: item.callbackUrl,
			statusLabel: "Failed permanently",
			actionLabel: "Lihat delivery",
			attemptLabel: `Attempt ${item.attempt}/10`,
			timeLabel: item.time,
			canResend: true,
			createdAt: item.createdAt,
		}) satisfies OperationalAlert),
		...retryingDeliveries
			.filter((item) => item.attempt >= 3)
			.map((item) => ({
				id: `retrying:${item.id}`,
				severity: "warning",
				category: "webhook_retrying",
				title: `Retry webhook masih berjalan untuk ${item.orderId}`,
				summary: `Delivery ini belum berhasil setelah ${item.attempt} attempt. Pantau callback merchant sekarang agar tidak berubah menjadi gagal permanent dan menunda update status order.`,
				storeId: item.storeId,
				storeName: item.store,
				orderId: item.orderId,
				deliveryId: item.id,
				callbackUrl: item.callbackUrl,
				statusLabel: "Retry aktif",
				actionLabel: "Pantau delivery",
				attemptLabel: `Attempt ${item.attempt}/10`,
				timeLabel: item.time,
				createdAt: item.createdAt,
			}) satisfies OperationalAlert),
		...configurationScopedStores
			.filter((store) => store.status === "active" && !store.default_callback_url?.trim())
			.map((store) => ({
				id: `callback:${store.id}`,
				severity: "warning",
				category: "callback_missing",
				title: `Callback URL default belum diisi untuk ${store.name}`,
				summary: "Store aktif tanpa callback URL default berisiko kehilangan relay webhook. Lengkapi endpoint backend merchant sebelum store dipakai untuk charge production.",
				storeId: store.id,
				storeName: store.name,
				statusLabel: "Callback belum siap",
				actionLabel: "Lengkapi callback",
				timeLabel: formatDateTime(store.updated_at),
				createdAt: store.updated_at,
			}) satisfies OperationalAlert),
		...configurationScopedStores
			.filter((store) => store.status !== "active")
			.map((store) => ({
				id: `inactive:${store.id}`,
				severity: "info",
				category: "store_inactive",
				title: `${store.name} sedang nonaktif`,
				summary: "Pastikan callback URL, token store, dan SOP webhook merchant siap lebih dulu sebelum store diaktifkan kembali untuk transaksi baru.",
				storeId: store.id,
				storeName: store.name,
				callbackUrl: store.default_callback_url,
				statusLabel: "Store inactive",
				actionLabel: "Kelola store",
				timeLabel: formatDateTime(store.updated_at),
				createdAt: store.updated_at,
			}) satisfies OperationalAlert),
	].sort((left, right) => {
		const severityRank = { critical: 0, warning: 1, info: 2 } satisfies Record<
			OperationalAlert["severity"],
			number
		>;
		return (
			severityRank[left.severity] - severityRank[right.severity] ||
			Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? "") ||
			left.storeName.localeCompare(right.storeName)
		);
	});

	$: volumeData = Array.from({ length: 7 }, (_, index) => {
		const date = new Date();
		date.setDate(date.getDate() - (6 - index));
		const dayKey = date.toISOString().slice(0, 10);
		const dayLabel = new Intl.DateTimeFormat("id-ID", { weekday: "short" }).format(date);
		const dayTransactions = transactions.filter(
			(item) => item.createdAt.slice(0, 10) === dayKey,
		);
		return {
			day: dayLabel.slice(0, 3),
			total: dayTransactions.length,
			success: dayTransactions.filter((item) => item.status === "paid").length,
		};
	});

	$: paymentMix = (() => {
		const counts = new Map<string, number>();
		for (const item of rangedTransactions) {
			const label = paymentMethodLabel(item.type);
			counts.set(label, (counts.get(label) ?? 0) + 1);
		}
		const total = rangedTransactions.length || 1;
		const palette = ["#1c1917", "#3E6B4E", "#78716C", "#C0562F", "#0f766e"];
		return [...counts.entries()]
			.sort((left, right) => right[1] - left[1])
			.slice(0, 5)
			.map(([name, count], index) => ({
				name,
				value: Math.round((count / total) * 100),
				color: palette[index] ?? palette[palette.length - 1],
			}));
	})();

	$: filteredTransactions = transactions.filter((item) => {
		if (transactionStatus !== "all" && item.status !== transactionStatus) return false;
		if (!transactionQuery.trim()) return true;
		const haystack = `${item.orderId} ${item.store} ${item.method} ${item.platformOrderId}`.toLowerCase();
		return haystack.includes(transactionQuery.trim().toLowerCase());
	});
	$: filteredWebhooks = webhookDeliveries.filter((item) => {
		if (webhookStatus !== "all" && item.status !== webhookStatus) return false;
		if (!webhookQuery.trim()) return true;
		const haystack = `${item.orderId} ${item.store} ${item.callbackUrl} ${item.eventType}`.toLowerCase();
		return haystack.includes(webhookQuery.trim().toLowerCase());
	});
	$: filteredAuditLogs = auditLogs.filter((item) => {
		if (!auditQuery.trim()) return true;
		const haystack = `${item.request_id} ${item.method ?? ""} ${item.url ?? ""} ${item.error_message ?? ""}`.toLowerCase();
		return haystack.includes(auditQuery.trim().toLowerCase());
	});

	async function openTransactionDetail(item: OverviewTransaction) {
		detailMode = "transaction";
		detailLoading = true;
		detailOpen = true;
		webhookDetail = null;
		try {
			transactionDetail = await dashboardApi.getTransaction(item.storeId, item.id);
		} catch (caught) {
			const apiError = caught as APIError;
			transactionDetail = null;
			toast.error(apiError.message);
		} finally {
			detailLoading = false;
		}
	}

	async function openWebhookDetail(item: OverviewWebhookDelivery) {
		detailMode = "webhook";
		detailLoading = true;
		detailOpen = true;
		transactionDetail = null;
		try {
			webhookDetail = await dashboardApi.getWebhookDelivery(item.id);
		} catch (caught) {
			const apiError = caught as APIError;
			webhookDetail = null;
			toast.error(apiError.message);
		} finally {
			detailLoading = false;
		}
	}

	async function openWebhookDetailByID(deliveryID: string) {
		detailMode = "webhook";
		detailLoading = true;
		detailOpen = true;
		transactionDetail = null;
		try {
			webhookDetail = await dashboardApi.getWebhookDelivery(deliveryID);
		} catch (caught) {
			const apiError = caught as APIError;
			webhookDetail = null;
			toast.error(apiError.message);
		} finally {
			detailLoading = false;
		}
	}

	async function handleCreateStore() {
		if (!createStoreForm.name.trim()) {
			toast.error("Nama store wajib diisi.");
			return;
		}

		createStoreSubmitting = true;
		try {
			const created = await dashboardApi.createStore({
				name: createStoreForm.name.trim(),
				domain: createStoreForm.domain.trim() || undefined,
				default_callback_url: createStoreForm.defaultCallbackURL.trim() || undefined,
			});
			createStoreForm = { name: "", domain: "", defaultCallbackURL: "" };
			selectedStore = created.id;
			revealedSecret = {
				store_id: created.id,
				secret: created.webhook_secret,
			};
			toast.success("Store baru berhasil dibuat.");
			await loadStores();
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		} finally {
			createStoreSubmitting = false;
		}
	}

	async function handleUpdateStore() {
		if (!currentManagedStoreId) {
			toast.error("Pilih store yang ingin diperbarui.");
			return;
		}

		updateStoreSubmitting = true;
		try {
			await dashboardApi.updateStore(currentManagedStoreId, {
				name: updateStoreForm.name.trim() || currentManagedStore?.name,
				domain: updateStoreForm.domain.trim() || null,
				default_callback_url: updateStoreForm.defaultCallbackURL.trim() || null,
				status: updateStoreForm.status,
			});
			toast.success("Pengaturan store berhasil diperbarui.");
			await loadStores();
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		} finally {
			updateStoreSubmitting = false;
		}
	}

	async function handleDeactivateStore() {
		if (!currentManagedStoreId) return;
		try {
			await dashboardApi.deactivateStore(currentManagedStoreId);
			toast.success("Store berhasil dinonaktifkan.");
			selectedStore = "all";
			await loadStores();
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		}
	}

	async function handleRevealSecret() {
		if (!currentManagedStoreId) return;
		try {
			revealedSecret = await dashboardApi.viewWebhookSecret(currentManagedStoreId);
			toast.success("Webhook secret berhasil ditampilkan.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		}
	}

	async function handleRotateSecret() {
		if (!currentManagedStoreId) return;
		try {
			revealedSecret = await dashboardApi.rotateWebhookSecret(currentManagedStoreId);
			toast.success("Webhook secret berhasil di-rotate.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		}
	}

	async function handleCreateToken() {
		if (!currentManagedStoreId || !tokenForm.name.trim()) {
			toast.error("Nama token wajib diisi.");
			return;
		}

		tokenSubmitting = true;
		try {
			lastIssuedToken = await dashboardApi.createToken(currentManagedStoreId, {
				name: tokenForm.name.trim(),
				scopes: tokenForm.scopes
					.split(",")
					.map((item) => item.trim())
					.filter(Boolean),
			});
			tokenForm = {
				name: "",
				scopes: "transaction:create, transaction:read",
			};
			storeTokens = await dashboardApi.listTokens(currentManagedStoreId);
			toast.success("API token baru berhasil dibuat.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		} finally {
			tokenSubmitting = false;
		}
	}

	async function handleRotateToken(tokenID: string) {
		if (!currentManagedStoreId) return;
		try {
			lastIssuedToken = await dashboardApi.rotateToken(currentManagedStoreId, tokenID);
			storeTokens = await dashboardApi.listTokens(currentManagedStoreId);
			toast.success("Token berhasil di-rotate.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		}
	}

	async function handleRevokeToken(tokenID: string) {
		if (!currentManagedStoreId) return;
		try {
			await dashboardApi.revokeToken(currentManagedStoreId, tokenID);
			storeTokens = await dashboardApi.listTokens(currentManagedStoreId);
			toast.success("Token berhasil dicabut.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		}
	}

	async function handleResendFailedWebhooks() {
		if (failedDeliveries.length === 0) {
			toast.info("Saat ini tidak ada webhook failed permanently yang perlu di-resend.");
			return;
		}

		const results = await Promise.allSettled(
			failedDeliveries.map((delivery) => dashboardApi.resendWebhookDelivery(delivery.id)),
		);
		const successCount = results.filter((result) => result.status === "fulfilled").length;
		const failedCount = results.length - successCount;

		if (successCount === 0) {
			toast.error("Tidak ada delivery yang berhasil di-enqueue ulang. Tinjau detail callback satu per satu.");
			return;
		}

		if (failedCount === 0) {
			toast.success(`${successCount} delivery gagal berhasil di-enqueue ulang.`);
		} else {
			toast.info(
				`${successCount} delivery berhasil di-enqueue ulang, ${failedCount} lainnya masih perlu ditinjau manual.`,
			);
		}

		await loadWorkspace();
	}

	async function handleResendDelivery(deliveryID: string) {
		try {
			await dashboardApi.resendWebhookDelivery(deliveryID);
			toast.success("Webhook delivery berhasil di-enqueue ulang.");
			await loadWorkspace();
			if (webhookDetail?.delivery.id === deliveryID) {
				webhookDetail = await dashboardApi.getWebhookDelivery(deliveryID);
			}
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		}
	}

	async function handleRefreshSessionState() {
		profileRefreshing = true;
		try {
			await Promise.all([reloadSession(), loadAlertEndpoints()]);
			toast.success("Metadata sesi dan destination alert berhasil diperbarui dari backend.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
		} finally {
			profileRefreshing = false;
		}
	}

	async function handleProfilePasswordChange(input: {
		current_password: string;
		new_password: string;
	}) {
		passwordSubmitting = true;
		try {
			await changePassword(input);
			toast.success("Password berhasil diperbarui. Gunakan password baru saat login berikutnya.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
			throw apiError;
		} finally {
			passwordSubmitting = false;
		}
	}

	async function handleCreateAlertEndpoint(input: {
		name: string;
		channel: "webhook" | "slack_webhook" | "discord_webhook";
		destination_url: string;
		events: string[];
		status: "active" | "inactive";
		auth_token?: string;
	}) {
		alertEndpointSaving = true;
		try {
			await dashboardApi.createAlertEndpoint(input);
			await loadAlertEndpoints();
			toast.success("Endpoint alert operasional berhasil ditambahkan.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
			throw apiError;
		} finally {
			alertEndpointSaving = false;
		}
	}

	async function handleUpdateAlertEndpoint(
		endpointID: string,
		input: {
			name: string;
			channel: "webhook" | "slack_webhook" | "discord_webhook";
			destination_url: string;
			events: string[];
			status: "active" | "inactive";
			auth_token?: string;
			clear_auth_token?: boolean;
		},
	) {
		alertEndpointSaving = true;
		try {
			await dashboardApi.updateAlertEndpoint(endpointID, input);
			await loadAlertEndpoints();
			toast.success("Endpoint alert operasional berhasil diperbarui.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
			throw apiError;
		} finally {
			alertEndpointSaving = false;
		}
	}

	async function handleDeleteAlertEndpoint(endpointID: string) {
		alertEndpointDeletingId = endpointID;
		try {
			await dashboardApi.deleteAlertEndpoint(endpointID);
			alertEndpoints = alertEndpoints.filter((item) => item.id !== endpointID);
			toast.success("Endpoint alert operasional berhasil dihapus.");
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
			throw apiError;
		} finally {
			alertEndpointDeletingId = null;
		}
	}

	async function handleSendTestAlertEndpoint(endpointID: string) {
		alertEndpointTestingId = endpointID;
		try {
			const existingEndpoint = alertEndpoints.find((item) => item.id === endpointID);
			await dashboardApi.sendTestAlertEndpoint(endpointID);
			await refreshAlertEndpointsAfterDispatch(
				endpointID,
				existingEndpoint
					? {
							last_tested_at: existingEndpoint.last_tested_at ?? null,
							last_success_at: existingEndpoint.last_success_at ?? null,
							last_triggered_at: existingEndpoint.last_triggered_at ?? null,
							last_error: existingEndpoint.last_error ?? null,
						}
					: undefined,
			);
			toast.success(
				"Test alert berhasil dikirim. Metadata endpoint diperbarui otomatis begitu dispatch selesai.",
			);
		} catch (caught) {
			const apiError = caught as APIError;
			toast.error(apiError.message);
			throw apiError;
		} finally {
			alertEndpointTestingId = null;
		}
	}

	function handleStoreHealthSelect(summary: StoreHealthSummary) {
		selectedStore = summary.storeId;
		if (summary.failedDeliveries > 0 || summary.retryingDeliveries > 0) {
			goto("/app/webhooks");
			return;
		}
		goto("/app/stores");
	}

	function handleStoreObservabilitySelect(summary: StoreObservabilitySummary) {
		selectedStore = summary.storeId;
		if (summary.recentFailed > 0 || summary.recentRetrying > 0 || summary.retryDelta > 0) {
			goto("/app/webhooks");
			return;
		}
		goto("/app/audit");
	}

	async function handleOperationalAlertSelect(alert: OperationalAlert) {
		operationalAlertsOpen = false;
		selectedStore = alert.storeId;

		if (alert.deliveryId) {
			goto("/app/webhooks");
			await openWebhookDetailByID(alert.deliveryId);
			return;
		}

		goto("/app/stores");
	}

	async function handleOperationalAlertResend(alert: OperationalAlert) {
		operationalAlertsOpen = false;
		if (!alert.deliveryId) return;
		await handleResendDelivery(alert.deliveryId);
	}

	function ensureSavedViewsReady() {
		if (!savedViewsUserId) {
			toast.error("Sesi belum siap. Muat ulang dashboard sebelum menyimpan view.");
			return false;
		}
		return true;
	}

	function ensureSavedViewStoreExists(storeId: string) {
		if (storeId === "all") return true;
		return stores.some((store) => store.id === storeId);
	}

	function saveTransactionView(name: string) {
		if (!ensureSavedViewsReady()) return;
		const next = [
			createSavedView<TransactionSavedFilters>({
				name,
				storeId: selectedStore,
				filters: {
					query: transactionQuery,
					status: transactionStatus,
				},
			}),
			...transactionSavedViews,
		].slice(0, 8);
		transactionSavedViews = next;
		persistSavedViews(savedViewsUserId, "transactions", next);
		toast.success("View transaksi berhasil disimpan.");
	}

	function applyTransactionView(view: DashboardSavedView<TransactionSavedFilters>) {
		if (!ensureSavedViewStoreExists(view.storeId)) {
			toast.error("Store pada view tersimpan ini sudah tidak tersedia.");
			return;
		}
		selectedStore = view.storeId;
		transactionQuery = view.filters.query;
		transactionStatus = view.filters.status;
		goto("/app/transactions");
	}

	function deleteTransactionView(view: DashboardSavedView<TransactionSavedFilters>) {
		if (!ensureSavedViewsReady()) return;
		transactionSavedViews = transactionSavedViews.filter((item) => item.id !== view.id);
		persistSavedViews(savedViewsUserId, "transactions", transactionSavedViews);
		toast.success("View transaksi berhasil dihapus.");
	}

	function saveWebhookView(name: string) {
		if (!ensureSavedViewsReady()) return;
		const next = [
			createSavedView<WebhookSavedFilters>({
				name,
				storeId: selectedStore,
				filters: {
					query: webhookQuery,
					status: webhookStatus,
				},
			}),
			...webhookSavedViews,
		].slice(0, 8);
		webhookSavedViews = next;
		persistSavedViews(savedViewsUserId, "webhooks", next);
		toast.success("View webhook berhasil disimpan.");
	}

	function applyWebhookView(view: DashboardSavedView<WebhookSavedFilters>) {
		if (!ensureSavedViewStoreExists(view.storeId)) {
			toast.error("Store pada view tersimpan ini sudah tidak tersedia.");
			return;
		}
		selectedStore = view.storeId;
		webhookQuery = view.filters.query;
		webhookStatus = view.filters.status;
		goto("/app/webhooks");
	}

	function deleteWebhookView(view: DashboardSavedView<WebhookSavedFilters>) {
		if (!ensureSavedViewsReady()) return;
		webhookSavedViews = webhookSavedViews.filter((item) => item.id !== view.id);
		persistSavedViews(savedViewsUserId, "webhooks", webhookSavedViews);
		toast.success("View webhook berhasil dihapus.");
	}

	function saveAuditView(name: string) {
		if (!ensureSavedViewsReady()) return;
		if (selectedStore === "all") {
			toast.info("Pilih satu store dulu sebelum menyimpan view audit log.");
			return;
		}
		const next = [
			createSavedView<AuditSavedFilters>({
				name,
				storeId: selectedStore,
				filters: {
					query: auditQuery,
				},
			}),
			...auditSavedViews,
		].slice(0, 8);
		auditSavedViews = next;
		persistSavedViews(savedViewsUserId, "audit", next);
		toast.success("View audit log berhasil disimpan.");
	}

	function applyAuditView(view: DashboardSavedView<AuditSavedFilters>) {
		if (!ensureSavedViewStoreExists(view.storeId)) {
			toast.error("Store pada view tersimpan ini sudah tidak tersedia.");
			return;
		}
		selectedStore = view.storeId;
		auditQuery = view.filters.query;
		goto("/app/audit");
	}

	function deleteAuditView(view: DashboardSavedView<AuditSavedFilters>) {
		if (!ensureSavedViewsReady()) return;
		auditSavedViews = auditSavedViews.filter((item) => item.id !== view.id);
		persistSavedViews(savedViewsUserId, "audit", auditSavedViews);
		toast.success("View audit log berhasil dihapus.");
	}

	function exportTransactionsCSV() {
		if (filteredTransactions.length === 0) {
			toast.info("Belum ada transaksi pada view ini yang bisa diexport.");
			return;
		}

		downloadCSV({
			filename: `transactions-${slugifyFilenamePart(activeStoreLabel)}-${exportTimestamp()}.csv`,
			rows: filteredTransactions,
			columns: [
				{ header: "order_id", value: (item) => item.orderId },
				{ header: "platform_order_id", value: (item) => item.platformOrderId },
				{ header: "store", value: (item) => item.store },
				{ header: "amount_idr", value: (item) => item.amount },
				{ header: "status", value: (item) => item.status },
				{ header: "method", value: (item) => item.method },
				{ header: "payment_type", value: (item) => item.type },
				{ header: "midtrans_transaction_id", value: (item) => item.midtransTransactionId ?? "" },
				{ header: "callback_url", value: (item) => item.callbackUrl ?? "" },
				{ header: "fraud_status", value: (item) => item.fraudStatus ?? "" },
				{ header: "created_at", value: (item) => item.createdAt },
				{ header: "updated_at", value: (item) => item.updatedAt },
				{ header: "paid_at", value: (item) => item.paidAt ?? "" },
				{ header: "metadata_json", value: (item) => item.metadata },
			],
		});
		toast.success(`CSV transaksi (${filteredTransactions.length} baris) siap diunduh.`);
	}

	function exportWebhookDeliveriesCSV() {
		if (filteredWebhooks.length === 0) {
			toast.info("Belum ada webhook delivery pada view ini yang bisa diexport.");
			return;
		}

		downloadCSV({
			filename: `webhook-deliveries-${slugifyFilenamePart(activeStoreLabel)}-${exportTimestamp()}.csv`,
			rows: filteredWebhooks,
			columns: [
				{ header: "delivery_id", value: (item) => item.id },
				{ header: "order_id", value: (item) => item.orderId },
				{ header: "store", value: (item) => item.store },
				{ header: "status", value: (item) => item.status },
				{ header: "event_type", value: (item) => item.eventType },
				{ header: "attempt_count", value: (item) => item.attempt },
				{ header: "status_code", value: (item) => item.statusCode },
				{ header: "response_status", value: (item) => item.responseStatus ?? "" },
				{ header: "duration_ms", value: (item) => item.durationMs ?? "" },
				{ header: "last_attempt_at", value: (item) => item.lastAttemptAt ?? "" },
				{ header: "last_error", value: (item) => item.lastError ?? "" },
				{ header: "callback_url", value: (item) => item.callbackUrl },
				{ header: "created_at", value: (item) => item.createdAt },
				{ header: "time_relative", value: (item) => item.time },
			],
		});
		toast.success(`CSV webhook delivery (${filteredWebhooks.length} baris) siap diunduh.`);
	}

	function exportAuditLogsCSV() {
		if (selectedStore === "all") {
			toast.info("Pilih satu store lebih dulu agar export audit log tetap aman secara multi-tenant.");
			return;
		}

		if (filteredAuditLogs.length === 0) {
			toast.info("Belum ada audit log pada view ini yang bisa diexport.");
			return;
		}

		downloadCSV({
			filename: `audit-logs-${slugifyFilenamePart(activeStoreLabel)}-${exportTimestamp()}.csv`,
			rows: filteredAuditLogs,
			columns: [
				{ header: "request_id", value: (item) => item.request_id },
				{ header: "actor_type", value: (item) => item.actor_type },
				{ header: "direction", value: (item) => item.direction },
				{ header: "method", value: (item) => item.method ?? "" },
				{ header: "url", value: (item) => item.url ?? "" },
				{ header: "status_code", value: (item) => item.status_code ?? "" },
				{ header: "duration_ms", value: (item) => item.duration_ms ?? "" },
				{ header: "error_message", value: (item) => item.error_message ?? "" },
				{ header: "created_at", value: (item) => item.created_at },
				{ header: "request_body_json", value: (item) => item.request_body },
				{ header: "response_body_json", value: (item) => item.response_body },
			],
		});
		toast.success(`CSV audit log (${filteredAuditLogs.length} baris) siap diunduh.`);
	}

	function stringifyJSON(value: unknown) {
		return JSON.stringify(value ?? {}, null, 2);
	}
</script>

<svelte:head>
	<title>{dashboardTabMeta[activeTab].title}</title>
</svelte:head>

<svelte:window on:keydown={handleGlobalSearchShortcut} />

<Sidebar.Provider style="--sidebar-width: 260px; --sidebar-width-icon: 68px; --header-height: 64px;">
	<AppSidebar activeTab={activeTab} user={$session.user} webhookFailures={failedDeliveries.length} variant="inset" />

	<Sidebar.Inset>
		<SiteHeader
			activeTab={activeTab}
			operationalAlertCount={operationalAlerts.length}
			onOpenSearch={openGlobalSearch}
			onOpenAlerts={() => (operationalAlertsOpen = true)}
		/>

		<main class="mx-auto w-full min-w-0 max-w-[1400px] overflow-x-clip p-4 md:p-6 lg:p-8">
			<div class="mb-8 animate-fade-in-up">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 class="text-2xl font-bold tracking-tight md:text-3xl">{dashboardTabMeta[activeTab].heading}</h1>
						<p class="mt-1 text-[15px] text-stone-500 dark:text-stone-400">{dashboardTabMeta[activeTab].description}</p>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						{#if activeTab !== "profile"}
							<Select.Root type="single" bind:value={selectedStore}>
								<Select.Trigger class="min-w-[180px] rounded-xl border-stone-200/60 bg-white/70 dark:border-white/10 dark:bg-white/5">
									{activeStoreLabel}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="all">Semua Toko</Select.Item>
									{#each stores as store}
										<Select.Item value={store.id}>{store.name}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						{/if}

						{#if activeTab === "overview"}
							<Select.Root type="single" bind:value={selectedRange}>
								<Select.Trigger class="min-w-[160px] rounded-xl border-stone-200/60 bg-white/70 dark:border-white/10 dark:bg-white/5">
									{rangeLabel(selectedRange)}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="7d">7 Hari Terakhir</Select.Item>
									<Select.Item value="30d">30 Hari Terakhir</Select.Item>
									<Select.Item value="month">Bulan Ini</Select.Item>
								</Select.Content>
							</Select.Root>
						{/if}

						<Button
							type="button"
							variant="outline"
							class="rounded-xl"
							onclick={() => (activeTab === "profile" ? void handleRefreshSessionState() : void loadWorkspace())}
						>
							<RefreshCcwIcon class="size-4" />
							{activeTab === "profile" ? "Refresh Sesi" : "Refresh"}
						</Button>
						<Button type="button" variant="outline" class="rounded-xl" onclick={() => void logout()}>
							Logout
						</Button>
					</div>
				</div>
			</div>

			{#if pageLoading}
				<div class="panel-card flex min-h-[280px] items-center justify-center rounded-[24px] p-8">
					<div class="flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
						<LoaderCircleIcon class="size-5 animate-spin" />
						Memuat data dashboard dari backend...
					</div>
				</div>
			{:else if pageError}
				<div class="panel-card rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
					<div class="font-semibold">Gagal memuat dashboard</div>
					<div class="mt-1">{pageError}</div>
				</div>
			{:else if activeTab === "overview"}
				<div class="space-y-8">
					<SectionCards
						metrics={metrics}
						onSelectMetric={(metric) => {
							if (metric.label === "Webhook Gagal") {
								goto("/app/webhooks");
							}
						}}
					/>
					<OperationalAlertsPanel
						rangeLabel={rangeLabel(selectedRange)}
						alerts={operationalAlerts}
						maxItems={4}
						onOpenAlert={handleOperationalAlertSelect}
						onResendAlert={handleOperationalAlertResend}
					/>
					<StoreHealthPanel
						rangeLabel={rangeLabel(selectedRange)}
						summaries={storeHealthSummaries}
						averageScore={averageHealthScore}
						attentionCount={attentionStoreCount}
						onSelectStore={handleStoreHealthSelect}
					/>
					<StoreObservabilityPanel
						rangeLabel={rangeLabel(selectedRange)}
						summaries={storeObservabilitySummaries}
						averageSuccessRatio={averageObservabilitySuccessRatio}
						averageP95LatencyMs={averageObservabilityP95LatencyMs}
						attentionCount={observabilityAttentionCount}
						onSelectStore={handleStoreObservabilitySelect}
					/>
					<ChartAreaInteractive volumeData={volumeData} paymentMix={paymentMix} />
					<DataTable
						transactions={transactions.slice(0, 10)}
						webhookDeliveries={webhookDeliveries.slice(0, 8)}
						onSelectTransaction={openTransactionDetail}
						onSelectWebhook={openWebhookDetail}
						onViewAllTransactions={() => goto("/app/transactions")}
						onViewAllWebhooks={() => goto("/app/webhooks")}
					/>

					<div class="grid grid-cols-1 gap-4 xl:grid-cols-5">
						<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5 xl:col-span-3">
							<h3 class="mb-4 text-[15px] font-semibold">Aksi Cepat</h3>
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<button type="button" class="flex items-center gap-3 rounded-xl border border-dashed border-stone-300 p-3.5 text-left transition-all hover:bg-stone-50 dark:border-white/15 dark:hover:bg-white/5" on:click={() => goto("/app/stores")}>
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/10">
										<PlusIcon class="size-5 text-stone-600 dark:text-stone-300" />
									</div>
									<div>
										<div class="text-sm font-semibold">Buat Toko</div>
										<div class="text-[12px] text-stone-500 dark:text-stone-400">Tambah tenant merchant baru</div>
									</div>
								</button>

								<button type="button" class="flex items-center gap-3 rounded-xl border border-dashed border-stone-300 p-3.5 text-left transition-all hover:bg-stone-50 dark:border-white/15 dark:hover:bg-white/5" on:click={() => goto("/app/stores")}>
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/10">
										<KeyRoundIcon class="size-5 text-stone-600 dark:text-stone-300" />
									</div>
									<div>
										<div class="text-sm font-semibold">Kelola Token</div>
										<div class="text-[12px] text-stone-500 dark:text-stone-400">Buat, rotate, dan revoke API token store</div>
									</div>
								</button>

								<button type="button" class="flex items-center gap-3 rounded-xl border border-dashed border-stone-300 p-3.5 text-left transition-all hover:bg-stone-50 dark:border-white/15 dark:hover:bg-white/5" on:click={() => goto("/app/docs")}>
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 dark:bg-white/10">
										<BookOpenIcon class="size-5 text-stone-600 dark:text-stone-300" />
									</div>
									<div>
										<div class="text-sm font-semibold">Buka Dokumentasi</div>
										<div class="text-[12px] text-stone-500 dark:text-stone-400">Contoh curl, payload, dan signature verification</div>
									</div>
								</button>

								<button
									type="button"
									class="flex items-center gap-3 rounded-xl border border-dashed border-orange-300 bg-orange-50 p-3.5 text-left transition-all hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-500/30 dark:bg-orange-900/10 dark:hover:bg-orange-900/20"
									disabled={failedDeliveries.length === 0}
									on:click={handleResendFailedWebhooks}
								>
									<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
										<RefreshCcwIcon class="size-5 text-orange-600 dark:text-orange-400" />
									</div>
									<div>
									<div class="text-sm font-semibold text-orange-700 dark:text-orange-400">Resend Webhook</div>
									<div class="text-[12px] text-orange-500/80 dark:text-orange-400/70">
										{failedDeliveries.length === 0
											? "Semua delivery sehat"
											: `${failedDeliveries.length} delivery gagal siap di-enqueue ulang`}
									</div>
								</div>
							</button>
							</div>
						</div>

						<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5 xl:col-span-2">
							<div class="mb-4">
								<h3 class="text-[15px] font-semibold">Kalender Operasional</h3>
								<p class="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">
									Jadwal settlement, retry webhook, dan maintenance internal.
								</p>
							</div>
							<div class="rounded-[18px] border border-stone-200/60 bg-white/80 p-3 dark:border-white/10 dark:bg-black/20">
								<Calendar01 />
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === "profile"}
				<div class="space-y-4">
					<ProfileSessionPanel
						user={$session.user}
						tokens={$session.tokens}
						mfa={$session.mfa}
						persistence={$session.persistence}
						changingPassword={passwordSubmitting}
						refreshingSession={profileRefreshing}
						onRefreshSession={handleRefreshSessionState}
						onChangePassword={handleProfilePasswordChange}
						onLogout={logout}
						onOpenMfa={() => goto("/verify")}
					/>
					<AlertEndpointsPanel
						endpoints={alertEndpoints}
						loading={alertEndpointsLoading}
						saving={alertEndpointSaving}
						testingEndpointId={alertEndpointTestingId}
						deletingEndpointId={alertEndpointDeletingId}
						onCreate={handleCreateAlertEndpoint}
						onUpdate={handleUpdateAlertEndpoint}
						onDelete={handleDeleteAlertEndpoint}
						onSendTest={handleSendTestAlertEndpoint}
					/>
				</div>
			{:else if activeTab === "stores"}
				<div class="grid grid-cols-1 gap-4 xl:grid-cols-5">
					<div class="space-y-4 xl:col-span-2">
						<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
							<h3 class="text-[15px] font-semibold">Buat Store Baru</h3>
							<p class="mt-1 text-[13px] text-stone-500 dark:text-stone-400">Tambahkan tenant merchant baru ke dashboard PayGate. Slug akan dibuat otomatis dan dijaga unik oleh backend.</p>
							<div class="mt-4 space-y-3">
								<Input bind:value={createStoreForm.name} placeholder="Nama store" class="rounded-xl" />
								<Input bind:value={createStoreForm.domain} placeholder="Domain toko opsional" class="rounded-xl" />
								<Input bind:value={createStoreForm.defaultCallbackURL} placeholder="https://merchant.example.com/api/paygate/callback" class="rounded-xl" />
								<Button class="w-full rounded-xl" disabled={createStoreSubmitting} onclick={handleCreateStore}>
									{createStoreSubmitting ? "Membuat store..." : "Buat Store"}
								</Button>
							</div>
						</div>

						<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
							<h3 class="text-[15px] font-semibold">Direktori Store</h3>
							<p class="mt-1 text-[13px] text-stone-500 dark:text-stone-400">Pilih tenant yang ingin dikelola.</p>
							<div class="mt-4 space-y-2">
								{#if stores.length === 0}
									<div class="rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
										Belum ada store. Buat store pertama untuk mulai charge transaction.
									</div>
								{:else}
									{#each stores as store}
										<button type="button" class={`flex w-full items-start justify-between rounded-xl border px-4 py-3 text-left transition-colors ${currentManagedStoreId === store.id ? "border-stone-900 bg-stone-50 dark:border-white dark:bg-white/10" : "border-stone-200/60 bg-white/50 hover:bg-stone-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:bg-white/5"}`} on:click={() => (selectedStore = store.id)}>
											<div>
												<div class="text-sm font-semibold">{store.name}</div>
												<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">{store.domain || "Domain belum diisi"}</div>
											</div>
											<span class={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${store.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-400"}`}>{store.status}</span>
										</button>
									{/each}
								{/if}
							</div>
						</div>
					</div>

					<div class="space-y-4 xl:col-span-3">
						<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
							<h3 class="text-[15px] font-semibold">Pengaturan Store</h3>
							{#if currentManagedStore}
								<p class="mt-1 text-[13px] text-stone-500 dark:text-stone-400">
									Perbarui profil tenant, callback URL, dan status store aktif.
								</p>
								<div class="mt-4 grid gap-3 md:grid-cols-2">
									<Input bind:value={updateStoreForm.name} placeholder="Nama store" class="rounded-xl md:col-span-2" />
									<Input bind:value={updateStoreForm.domain} placeholder="Domain toko" class="rounded-xl" />
									<Input bind:value={updateStoreForm.defaultCallbackURL} placeholder="Callback URL default" class="rounded-xl" />
									<Select.Root type="single" bind:value={updateStoreForm.status}>
										<Select.Trigger class="rounded-xl border-stone-200/60 bg-white/70 dark:border-white/10 dark:bg-white/5">
											{updateStoreForm.status === "active" ? "Active" : "Inactive"}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="active">Active</Select.Item>
											<Select.Item value="inactive">Inactive</Select.Item>
										</Select.Content>
									</Select.Root>
								</div>
								<div class="mt-4 flex flex-wrap gap-2">
									<Button class="rounded-xl" disabled={updateStoreSubmitting} onclick={handleUpdateStore}>
										{updateStoreSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
									</Button>
									<Button variant="outline" class="rounded-xl" onclick={handleRevealSecret}>Lihat Webhook Secret</Button>
									<Button variant="outline" class="rounded-xl" onclick={handleRotateSecret}>Rotate Secret</Button>
									<Button variant="outline" class="rounded-xl text-red-600 dark:text-red-400" onclick={handleDeactivateStore}>
										Nonaktifkan Store
									</Button>
								</div>
							{:else}
								<p class="mt-3 text-sm text-stone-500 dark:text-stone-400">Pilih store dari direktori untuk membuka pengaturan tenant dan token.</p>
							{/if}
						</div>

						{#if revealedSecret}
							<div class="rounded-[20px] border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-950/20">
								<h3 class="text-[15px] font-semibold text-amber-800 dark:text-amber-300">Webhook Secret Aktif</h3>
								<p class="mt-1 text-[13px] text-amber-700/80 dark:text-amber-300/80">
									Simpan secret ini di backend merchant. Setelah rotate, secret lama tidak lagi valid untuk verifikasi signature.
								</p>
								<code class="mt-3 block rounded-xl bg-white px-3 py-2 font-mono text-[13px] text-stone-700 dark:bg-black/30 dark:text-stone-100">
									{revealedSecret.secret}
								</code>
							</div>
						{/if}

						<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
							<h3 class="text-[15px] font-semibold">API Token Store</h3>
							{#if currentManagedStore}
								<p class="mt-1 text-[13px] text-stone-500 dark:text-stone-400">
									Token hanya ditampilkan sekali saat dibuat atau di-rotate. Simpan langsung di secret manager merchant.
								</p>
								<div class="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
									<Input bind:value={tokenForm.name} placeholder="Nama token" class="rounded-xl" />
									<Input bind:value={tokenForm.scopes} placeholder="transaction:create, transaction:read" class="rounded-xl" />
									<Button class="rounded-xl" disabled={tokenSubmitting} onclick={handleCreateToken}>
										{tokenSubmitting ? "Membuat..." : "Buat Token"}
									</Button>
								</div>

								{#if lastIssuedToken?.token}
									<div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/30 dark:bg-emerald-950/20">
										<div class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Token baru</div>
										<code class="mt-2 block overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-[12px] text-stone-700 dark:bg-black/30 dark:text-stone-100">
											{lastIssuedToken.token}
										</code>
									</div>
								{/if}

								<div class="mt-4 overflow-x-auto">
									<table class="w-full text-[13px]">
										<thead>
											<tr class="border-b border-stone-200/60 dark:border-white/10">
												<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Nama</th>
												<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Prefix</th>
												<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Scope</th>
												<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Status</th>
												<th class="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Aksi</th>
											</tr>
										</thead>
										<tbody>
											{#each storeTokens as token}
												<tr class="border-b border-stone-100 dark:border-white/5">
													<td class="px-3 py-3 font-medium">{token.name}</td>
													<td class="px-3 py-3 font-mono text-[12px] text-stone-500 dark:text-stone-400">{token.token_prefix}</td>
													<td class="px-3 py-3 text-stone-500 dark:text-stone-400">{token.scopes.join(", ") || "Semua scope default"}</td>
													<td class="px-3 py-3">
														<span class={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${token.revoked_at ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}`}>
															{token.revoked_at ? "Revoked" : "Active"}
														</span>
													</td>
													<td class="px-3 py-3 text-right">
														<div class="flex justify-end gap-2">
															<Button variant="outline" class="rounded-xl" onclick={() => handleRotateToken(token.id)}>Rotate</Button>
															<Button variant="outline" class="rounded-xl text-red-600 dark:text-red-400" onclick={() => handleRevokeToken(token.id)}>Revoke</Button>
														</div>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<p class="mt-3 text-sm text-stone-500 dark:text-stone-400">Belum ada store aktif yang bisa diberi token.</p>
							{/if}
						</div>
					</div>
				</div>
			{:else if activeTab === "transactions"}
				<div class="space-y-4">
					<SavedViewPanel
						title="View Tersimpan • Transaksi"
						description="Simpan kombinasi store, status, dan pencarian transaksi yang sering Anda pakai untuk rekonsiliasi harian atau investigasi order bermasalah."
						views={transactionSavedViews}
						activeViewId={activeTransactionViewId}
						defaultName={transactionViewSuggestion}
						saveDisabled={!savedViewsUserId}
						onSave={saveTransactionView}
						onApply={applyTransactionView}
						onDelete={deleteTransactionView}
					/>
					<div class="grid gap-3 md:grid-cols-[1fr_180px_auto]">
						<Input bind:value={transactionQuery} placeholder="Cari order ID, store, metode, atau platform order ID" class="rounded-xl" />
						<Select.Root type="single" bind:value={transactionStatus}>
							<Select.Trigger class="rounded-xl border-stone-200/60 bg-white/70 dark:border-white/10 dark:bg-white/5">
								{transactionStatus === "all" ? "Semua Status" : transactionStatus}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">Semua Status</Select.Item>
								<Select.Item value="paid">Paid</Select.Item>
								<Select.Item value="pending">Pending</Select.Item>
								<Select.Item value="challenge">Challenge</Select.Item>
								<Select.Item value="failed">Failed</Select.Item>
								<Select.Item value="expired">Expired</Select.Item>
								<Select.Item value="cancelled">Cancelled</Select.Item>
							</Select.Content>
						</Select.Root>
						<Button variant="outline" class="rounded-xl" onclick={exportTransactionsCSV}>
							<DownloadIcon class="size-4" />
							Export CSV
						</Button>
					</div>
					<p class="text-[12px] text-stone-500 dark:text-stone-400">
						Download hanya transaksi yang sesuai filter saat ini untuk memudahkan rekonsiliasi atau handoff ke finance/support.
					</p>
					<DataTable
						transactions={filteredTransactions}
						webhookDeliveries={[]}
						showWebhooks={false}
						onSelectTransaction={openTransactionDetail}
						onViewAllTransactions={() => goto("/app/transactions")}
					/>
				</div>
			{:else if activeTab === "audit"}
				<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
					<SavedViewPanel
						title="View Tersimpan • Audit"
						description="Simpan request ID atau pola error yang sering Anda pakai agar investigasi audit berikutnya bisa dibuka dalam satu klik."
						views={auditSavedViews}
						activeViewId={activeAuditViewId}
						defaultName={auditViewSuggestion}
						saveDisabled={!savedViewsUserId || selectedStore === "all"}
						onSave={saveAuditView}
						onApply={applyAuditView}
						onDelete={deleteAuditView}
					/>
					{#if selectedStore === "all"}
						<div class="mt-4 rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
							Pilih satu store untuk melihat audit log yang relevan dan tetap aman secara multi-tenant.
						</div>
					{:else}
						<div class="mb-4 mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
							<Input bind:value={auditQuery} placeholder="Cari request ID, endpoint, atau error message" class="rounded-xl" />
							<Button variant="outline" class="rounded-xl" onclick={() => void loadWorkspace()}>Refresh Audit</Button>
							<Button variant="outline" class="rounded-xl" onclick={exportAuditLogsCSV}>
								<DownloadIcon class="size-4" />
								Export CSV
							</Button>
						</div>
						<p class="mb-4 text-[12px] text-stone-500 dark:text-stone-400">
							Export mengikuti filter request ID atau error message yang sedang aktif agar investigasi lebih fokus.
						</p>
						<div class="overflow-x-auto">
							<table class="w-full text-[13px]">
								<thead>
									<tr class="border-b border-stone-200/60 dark:border-white/10">
										<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Request ID</th>
										<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Endpoint</th>
										<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Status</th>
										<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Durasi</th>
										<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Waktu</th>
									</tr>
								</thead>
								<tbody>
									{#if filteredAuditLogs.length === 0}
										<tr>
											<td colspan="5" class="px-3 py-8 text-center text-sm text-stone-500 dark:text-stone-400">Belum ada audit log yang cocok dengan filter saat ini.</td>
										</tr>
									{:else}
										{#each filteredAuditLogs as log}
											<tr class="border-b border-stone-100 dark:border-white/5">
												<td class="px-3 py-3 font-mono text-[12px]">{log.request_id}</td>
												<td class="px-3 py-3">{log.method ?? "HTTP"} {log.url ?? "-"}</td>
												<td class="px-3 py-3">{log.status_code ?? "-"}</td>
												<td class="px-3 py-3">{log.duration_ms ? `${log.duration_ms} ms` : "-"}</td>
												<td class="px-3 py-3 text-stone-500 dark:text-stone-400">{formatDateTime(log.created_at)}</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{:else if activeTab === "webhooks"}
				<div class="space-y-4">
					<SavedViewPanel
						title="View Tersimpan • Webhook"
						description="Simpan kombinasi store, status delivery, dan query callback agar tim support bisa kembali ke kasus webhook yang sama tanpa setup ulang."
						views={webhookSavedViews}
						activeViewId={activeWebhookViewId}
						defaultName={webhookViewSuggestion}
						saveDisabled={!savedViewsUserId}
						onSave={saveWebhookView}
						onApply={applyWebhookView}
						onDelete={deleteWebhookView}
					/>
					<div class="grid gap-3 md:grid-cols-[1fr_180px_auto]">
						<Input bind:value={webhookQuery} placeholder="Cari order ID, store, callback URL, atau event type" class="rounded-xl" />
						<Select.Root type="single" bind:value={webhookStatus}>
							<Select.Trigger class="rounded-xl border-stone-200/60 bg-white/70 dark:border-white/10 dark:bg-white/5">
								{webhookStatus === "all" ? "Semua Status" : webhookStatus}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="all">Semua Status</Select.Item>
								<Select.Item value="success">Success</Select.Item>
								<Select.Item value="retrying">Retrying</Select.Item>
								<Select.Item value="failed_permanently">Failed Permanently</Select.Item>
								<Select.Item value="pending">Pending</Select.Item>
							</Select.Content>
						</Select.Root>
						<Button variant="outline" class="rounded-xl" onclick={exportWebhookDeliveriesCSV}>
							<DownloadIcon class="size-4" />
							Export CSV
						</Button>
					</div>
					<p class="text-[12px] text-stone-500 dark:text-stone-400">
						Export CSV ini mengikuti filter status dan query aktif agar tim merchant bisa menindaklanjuti delivery yang relevan saja.
					</p>
					<DataTable
						transactions={[]}
						webhookDeliveries={filteredWebhooks}
						showTransactions={false}
						onSelectWebhook={openWebhookDetail}
						onViewAllWebhooks={() => goto("/app/webhooks")}
					/>
				</div>
			{:else}
				<ApiDocsPanel />
			{/if}

			<footer class="pb-8 pt-12 text-center text-[13px] text-stone-400 dark:text-stone-500">
				PayGate v1.0.0 · Dashboard terhubung ke API backend aktif
			</footer>

			<GlobalSearchSheet
				bind:open={globalSearchOpen}
				scopeLabel={activeStoreLabel}
				query={globalSearchQuery}
				loading={globalSearchLoading}
				error={globalSearchError}
				stores={globalSearchResults.stores}
				transactions={globalSearchResults.transactions}
				webhooks={globalSearchResults.webhooks}
				auditLogs={globalSearchResults.auditLogs}
				onQueryChange={handleGlobalSearchQueryChange}
				onSelectStore={handleSearchStoreSelect}
				onSelectTransaction={handleSearchTransactionSelect}
				onSelectWebhook={handleSearchWebhookSelect}
				onSelectAuditLog={handleSearchAuditSelect}
			/>
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>

<Sheet.Root bind:open={operationalAlertsOpen}>
	<Sheet.Content side="right" class="w-full max-w-2xl bg-white dark:bg-stone-900" showCloseButton={true}>
		<div class="space-y-5 p-6">
			<Sheet.Header class="space-y-2 text-left">
				<Sheet.Title class="text-[15px] font-semibold">Alert Operasional</Sheet.Title>
				<Sheet.Description class="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
					Tindak lanjuti delivery gagal, retry yang menumpuk, dan store yang belum siap menerima webhook dari satu tray
					yang sama.
				</Sheet.Description>
			</Sheet.Header>

			<OperationalAlertsPanel
				title="Tray Alert"
				description="Gunakan daftar ini untuk menentukan prioritas investigasi webhook, resend, dan pembenahan konfigurasi store."
				rangeLabel={rangeLabel(selectedRange)}
				alerts={operationalAlerts}
				maxItems={12}
				dense={true}
				onOpenAlert={handleOperationalAlertSelect}
				onResendAlert={handleOperationalAlertResend}
			/>
		</div>
	</Sheet.Content>
</Sheet.Root>

<Sheet.Root bind:open={detailOpen}>
	<Sheet.Content side="right" class="w-full max-w-2xl bg-white dark:bg-stone-900" showCloseButton={true}>
		<div class="space-y-5 p-6">
			{#if detailLoading}
				<div class="flex items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
					<LoaderCircleIcon class="size-5 animate-spin" />
					Memuat detail dari backend...
				</div>
			{:else if detailMode === "transaction" && transactionDetail}
				<Sheet.Title class="text-[15px] font-semibold">Detail Transaksi</Sheet.Title>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Order ID</div>
						<div class="mt-1 font-mono text-sm">{transactionDetail.order_id}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Platform Order ID</div>
						<div class="mt-1 font-mono text-sm">{transactionDetail.platform_order_id}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Status</div>
						<div class="mt-1 text-sm font-semibold">{transactionDetail.status}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Payment Type</div>
						<div class="mt-1 text-sm">{paymentMethodLabel(transactionDetail.payment_type)}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Gross Amount</div>
						<div class="mt-1 text-xl font-bold">{formatRp(transactionDetail.gross_amount)}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Callback URL</div>
						<div class="mt-1 break-all text-sm">{transactionDetail.callback_url || "Menggunakan default callback store"}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Created At</div>
						<div class="mt-1 text-sm">{formatDateTime(transactionDetail.created_at)}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Paid At</div>
						<div class="mt-1 text-sm">{formatDateTime(transactionDetail.paid_at)}</div>
					</div>
				</div>
				<div>
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Metadata</div>
					<pre class="mt-2 overflow-x-auto rounded-xl bg-stone-950 p-4 text-[12px] text-stone-200">{stringifyJSON(transactionDetail.metadata)}</pre>
				</div>
			{:else if detailMode === "webhook" && webhookDetail}
				<Sheet.Title class="text-[15px] font-semibold">Detail Webhook Delivery</Sheet.Title>
				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Delivery ID</div>
						<div class="mt-1 font-mono text-sm">{webhookDetail.delivery.id}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Status</div>
						<div class="mt-1 text-sm font-semibold">{webhookDetail.delivery.status}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Event</div>
						<div class="mt-1 text-sm">{webhookDetail.delivery.event_type}</div>
					</div>
					<div>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Callback URL</div>
						<div class="mt-1 break-all text-sm">{webhookDetail.delivery.callback_url}</div>
					</div>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between">
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Payload</div>
						<Button variant="outline" class="rounded-xl" onclick={() => webhookDetail && handleResendDelivery(webhookDetail.delivery.id)}>
							Resend Delivery
						</Button>
					</div>
					<pre class="overflow-x-auto rounded-xl bg-stone-950 p-4 text-[12px] text-stone-200">{stringifyJSON(webhookDetail.delivery.payload)}</pre>
				</div>
				<div>
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Attempts</div>
					<div class="mt-3 space-y-3">
						{#each webhookDetail.attempts as attempt}
							<div class="rounded-xl border border-stone-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
								<div class="flex items-center justify-between gap-3">
									<div class="text-sm font-semibold">Attempt #{attempt.attempt_number}</div>
									<div class="text-[12px] text-stone-500 dark:text-stone-400">{formatDateTime(attempt.attempted_at)}</div>
								</div>
								<div class="mt-3 grid gap-3 md:grid-cols-2">
									<pre class="overflow-x-auto rounded-lg bg-stone-950 p-3 text-[11px] text-stone-200">{stringifyJSON(attempt.request_body)}</pre>
									<pre class="overflow-x-auto rounded-lg bg-stone-950 p-3 text-[11px] text-emerald-300">{stringifyJSON({ status: attempt.response_status, body: attempt.response_body, error: attempt.error_message, duration_ms: attempt.duration_ms })}</pre>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
					Pilih transaksi atau webhook delivery dari tabel agar dashboard bisa menampilkan payload, status, dan histori attempt yang relevan.
				</div>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
