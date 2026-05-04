<script lang="ts">
	import MenuIcon from "@lucide/svelte/icons/menu";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import { onMount } from "svelte";

	import ThemeToggle from "./theme-toggle.svelte";
	import { goto, route } from "$lib/spa";
	import { cn } from "$lib/utils";

	type NavbarMode = "home" | "pages";
	type ActivePage = "home" | "about" | "contact" | "privacy";

	export let mode: NavbarMode = "home";
	export let activePage: ActivePage = "home";

	let mobileMenuOpen = false;
	let isScrolled = false;

	const homeLinks = [
		{ label: "Fitur", href: "#fitur" },
		{ label: "Cara Kerja", href: "#cara-kerja" },
		{ label: "Developer", href: "#developer" },
		{ label: "Keamanan", href: "#keamanan" },
	];

	const pageLinks = [
		{ label: "Beranda", href: "/", key: "home" },
		{ label: "Tentang", href: "/about", key: "about" },
		{ label: "Kontak", href: "/contact", key: "contact" },
		{ label: "Privacy", href: "/privacy", key: "privacy" },
	];

	onMount(() => {
		const handleScroll = () => {
			isScrolled = window.scrollY > 20;
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	});

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<nav
	class={cn(
		"fixed inset-x-0 top-0 z-50 transition-all duration-500",
		isScrolled && "nav-scrolled"
	)}
>
	<div class="mx-auto max-w-6xl px-5 md:px-8">
		<div class="flex h-[72px] items-center justify-between">
			<a href="/" use:route class="flex items-center gap-2.5">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white transition-transform duration-300 hover:scale-105 dark:bg-white dark:text-stone-900"
				>
					<ShieldCheckIcon class="size-5" />
				</div>
				<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
			</a>

			<div class="hidden items-center gap-1 md:flex">
				{#if mode === "home"}
					{#each homeLinks as item}
						<a
							href={item.href}
							class="rounded-lg px-4 py-2 text-[14px] font-medium text-stone-600 transition-all hover:bg-black/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100"
						>
							{item.label}
						</a>
					{/each}
				{:else}
					{#each pageLinks as item}
						<a
							href={item.href}
							use:route
							class={cn(
								"rounded-lg px-4 py-2 text-[14px] font-medium transition-all",
								activePage === item.key
									? "bg-black/5 text-stone-900 dark:bg-white/5 dark:text-stone-100"
									: "text-stone-600 hover:bg-black/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100"
							)}
						>
							{item.label}
						</a>
					{/each}
				{/if}
			</div>

			<div class="flex items-center gap-3">
				<ThemeToggle />
				<button
					type="button"
					class="hidden text-[14px] font-semibold text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 sm:block"
					on:click={() => goto("/login")}
				>
					Masuk
				</button>
				<button
					type="button"
					class="rounded-xl bg-stone-900 px-5 py-2.5 text-[14px] font-semibold text-white transition-all duration-300 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100"
					on:click={() => goto("/register")}
				>
					Daftar Gratis
				</button>
				<button
					type="button"
					class="rounded-lg p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5 md:hidden"
					on:click={toggleMobileMenu}
					aria-label="Buka menu"
				>
					<MenuIcon class="size-5" />
				</button>
			</div>
		</div>
	</div>

	<div
		class={cn(
			"border-t border-black/5 bg-[#E3DDD7]/95 backdrop-blur-xl transition-all dark:border-white/5 dark:bg-[#1C1917]/95 md:hidden",
			mobileMenuOpen ? "block" : "hidden"
		)}
	>
		<div class="space-y-1 px-5 py-4">
			{#if mode === "home"}
				{#each homeLinks as item}
					<a
						href={item.href}
						class="block rounded-lg px-4 py-3 text-[15px] font-medium text-stone-600 transition-all hover:bg-black/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100"
						on:click={closeMobileMenu}
					>
						{item.label}
					</a>
				{/each}
			{:else}
				{#each pageLinks as item}
					<a
						href={item.href}
						use:route
						class={cn(
							"block rounded-lg px-4 py-3 text-[15px] font-medium transition-all",
							activePage === item.key
								? "bg-black/5 text-stone-900 dark:bg-white/5 dark:text-stone-100"
								: "text-stone-600 hover:bg-black/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100"
						)}
						on:click={closeMobileMenu}
					>
						{item.label}
					</a>
				{/each}
			{/if}

			<div class="flex gap-3 border-t border-black/5 pt-3 dark:border-white/5">
				<button
					type="button"
					class="flex-1 rounded-xl border border-stone-300 py-2.5 text-[14px] font-semibold transition-all hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
					on:click={() => {
						closeMobileMenu();
						goto("/login");
					}}
				>
					Masuk
				</button>
				<button
					type="button"
					class="flex-1 rounded-xl bg-stone-900 py-2.5 text-[14px] font-semibold text-white transition-all dark:bg-white dark:text-stone-900"
					on:click={() => {
						closeMobileMenu();
						goto("/register");
					}}
				>
					Daftar
				</button>
			</div>
		</div>
	</div>
</nav>
