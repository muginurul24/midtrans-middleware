<script lang="ts">
	import BellIcon from "@lucide/svelte/icons/bell";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import SearchIcon from "@lucide/svelte/icons/search";
	import * as Sidebar from "$lib/components/ui/sidebar";

	import { runtimeConnection } from "$lib/api/runtime";
	import { dashboardTabMeta, type DashboardTab } from "$lib/dashboard/tabs";
	import ThemeToggle from "$lib/components/paygate/theme-toggle.svelte";

	export let activeTab: DashboardTab = "overview";
	export let operationalAlertCount = 0;
	export let onOpenSearch: () => void = () => {};
	export let onOpenAlerts: () => void = () => {};
</script>

<header class="sticky top-0 z-30 flex min-w-0 items-center gap-3 border-b border-stone-200/60 bg-[color:color-mix(in_oklab,var(--background)_86%,transparent)] px-4 py-3 backdrop-blur-xl dark:border-white/10 md:h-16 md:px-6 md:py-0">
	<Sidebar.Trigger class="-ml-2 rounded-lg p-2 hover:bg-stone-200/60 dark:hover:bg-white/10" />

	<div class="min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm md:flex md:flex-none">
		<span class="shrink-0 text-stone-500 dark:text-stone-400">Dashboard</span>
		<ChevronRightIcon class="size-[14px] text-stone-400 dark:text-stone-500" />
		<span class="truncate font-medium">{dashboardTabMeta[activeTab].label}</span>
	</div>

	<div class="ml-auto flex min-w-0 items-center gap-2">
		<button
			type="button"
			class="inline-flex rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-100 md:hidden"
			onclick={onOpenSearch}
			title="Buka pencarian global"
		>
			<SearchIcon class="size-[18px]" />
		</button>

		<button
			type="button"
			class="hidden min-w-0 flex-1 items-center gap-2 rounded-lg border border-stone-200/60 bg-white/60 px-3 py-2 text-left text-sm text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-stone-400 dark:hover:border-white/20 dark:hover:text-stone-100 md:flex md:max-w-[320px] lg:max-w-[360px]"
			onclick={onOpenSearch}
		>
			<SearchIcon class="size-[15px] shrink-0" />
			<span class="truncate">Cari store, order, webhook, atau request ID...</span>
			<kbd class="ml-auto hidden rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10 lg:inline-flex">⌘K</kbd>
		</button>

		<span
			class={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider lg:flex ${runtimeConnection.toneClass}`}
			title={runtimeConnection.description}
		>
			<span class={`h-1.5 w-1.5 rounded-full ${runtimeConnection.dotClass}`}></span>
			{runtimeConnection.label}
		</span>

		<ThemeToggle />

		<button
			type="button"
			class="relative rounded-lg p-2 transition-colors hover:bg-stone-200/60 dark:hover:bg-white/10"
			title={
				operationalAlertCount > 0
					? `${operationalAlertCount} item operasional perlu perhatian`
					: "Lihat ringkasan alert operasional"
			}
			onclick={onOpenAlerts}
		>
			<BellIcon class="size-[18px]" />
			{#if operationalAlertCount > 0}
				<span class="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ring-2 ring-[var(--background)]">
					{operationalAlertCount > 9 ? "9+" : operationalAlertCount}
				</span>
			{/if}
		</button>
	</div>
</header>
