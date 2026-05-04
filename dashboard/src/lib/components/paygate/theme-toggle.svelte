<script lang="ts">
	import MoonStarIcon from "@lucide/svelte/icons/moon-star";
	import SunMediumIcon from "@lucide/svelte/icons/sun-medium";
	import { mode, toggleMode } from "mode-watcher";
	import { cn } from "$lib/utils";

	export let className = "";
	export let title = "Ganti tema";
</script>

<button
	type="button"
	class={cn(
		"inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/70 text-stone-700 shadow-sm transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10",
		className
	)}
	aria-label={title}
	title={title}
	on:click={toggleMode}
>
	{#if mode.current === "dark"}
		<SunMediumIcon class="size-[18px]" />
	{:else}
		<MoonStarIcon class="size-[18px]" />
	{/if}
</button>
