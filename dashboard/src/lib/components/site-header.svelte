<script lang="ts">
	import BellIcon from "@lucide/svelte/icons/bell";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import SearchIcon from "@lucide/svelte/icons/search";
	import * as Sidebar from "$lib/components/ui/sidebar";

	import { runtimeConnection } from "$lib/api/runtime";
	import { dashboardTabMeta, type DashboardTab } from "$lib/dashboard/tabs";
	import ThemeToggle from "$lib/components/paygate/theme-toggle.svelte";

	export let activeTab: DashboardTab = "overview";
	export let webhookFailures = 0;
	export let onOpenSearch: () => void = () => {};
	export let onOpenWebhooks: () => void = () => {};
</script>

<header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-stone-200/60 bg-[color:color-mix(in_oklab,var(--background)_86%,transparent)] px-4 backdrop-blur-xl dark:border-white/10 md:px-6">
	<Sidebar.Trigger class="-ml-2 rounded-lg p-2 hover:bg-stone-200/60 dark:hover:bg-white/10" />

	<div class="flex items-center gap-2 text-sm">
		<span class="text-stone-500 dark:text-stone-400">Dashboard</span>
		<ChevronRightIcon class="size-[14px] text-stone-400 dark:text-stone-500" />
		<span class="font-medium">{dashboardTabMeta[activeTab].label}</span>
	</div>

	<div class="ml-auto flex items-center gap-2">
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
			class="hidden w-[280px] items-center gap-2 rounded-lg border border-stone-200/60 bg-white/60 px-3 py-2 text-left text-sm text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-900 dark:border-white/10 dark:bg-white/5 dark:text-stone-400 dark:hover:border-white/20 dark:hover:text-stone-100 md:flex"
			onclick={onOpenSearch}
		>
			<SearchIcon class="size-[15px]" />
			<span>Cari store, order, webhook, atau request ID...</span>
			<kbd class="ml-auto rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">⌘K</kbd>
		</button>

		<span
			class={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider sm:flex ${runtimeConnection.toneClass}`}
			title={runtimeConnection.description}
		>
			<span class={`h-1.5 w-1.5 rounded-full ${runtimeConnection.dotClass}`}></span>
			{runtimeConnection.label}
		</span>

		<ThemeToggle />

		<button
			type="button"
			class="relative rounded-lg p-2 transition-colors hover:bg-stone-200/60 dark:hover:bg-white/10"
			title={webhookFailures > 0 ? `${webhookFailures} webhook perlu perhatian` : "Buka tab webhook delivery"}
			onclick={onOpenWebhooks}
		>
			<BellIcon class="size-[18px]" />
			{#if webhookFailures > 0}
				<span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[var(--background)]"></span>
			{/if}
		</button>
	</div>
</header>
