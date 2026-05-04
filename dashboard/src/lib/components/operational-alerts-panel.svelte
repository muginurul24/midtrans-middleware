<script lang="ts">
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import BellRingIcon from "@lucide/svelte/icons/bell-ring";
	import Clock3Icon from "@lucide/svelte/icons/clock-3";
	import RefreshCcwIcon from "@lucide/svelte/icons/refresh-ccw";
	import Settings2Icon from "@lucide/svelte/icons/settings-2";
	import StoreIcon from "@lucide/svelte/icons/store";
	import WebhookIcon from "@lucide/svelte/icons/webhook";

	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import type { OperationalAlert } from "$lib/dashboard/models";

	export let title = "Alert Operasional";
	export let description =
		"Item di bawah ini membutuhkan perhatian operator karena delivery webhook gagal, retry terlalu sering, atau konfigurasi store belum siap.";
	export let rangeLabel = "7 Hari Terakhir";
	export let alerts: OperationalAlert[] = [];
	export let maxItems = 4;
	export let dense = false;
	export let onOpenAlert: (alert: OperationalAlert) => void | Promise<void> = () => {};
	export let onResendAlert: (alert: OperationalAlert) => void | Promise<void> = () => {};

	$: visibleAlerts = alerts.slice(0, maxItems);
	$: hiddenAlertCount = Math.max(0, alerts.length - visibleAlerts.length);
	$: criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
	$: warningCount = alerts.filter((alert) => alert.severity === "warning").length;
	$: infoCount = alerts.filter((alert) => alert.severity === "info").length;

	function severityBadgeClass(severity: OperationalAlert["severity"]) {
		switch (severity) {
			case "critical":
				return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
			case "warning":
				return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
			case "info":
				return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
		}
	}

	function severityLabel(severity: OperationalAlert["severity"]) {
		switch (severity) {
			case "critical":
				return "Kritis";
			case "warning":
				return "Perlu ditinjau";
			case "info":
				return "Tindak lanjut";
		}
	}

	function categoryIcon(alert: OperationalAlert) {
		switch (alert.category) {
			case "webhook_failed":
			case "webhook_retrying":
				return WebhookIcon;
			case "callback_missing":
			case "store_inactive":
				return StoreIcon;
		}
	}

	function secondaryActionLabel(alert: OperationalAlert) {
		if (alert.category === "webhook_failed" && alert.canResend) {
			return "Resend";
		}
		if (alert.category === "callback_missing" || alert.category === "store_inactive") {
			return "Buka store";
		}
		return "";
	}
</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header class={dense ? "px-0 pt-0" : undefined}>
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
			<div class="space-y-2">
				<div class="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
					<BellRingIcon class="size-4" />
					{title}
				</div>
				<div>
					<Card.Title class="text-[18px] font-bold tracking-tight">Prioritas operasional yang perlu ditangani</Card.Title>
					<Card.Description class="mt-1 text-[14px] leading-relaxed">
						{description}
					</Card.Description>
				</div>
			</div>

			<div class="grid min-w-[260px] gap-3 sm:grid-cols-3">
				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						Kritis
					</div>
					<div class="mt-2 text-2xl font-bold tracking-tight">{criticalCount}</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">Delivery gagal permanent</div>
				</div>

				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						Warning
					</div>
					<div class="mt-2 text-2xl font-bold tracking-tight">{warningCount}</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">Retry aktif atau callback belum siap</div>
				</div>

				<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
					<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
						Rentang
					</div>
					<div class="mt-2 text-sm font-semibold tracking-tight">{rangeLabel}</div>
					<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">{infoCount} item informasional ikut dipantau</div>
				</div>
			</div>
		</div>
	</Card.Header>

	<Card.Content class={dense ? "px-0 pb-0" : undefined}>
		{#if visibleAlerts.length === 0}
			<div class="rounded-2xl border border-dashed border-stone-200 px-4 py-8 text-center dark:border-white/10">
				<div class="mx-auto flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
					<BellRingIcon class="size-5" />
				</div>
				<div class="mt-4 text-sm font-semibold">Tidak ada alert operasional aktif</div>
				<p class="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
					Tidak ada retry yang menumpuk, delivery gagal permanent, atau konfigurasi store yang perlu dibenahi untuk
					rentang {rangeLabel.toLowerCase()}.
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each visibleAlerts as alert}
					<div class="rounded-[22px] border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
						<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div class="min-w-0 flex-1 space-y-3">
								<div class="flex flex-wrap items-start gap-3">
									<div class="flex size-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-700 dark:bg-white/10 dark:text-stone-200">
										<svelte:component this={categoryIcon(alert)} class="size-4" />
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-center gap-2">
											<h3 class="text-sm font-semibold">{alert.title}</h3>
											<span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityBadgeClass(alert.severity)}`}>
												{severityLabel(alert.severity)}
											</span>
										</div>
										<p class="mt-1 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
											{alert.summary}
										</p>
									</div>
								</div>

								<div class="flex flex-wrap gap-2">
									<Badge variant="outline" class="rounded-full">
										{alert.statusLabel}
									</Badge>
									<Badge variant="outline" class="rounded-full">
										{alert.storeName}
									</Badge>
									{#if alert.orderId}
										<Badge variant="outline" class="rounded-full font-mono">
											{alert.orderId}
										</Badge>
									{/if}
									{#if alert.attemptLabel}
										<Badge variant="outline" class="rounded-full">
											{alert.attemptLabel}
										</Badge>
									{/if}
								</div>

								<div class="grid gap-2 text-[12px] text-stone-500 dark:text-stone-400 md:grid-cols-2">
									<div class="flex items-start gap-2">
										<StoreIcon class="mt-0.5 size-3.5 flex-shrink-0" />
										<div>
											<div class="font-semibold text-stone-700 dark:text-stone-300">Store</div>
											<div>{alert.storeName}</div>
										</div>
									</div>
									{#if alert.timeLabel}
										<div class="flex items-start gap-2">
											<Clock3Icon class="mt-0.5 size-3.5 flex-shrink-0" />
											<div>
												<div class="font-semibold text-stone-700 dark:text-stone-300">Waktu terakhir</div>
												<div>{alert.timeLabel}</div>
											</div>
										</div>
									{/if}
								</div>

								{#if alert.callbackUrl}
									<div class="rounded-2xl border border-stone-200/60 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/5">
										<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
											Callback
										</div>
										<div class="mt-1 break-all font-mono text-[12px] text-stone-600 dark:text-stone-300">
											{alert.callbackUrl}
										</div>
									</div>
								{/if}
							</div>

							<div class="flex shrink-0 flex-wrap gap-2">
								<Button type="button" variant="outline" class="rounded-full" onclick={() => void onOpenAlert(alert)}>
									{alert.actionLabel}
								</Button>
								{#if alert.category === "webhook_failed" && alert.canResend}
									<Button
										type="button"
										variant="default"
										class="rounded-full"
										onclick={() => void onResendAlert(alert)}
									>
										<RefreshCcwIcon class="size-4" />
										{secondaryActionLabel(alert)}
									</Button>
								{:else if secondaryActionLabel(alert)}
									<Button
										type="button"
										variant="ghost"
										class="rounded-full"
										onclick={() => void onOpenAlert(alert)}
									>
										<Settings2Icon class="size-4" />
										{secondaryActionLabel(alert)}
									</Button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			{#if hiddenAlertCount > 0}
				<div class="mt-3 rounded-2xl border border-dashed border-stone-200 px-4 py-3 text-[13px] text-stone-500 dark:border-white/10 dark:text-stone-400">
					Masih ada {hiddenAlertCount} alert tambahan. Buka tray notifikasi untuk melihat seluruh item yang membutuhkan
					tindak lanjut.
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
