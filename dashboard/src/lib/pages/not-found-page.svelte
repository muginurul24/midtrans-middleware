<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import CompassIcon from "@lucide/svelte/icons/compass";
	import SearchIcon from "@lucide/svelte/icons/search";

	import { goto } from "$lib/spa";

	export let route: unknown = undefined;
	$: route;
</script>

<svelte:head>
	<title>404 — PayGate</title>
</svelte:head>

<div class="grid-pattern flex min-h-screen items-center justify-center px-5 py-16">
	<div class="max-w-xl text-center">
		<div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-white dark:bg-white dark:text-stone-900">
			<SearchIcon class="size-7" />
		</div>
		<div class="mb-3 text-[13px] font-bold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">404</div>
		<h1 class="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl">Halaman tidak ditemukan</h1>
		<p class="mb-8 text-[16px] leading-relaxed text-stone-500 dark:text-stone-400">
			Route yang Anda buka tidak tersedia di shell frontend PayGate saat ini. Kembali ke beranda atau buka dashboard utama.
		</p>
		<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded-2xl bg-stone-900 px-6 py-3 text-[15px] font-bold text-white transition-colors hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100"
				on:click={() => goto("/")}
			>
				<ArrowLeftIcon class="size-4" />
				Kembali ke beranda
			</button>
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded-2xl border border-stone-200/70 bg-white/80 px-6 py-3 text-[15px] font-semibold transition-colors hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
				on:click={() => goto("/app")}
			>
				<CompassIcon class="size-4" />
				Buka dashboard
			</button>
		</div>
	</div>
</div>
