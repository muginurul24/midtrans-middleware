<script lang="ts">
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import CheckIcon from "@lucide/svelte/icons/check";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import XIcon from "@lucide/svelte/icons/x";

	import type {
		OverviewTransaction,
		OverviewWebhookDelivery,
	} from "$lib/dashboard/models";

	export let transactions: OverviewTransaction[] = [];
	export let webhookDeliveries: OverviewWebhookDelivery[] = [];
	export let showTransactions = true;
	export let showWebhooks = true;
	export let onSelectTransaction: (transaction: OverviewTransaction) => void = () => {};
	export let onSelectWebhook: (delivery: OverviewWebhookDelivery) => void = () => {};
	export let onViewAllTransactions: () => void = () => {};
	export let onViewAllWebhooks: () => void = () => {};

	function formatRp(amount: number) {
		return `Rp ${amount.toLocaleString("id-ID")}`;
	}

	function transactionStatus(status: OverviewTransaction["status"]) {
		switch (status) {
			case "paid":
				return { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
			case "pending":
				return { label: "Pending", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
			case "challenge":
				return { label: "Challenge", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
			case "failed":
				return { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
			case "expired":
				return { label: "Expired", className: "bg-stone-100 text-stone-500 dark:bg-white/10 dark:text-stone-400" };
			default:
				return { label: "Cancelled", className: "bg-stone-100 text-stone-500 dark:bg-white/10 dark:text-stone-400" };
		}
	}

	function webhookStatus(status: OverviewWebhookDelivery["status"]) {
		switch (status) {
			case "success":
				return { label: "Success", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: CheckIcon, box: "bg-emerald-100 dark:bg-emerald-900/30", iconClass: "text-emerald-600 dark:text-emerald-400" };
			case "retrying":
				return { label: "Retrying", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: LoaderCircleIcon, box: "bg-amber-100 dark:bg-amber-900/30", iconClass: "text-amber-600 dark:text-amber-400 animate-spin" };
			default:
				return { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XIcon, box: "bg-red-100 dark:bg-red-900/30", iconClass: "text-red-600 dark:text-red-400" };
		}
	}
</script>

<div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
	{#if showTransactions}
	<div class={`rounded-[20px] border border-stone-200/60 bg-white/70 dark:border-white/10 dark:bg-white/5 ${showWebhooks ? "lg:col-span-3" : "lg:col-span-5"}`}>
		<div class="flex items-center justify-between px-5 pb-0 pt-5">
			<div>
				<h3 class="text-[15px] font-semibold">Transaksi Terbaru</h3>
				<p class="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">10 transaksi terakhir</p>
			</div>
			<button type="button" class="inline-flex items-center gap-1 text-[13px] font-semibold text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100" onclick={onViewAllTransactions}>
				Lihat semua
				<ArrowRightIcon class="size-3.5" />
			</button>
		</div>

		<div class="mt-4 overflow-x-auto">
			<table class="w-full text-[13px]">
				<thead>
					<tr class="border-b border-stone-200/60 dark:border-white/10">
						<th class="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Order ID</th>
						<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Toko</th>
						<th class="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Amount</th>
						<th class="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Metode</th>
						<th class="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Status</th>
						<th class="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Waktu</th>
					</tr>
				</thead>
				<tbody>
					{#if transactions.length === 0}
						<tr>
							<td colspan="6" class="px-5 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
								Belum ada transaksi yang cocok dengan filter yang dipilih.
							</td>
						</tr>
					{:else}
						{#each transactions as transaction}
						{@const status = transactionStatus(transaction.status)}
						<tr class="table-row-hover cursor-pointer border-b border-stone-100 transition-colors dark:border-white/5" onclick={() => onSelectTransaction(transaction)}>
							<td class="px-5 py-3 font-mono font-medium">{transaction.orderId}</td>
							<td class="max-w-[120px] truncate px-3 py-3 text-stone-500 dark:text-stone-400">{transaction.store}</td>
							<td class="px-3 py-3 text-right font-semibold">{formatRp(transaction.amount)}</td>
							<td class="px-3 py-3 text-stone-600 dark:text-stone-300">{transaction.method}</td>
							<td class="px-3 py-3 text-center">
								<span class={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
							</td>
							<td class="whitespace-nowrap px-5 py-3 text-right text-stone-400 dark:text-stone-500">{transaction.time}</td>
						</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
	{/if}

	{#if showWebhooks}
	<div class="rounded-[20px] border border-stone-200/60 bg-white/70 dark:border-white/10 dark:bg-white/5 lg:col-span-2">
		<div class="flex items-center justify-between px-5 pb-0 pt-5">
			<div>
				<h3 class="text-[15px] font-semibold">Webhook Delivery</h3>
				<p class="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">Status pengiriman terbaru</p>
			</div>
			<button type="button" class="inline-flex items-center gap-1 text-[13px] font-semibold text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100" onclick={onViewAllWebhooks}>
				Lihat semua
				<ArrowRightIcon class="size-3.5" />
			</button>
		</div>

		<div class="space-y-2 p-5 pt-3">
			{#if webhookDeliveries.length === 0}
				<div class="rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
					Belum ada webhook delivery yang cocok dengan filter saat ini.
				</div>
			{:else}
				{#each webhookDeliveries as delivery}
					{@const status = webhookStatus(delivery.status)}
					<button type="button" class="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-white/5" onclick={() => onSelectWebhook(delivery)}>
						<div class={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${status.box}`}>
							<status.icon class={`size-[15px] ${status.iconClass}`} />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate font-mono text-[13px] font-medium">{delivery.orderId}</span>
								<span class={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
							</div>
							<div class="mt-0.5 text-[12px] text-stone-400 dark:text-stone-500">
								{delivery.store} · Attempt {delivery.attempt}/10{delivery.statusCode ? ` · HTTP ${delivery.statusCode}` : ""}
							</div>
						</div>
						<span class="shrink-0 whitespace-nowrap text-[12px] text-stone-400 dark:text-stone-500">{delivery.time}</span>
					</button>
				{/each}
			{/if}
		</div>
	</div>
	{/if}
</div>
