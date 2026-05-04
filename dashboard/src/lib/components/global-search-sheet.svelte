<script lang="ts">
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import ArrowLeftRightIcon from "@lucide/svelte/icons/arrow-left-right";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import SearchIcon from "@lucide/svelte/icons/search";
	import ScrollTextIcon from "@lucide/svelte/icons/scroll-text";
	import StoreIcon from "@lucide/svelte/icons/store";
	import WebhookIcon from "@lucide/svelte/icons/webhook";

	import type { Store } from "$lib/api/types";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import * as Separator from "$lib/components/ui/separator";
	import * as Sheet from "$lib/components/ui/sheet";
	import type {
		GlobalSearchAuditLog,
		OverviewTransaction,
		OverviewWebhookDelivery,
	} from "$lib/dashboard/models";

	export let open = false;
	export let scopeLabel = "Semua Toko";
	export let query = "";
	export let loading = false;
	export let error = "";
	export let stores: Store[] = [];
	export let transactions: OverviewTransaction[] = [];
	export let webhooks: OverviewWebhookDelivery[] = [];
	export let auditLogs: GlobalSearchAuditLog[] = [];
	export let onQueryChange: (value: string) => void = () => {};
	export let onSelectStore: (store: Store) => void | Promise<void> = () => {};
	export let onSelectTransaction: (item: OverviewTransaction) => void | Promise<void> = () => {};
	export let onSelectWebhook: (item: OverviewWebhookDelivery) => void | Promise<void> = () => {};
	export let onSelectAuditLog: (item: GlobalSearchAuditLog) => void | Promise<void> = () => {};

	$: trimmedQuery = query.trim();
	$: hasActiveQuery = trimmedQuery.length >= 2;
	$: totalResults =
		stores.length + transactions.length + webhooks.length + auditLogs.length;

	const searchTips = [
		"Order ID atau platform order ID untuk membuka detail transaksi lebih cepat.",
		"Request ID untuk lompat ke audit log store yang relevan.",
		"Callback URL atau event type untuk mengecek delivery webhook tertentu.",
		"Nama store, slug, atau domain merchant yang ingin dikelola.",
	];
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="top" class="max-h-[92vh] overflow-y-auto bg-[color:color-mix(in_oklab,var(--background)_96%,transparent)] px-0 pb-0 pt-0 backdrop-blur-2xl" showCloseButton={true}>
		<div class="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
			<div class="space-y-2">
				<Sheet.Title class="text-lg font-semibold tracking-tight">Pencarian Global</Sheet.Title>
				<p class="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
					Cari store, transaksi, webhook delivery, dan audit log dari scope
					<Badge variant="secondary" class="ml-1 rounded-full">{scopeLabel}</Badge>
					tanpa pindah halaman.
				</p>
			</div>

			<div class="relative">
				<SearchIcon class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
				<Input
					value={query}
					placeholder="Cari order ID, request ID, callback URL, nama store, slug, atau domain merchant"
					class="h-12 rounded-2xl border-stone-200/70 bg-white/85 pl-11 pr-20 text-[15px] dark:border-white/10 dark:bg-white/5"
					oninput={(event) =>
						onQueryChange((event.currentTarget as HTMLInputElement).value)}
				/>
				<kbd class="pointer-events-none absolute right-3 top-1/2 rounded-lg bg-stone-100 px-2 py-1 font-mono text-[11px] text-stone-500 -translate-y-1/2 dark:bg-white/10 dark:text-stone-400">
					⌘K
				</kbd>
			</div>

			{#if !hasActiveQuery}
				<div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
					<Card.Root class="panel-card border-none shadow-none">
						<Card.Header class="pb-3">
							<Card.Title class="text-base font-semibold">Yang bisa dicari</Card.Title>
							<Card.Description class="text-[13px] leading-relaxed">
								Gunakan minimal 2 karakter agar dashboard mengambil hasil nyata dari backend.
							</Card.Description>
						</Card.Header>
						<Card.Content class="grid gap-3 sm:grid-cols-2">
							{#each searchTips as tip}
								<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-[13px] leading-relaxed text-stone-600 dark:border-white/10 dark:bg-black/20 dark:text-stone-300">
									{tip}
								</div>
							{/each}
						</Card.Content>
					</Card.Root>

					<Card.Root class="panel-card border-none shadow-none">
						<Card.Header class="pb-3">
							<Card.Title class="text-base font-semibold">Shortcut hasil cepat</Card.Title>
							<Card.Description class="text-[13px] leading-relaxed">
								Pakai order ID untuk detail transaksi, request ID untuk audit, atau callback URL untuk webhook delivery.
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3 text-[13px] text-stone-600 dark:text-stone-300">
							<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
								Result store akan membawa Anda ke pengaturan tenant yang relevan.
							</div>
							<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
								Result transaksi dan webhook langsung membuka detail panel backend tanpa perlu mencari ulang.
							</div>
							<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
								Result audit log akan memindahkan filter ke tab Audit Log pada store yang sesuai.
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{:else if loading}
				<div class="rounded-[24px] border border-stone-200/60 bg-white/70 px-5 py-8 text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-400">
					<div class="flex items-center gap-3">
						<LoaderCircleIcon class="size-5 animate-spin" />
						Mencari hasil terbaru dari backend PayGate...
					</div>
				</div>
			{:else if error}
				<div class="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
					<div class="flex items-start gap-3">
						<AlertCircleIcon class="mt-0.5 size-4 shrink-0" />
						<div>
							<div class="font-semibold">Pencarian gagal diproses</div>
							<div class="mt-1">{error}</div>
						</div>
					</div>
				</div>
			{:else if totalResults === 0}
				<div class="rounded-[24px] border border-dashed border-stone-200 bg-white/70 px-5 py-8 text-center text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-400">
					Tidak ada hasil untuk <span class="font-semibold text-stone-700 dark:text-stone-200">{trimmedQuery}</span>.
					Coba order ID, request ID, nama store, atau callback URL yang lebih spesifik.
				</div>
			{:else}
				<div class="grid gap-4 xl:grid-cols-2">
					<Card.Root class="panel-card border-none shadow-none">
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title class="text-base font-semibold">Store</Card.Title>
									<Card.Description class="text-[13px] leading-relaxed">
										Hasil tenant merchant berdasarkan nama, slug, atau domain.
									</Card.Description>
								</div>
								<Badge variant="outline" class="rounded-full">{stores.length} hasil</Badge>
							</div>
						</Card.Header>
						<Card.Content class="space-y-2">
							{#if stores.length === 0}
								<p class="text-[13px] text-stone-500 dark:text-stone-400">Tidak ada store yang cocok dengan query ini.</p>
							{:else}
								{#each stores as store}
									<button
										type="button"
										class="flex w-full items-center gap-3 rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/5"
										onclick={() => void onSelectStore(store)}
									>
										<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200">
											<StoreIcon class="size-4" />
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate text-sm font-semibold">{store.name}</div>
											<div class="truncate text-[12px] text-stone-500 dark:text-stone-400">
												{store.slug} · {store.domain || "Domain belum diisi"}
											</div>
										</div>
										<ArrowRightIcon class="size-4 text-stone-400 dark:text-stone-500" />
									</button>
								{/each}
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root class="panel-card border-none shadow-none">
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title class="text-base font-semibold">Transaksi</Card.Title>
									<Card.Description class="text-[13px] leading-relaxed">
										Order yang cocok berdasarkan order ID, platform order ID, store, atau metode pembayaran.
									</Card.Description>
								</div>
								<Badge variant="outline" class="rounded-full">{transactions.length} hasil</Badge>
							</div>
						</Card.Header>
						<Card.Content class="space-y-2">
							{#if transactions.length === 0}
								<p class="text-[13px] text-stone-500 dark:text-stone-400">Tidak ada transaksi yang cocok dengan query ini.</p>
							{:else}
								{#each transactions as transaction}
									<button
										type="button"
										class="flex w-full items-center gap-3 rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/5"
										onclick={() => void onSelectTransaction(transaction)}
									>
										<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200">
											<ArrowLeftRightIcon class="size-4" />
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate font-mono text-[13px] font-semibold">{transaction.orderId}</div>
											<div class="truncate text-[12px] text-stone-500 dark:text-stone-400">
												{transaction.store} · {transaction.method} · {transaction.time}
											</div>
										</div>
										<ArrowRightIcon class="size-4 text-stone-400 dark:text-stone-500" />
									</button>
								{/each}
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root class="panel-card border-none shadow-none">
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title class="text-base font-semibold">Webhook Delivery</Card.Title>
									<Card.Description class="text-[13px] leading-relaxed">
										Delivery callback berdasarkan order ID, callback URL, atau event type.
									</Card.Description>
								</div>
								<Badge variant="outline" class="rounded-full">{webhooks.length} hasil</Badge>
							</div>
						</Card.Header>
						<Card.Content class="space-y-2">
							{#if webhooks.length === 0}
								<p class="text-[13px] text-stone-500 dark:text-stone-400">Tidak ada webhook delivery yang cocok dengan query ini.</p>
							{:else}
								{#each webhooks as webhook}
									<button
										type="button"
										class="flex w-full items-center gap-3 rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/5"
										onclick={() => void onSelectWebhook(webhook)}
									>
										<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200">
											<WebhookIcon class="size-4" />
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate font-mono text-[13px] font-semibold">{webhook.orderId}</div>
											<div class="truncate text-[12px] text-stone-500 dark:text-stone-400">
												{webhook.store} · {webhook.eventType} · attempt {webhook.attempt}/10
											</div>
										</div>
										<ArrowRightIcon class="size-4 text-stone-400 dark:text-stone-500" />
									</button>
								{/each}
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root class="panel-card border-none shadow-none">
						<Card.Header class="pb-3">
							<div class="flex items-center justify-between gap-3">
								<div>
									<Card.Title class="text-base font-semibold">Audit Log</Card.Title>
									<Card.Description class="text-[13px] leading-relaxed">
										Request ID, endpoint, atau error message yang cocok dengan query aktif.
									</Card.Description>
								</div>
								<Badge variant="outline" class="rounded-full">{auditLogs.length} hasil</Badge>
							</div>
						</Card.Header>
						<Card.Content class="space-y-2">
							{#if auditLogs.length === 0}
								<p class="text-[13px] text-stone-500 dark:text-stone-400">Tidak ada audit log yang cocok dengan query ini.</p>
							{:else}
								{#each auditLogs as auditLog}
									<button
										type="button"
										class="flex w-full items-center gap-3 rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/5"
										onclick={() => void onSelectAuditLog(auditLog)}
									>
										<div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200">
											<ScrollTextIcon class="size-4" />
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate font-mono text-[13px] font-semibold">{auditLog.requestId}</div>
											<div class="truncate text-[12px] text-stone-500 dark:text-stone-400">
												{auditLog.storeName} · {auditLog.method} {auditLog.url}
											</div>
										</div>
										<ArrowRightIcon class="size-4 text-stone-400 dark:text-stone-500" />
									</button>
								{/each}
							{/if}
						</Card.Content>
					</Card.Root>
				</div>
			{/if}

			{#if hasActiveQuery}
				<Separator.Root />
				<div class="flex flex-col gap-3 pb-6 text-[12px] text-stone-500 dark:text-stone-400 md:flex-row md:items-center md:justify-between">
					<div>
						Hasil berasal dari backend PayGate yang bisa diakses akun Anda saat ini. Scope store mengikuti filter aktif di dashboard.
					</div>
					<Button type="button" variant="outline" size="sm" class="rounded-full" onclick={() => onQueryChange("")}>
						Bersihkan query
					</Button>
				</div>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
