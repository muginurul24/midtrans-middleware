<script lang="ts">
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import ArrowLeftRightIcon from "@lucide/svelte/icons/arrow-left-right";
	import BanknoteIcon from "@lucide/svelte/icons/banknote";
	import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
	import TrendingDownIcon from "@lucide/svelte/icons/trending-down";
	import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
	import { toast } from "svelte-sonner";

	import type { OverviewMetric } from "$lib/dashboard/models";

	export let metrics: OverviewMetric[] = [];

	const iconMap = {
		default: ArrowLeftRightIcon,
		emerald: BanknoteIcon,
		blue: CheckCircle2Icon,
		orange: AlertTriangleIcon,
	};

	const toneMap = {
		default: "bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300",
		emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
		blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
		orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
	};
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	{#each metrics as metric, index}
		{@const Icon = iconMap[metric.tone]}
		<button
			type="button"
			class={`animate-fade-in-up delay-${Math.min(index + 1, 6)} rounded-[20px] border border-stone-200/60 bg-white/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:shadow-black/20 ${metric.label === "Webhook Gagal" ? "cursor-pointer" : ""}`}
			onclick={() => {
				if (metric.label === "Webhook Gagal") {
					toast.warning("3 webhook gagal permanent. Buka tab Webhook untuk detail delivery.");
				}
			}}
		>
			<div class="mb-3 flex items-center justify-between">
				<span class="text-[13px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">{metric.label}</span>
				<div class={`flex h-9 w-9 items-center justify-center rounded-lg ${toneMap[metric.tone]}`}>
					<Icon class="size-[18px]" />
				</div>
			</div>
			<div class="text-3xl font-bold tracking-tight">{metric.value}</div>
			<div class="mt-2 flex items-center gap-1.5">
				<span class={`flex items-center gap-1 text-[13px] font-semibold ${metric.trend === "down" ? "text-red-500 dark:text-red-400" : metric.trend === "neutral" ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400"}`}>
					{#if metric.trend === "down"}
						<TrendingDownIcon class="size-[14px]" />
					{:else if metric.trend === "neutral"}
						<AlertTriangleIcon class="size-[14px]" />
					{:else}
						<TrendingUpIcon class="size-[14px]" />
					{/if}
					{metric.delta}
				</span>
				<span class="text-[13px] text-stone-400 dark:text-stone-500">{metric.helper}</span>
			</div>
		</button>
	{/each}
</div>
