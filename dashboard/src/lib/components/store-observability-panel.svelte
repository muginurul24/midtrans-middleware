<script lang="ts">
	import ActivityIcon from "@lucide/svelte/icons/activity";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import GaugeIcon from "@lucide/svelte/icons/gauge";
	import ShieldAlertIcon from "@lucide/svelte/icons/shield-alert";
	import StoreIcon from "@lucide/svelte/icons/store";
	import TimerResetIcon from "@lucide/svelte/icons/timer-reset";
	import TrendingDownIcon from "@lucide/svelte/icons/trending-down";
	import TrendingUpIcon from "@lucide/svelte/icons/trending-up";

	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import type { StoreObservabilitySummary } from "$lib/dashboard/models";

	export let rangeLabel = "7 Hari Terakhir";
	export let summaries: StoreObservabilitySummary[] = [];
	export let averageSuccessRatio = 100;
	export let averageP95LatencyMs: number | null = null;
	export let attentionCount = 0;
	export let onSelectStore: (item: StoreObservabilitySummary) => void = () => {};

	function toneBadgeClass(tone: StoreObservabilitySummary["tone"]) {
		switch (tone) {
			case "emerald":
				return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
			case "blue":
				return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
			case "amber":
				return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
			case "red":
				return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
		}
	}

	function toneLabel(tone: StoreObservabilitySummary["tone"]) {
		switch (tone) {
			case "emerald":
				return "Stabil";
			case "blue":
				return "Perlu dipantau";
			case "amber":
				return "Perlu perhatian";
			case "red":
				return "Kritis";
		}
	}

	function formatLatency(value: number | null) {
		if (value === null) return "Belum ada data";
		return `${value} ms`;
	}

	function formatDelta(value: number) {
		if (value > 0) return `+${value}`;
		if (value < 0) return `${value}`;
		return "0";
	}

	function deltaTone(value: number) {
		if (value > 0) return "text-red-500 dark:text-red-400";
		if (value < 0) return "text-emerald-600 dark:text-emerald-400";
		return "text-stone-500 dark:text-stone-400";
	}

	function actionLabel(summary: StoreObservabilitySummary) {
		if (summary.recentFailed > 0 || summary.recentRetrying > 0 || summary.retryDelta > 0) {
			return "Tinjau Webhook";
		}
		return "Lihat Audit";
	}
</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header class="gap-4">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div class="space-y-2">
				<div class="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
					<GaugeIcon class="size-4" />
					Store Observability
				</div>
				<div>
					<Card.Title class="text-[18px] font-bold tracking-tight">
						Kesehatan callback per store
					</Card.Title>
					<Card.Description class="mt-1 text-[14px] leading-relaxed">
						Pakai panel ini untuk membaca success ratio, p95 callback, dan perubahan retry/failure antara window terbaru
						dan window sebelumnya dalam rentang {rangeLabel.toLowerCase()}.
					</Card.Description>
				</div>
			</div>

			<div class="grid min-w-[260px] gap-3 sm:grid-cols-3">
				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						Success ratio
					</div>
					<div class="mt-2 text-2xl font-bold tracking-tight">{averageSuccessRatio.toFixed(1)}%</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">
						Rata-rata delivery sukses lintas store.
					</div>
				</div>

				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						P95 callback
					</div>
					<div class="mt-2 text-2xl font-bold tracking-tight">{formatLatency(averageP95LatencyMs)}</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">
						Rata-rata p95 dari store yang punya data latency.
					</div>
				</div>

				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						Perlu perhatian
					</div>
					<div class="mt-2 text-2xl font-bold tracking-tight">{attentionCount}</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">
						Store dengan latency tinggi, retry naik, atau gagal permanent.
					</div>
				</div>
			</div>
		</div>
	</Card.Header>

	<Card.Content class="space-y-4">
		<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-[13px] leading-relaxed text-stone-500 dark:border-white/10 dark:bg-black/20 dark:text-stone-400">
			Delta positif pada retry atau failure berarti window terbaru lebih buruk daripada window sebelumnya. Ini membantu operator tahu
			apakah incident merchant sedang membaik, stagnan, atau justru memburuk.
		</div>

		{#if summaries.length === 0}
			<div class="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
				Belum ada delivery webhook pada rentang aktif. Jalankan charge atau resend lebih dulu agar observability store bisa dihitung.
			</div>
		{:else}
			<div class="grid gap-4 xl:grid-cols-2">
				{#each summaries as summary}
					<div class="rounded-[22px] border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
						<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div class="space-y-2">
								<div class="flex flex-wrap items-center gap-2">
									<div class="flex size-9 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200">
										<StoreIcon class="size-4" />
									</div>
									<div>
										<div class="text-sm font-semibold">{summary.storeName}</div>
										<div class="text-[12px] text-stone-500 dark:text-stone-400">
											{summary.callbackUrl || "Store belum punya callback default"}
										</div>
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant="outline" class="rounded-full">
										{summary.storeStatus === "active" ? "Store aktif" : "Store nonaktif"}
									</Badge>
									<span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneBadgeClass(summary.tone)}`}>
										{toneLabel(summary.tone)}
									</span>
								</div>
							</div>

							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-4 py-3 text-right dark:border-white/10 dark:bg-white/5">
								<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									Attempt terakhir
								</div>
								<div class="mt-1 text-sm font-semibold">
									{summary.latestAttemptAt ? new Date(summary.latestAttemptAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }) : "Belum ada"}
								</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									HTTP {summary.latestResponseStatus ?? "-"}
								</div>
							</div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
								<div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									<ActivityIcon class="size-3.5" />
									Success ratio
								</div>
								<div class="mt-1 text-lg font-bold">{summary.successRatio.toFixed(1)}%</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									{summary.successfulDeliveries}/{summary.totalDeliveries || 0} delivery sukses
								</div>
							</div>

							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
								<div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									<TimerResetIcon class="size-3.5" />
									P95 callback
								</div>
								<div class="mt-1 text-lg font-bold">{formatLatency(summary.p95LatencyMs)}</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									Rata-rata {formatLatency(summary.averageLatencyMs)}
								</div>
							</div>

							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
								<div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									{#if summary.retryDelta > 0}
										<TrendingUpIcon class="size-3.5" />
									{:else}
										<TrendingDownIcon class="size-3.5" />
									{/if}
									Retry trend
								</div>
								<div class={`mt-1 text-lg font-bold ${deltaTone(summary.retryDelta)}`}>
									{formatDelta(summary.retryDelta)}
								</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									Window terbaru {summary.recentRetrying}, sebelumnya {summary.previousRetrying}
								</div>
							</div>

							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
								<div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									<ShieldAlertIcon class="size-3.5" />
									Failure trend
								</div>
								<div class={`mt-1 text-lg font-bold ${deltaTone(summary.failedDelta)}`}>
									{formatDelta(summary.failedDelta)}
								</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									Window terbaru {summary.recentFailed}, sebelumnya {summary.previousFailed}
								</div>
							</div>
						</div>

						<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p class="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
								{summary.summary}
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								class="rounded-full"
								onclick={() => onSelectStore(summary)}
							>
								{actionLabel(summary)}
								<ArrowRightIcon class="size-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
