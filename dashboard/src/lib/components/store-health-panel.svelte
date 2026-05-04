<script lang="ts">
	import ActivityIcon from "@lucide/svelte/icons/activity";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import StoreIcon from "@lucide/svelte/icons/store";
	import WebhookIcon from "@lucide/svelte/icons/webhook";

	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import type { StoreHealthSummary } from "$lib/dashboard/models";

	export let rangeLabel = "7 Hari Terakhir";
	export let summaries: StoreHealthSummary[] = [];
	export let averageScore = 0;
	export let attentionCount = 0;
	export let onSelectStore: (item: StoreHealthSummary) => void = () => {};

	function toneBadgeClass(tone: StoreHealthSummary["tone"]) {
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

	function toneBarClass(tone: StoreHealthSummary["tone"]) {
		switch (tone) {
			case "emerald":
				return "bg-emerald-500";
			case "blue":
				return "bg-blue-500";
			case "amber":
				return "bg-amber-500";
			case "red":
				return "bg-red-500";
		}
	}
</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header class="gap-4">
		<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div class="space-y-2">
				<div class="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
					<ActivityIcon class="size-4" />
					Store Health
				</div>
				<div>
					<Card.Title class="text-[18px] font-bold tracking-tight">Skor kesehatan tenant merchant</Card.Title>
					<Card.Description class="mt-1 text-[14px] leading-relaxed">
						Lihat store mana yang stabil, mana yang mulai bermasalah, dan tenant mana yang butuh intervensi operator
						dalam rentang {rangeLabel.toLowerCase()}.
					</Card.Description>
				</div>
			</div>

			<div class="grid min-w-[260px] gap-3 sm:grid-cols-2">
				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						Rata-rata skor
					</div>
					<div class="mt-2 text-2xl font-bold tracking-tight">{averageScore}/100</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">
						Dihitung dari success rate, retry webhook, dan delivery gagal permanent.
					</div>
				</div>

				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						Perlu perhatian
					</div>
					<div class="mt-2 text-2xl font-bold tracking-tight">{attentionCount}</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">
						Store dengan retry aktif, delivery gagal, atau skor di bawah ambang sehat.
					</div>
				</div>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		{#if summaries.length === 0}
			<div class="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
				Belum ada store yang bisa dinilai. Tambahkan store dan transaksi lebih dulu agar health score bisa dihitung.
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
											{summary.callbackUrl || "Menggunakan callback default store"}
										</div>
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									<Badge variant="outline" class="rounded-full">
										{summary.storeStatus === "active" ? "Store aktif" : "Store nonaktif"}
									</Badge>
									<span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneBadgeClass(summary.tone)}`}>
										{summary.healthLabel}
									</span>
								</div>
							</div>

							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-4 py-3 text-right dark:border-white/10 dark:bg-white/5">
								<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									Score
								</div>
								<div class="mt-1 text-2xl font-bold tracking-tight">{summary.score}</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">/100</div>
							</div>
						</div>

						<div class="mt-4 h-2.5 rounded-full bg-stone-200/80 dark:bg-white/10">
							<div
								class={`h-full rounded-full transition-all duration-300 ${toneBarClass(summary.tone)}`}
								style={`width: ${summary.score}%;`}
							></div>
						</div>

						<div class="mt-4 grid gap-3 sm:grid-cols-3">
							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
								<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									Success rate
								</div>
								<div class="mt-1 text-lg font-bold">{summary.successRate.toFixed(1)}%</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									{summary.paidCount}/{summary.transactionCount || 0} paid
								</div>
							</div>

							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
								<div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									<WebhookIcon class="size-3.5" />
									Gagal
								</div>
								<div class="mt-1 text-lg font-bold">{summary.failedDeliveries}</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									Failed permanently
								</div>
							</div>

							<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-3 dark:border-white/10 dark:bg-white/5">
								<div class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
									{#if summary.retryingDeliveries > 0}
										<AlertTriangleIcon class="size-3.5" />
									{:else}
										<ShieldCheckIcon class="size-3.5" />
									{/if}
									Retry
								</div>
								<div class="mt-1 text-lg font-bold">{summary.retryingDeliveries}</div>
								<div class="text-[12px] text-stone-500 dark:text-stone-400">
									Delivery retry aktif
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
								{summary.failedDeliveries > 0 || summary.retryingDeliveries > 0 ? "Lihat Webhook" : "Kelola Store"}
								<ArrowRightIcon class="size-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
