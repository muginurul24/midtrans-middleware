<script lang="ts">
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import CheckIcon from "@lucide/svelte/icons/check";
	import Code2Icon from "@lucide/svelte/icons/code-2";
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import GaugeIcon from "@lucide/svelte/icons/gauge";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import LandmarkIcon from "@lucide/svelte/icons/landmark";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import LockIcon from "@lucide/svelte/icons/lock";
	import RefreshCcwIcon from "@lucide/svelte/icons/refresh-ccw";
	import RouteIcon from "@lucide/svelte/icons/route";
	import ScrollTextIcon from "@lucide/svelte/icons/scroll-text";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import StoreIcon from "@lucide/svelte/icons/store";
	import TerminalIcon from "@lucide/svelte/icons/terminal";
	import WebhookIcon from "@lucide/svelte/icons/webhook";
	import { onMount } from "svelte";

	import MarketingFooter from "$lib/components/paygate/marketing-footer.svelte";
	import MarketingNavbar from "$lib/components/paygate/marketing-navbar.svelte";
	import { developerChargeRequest, developerChargeResponse } from "$lib/content/paygate";
	import { setupRevealObserver } from "$lib/paygate/reveal";
	import { goto } from "$lib/spa";

	export let route: unknown = undefined;
	$: route;

	const featureCards = [
		{
			icon: KeyRoundIcon,
			title: "API Token per Toko",
			body: "Setiap toko punya token unik. Token disimpan hashed, bisa di-revoke, dan tidak pernah membuka data tenant lain.",
			tone: "bg-stone-900 text-white dark:bg-white/10 dark:text-stone-100",
		},
		{
			icon: EyeOffIcon,
			title: "Credential Tersembunyi",
			body: "Server Key Midtrans tidak pernah muncul di frontend atau response toko. Semua request diteruskan dari server platform.",
			tone: "bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300",
		},
		{
			icon: ScrollTextIcon,
			title: "Audit Log Lengkap",
			body: "Setiap request, response, webhook, dan retry dicatat untuk investigasi. Field sensitif otomatis dimasking.",
			tone: "bg-blue-600 text-white dark:bg-blue-500/20 dark:text-blue-300",
		},
		{
			icon: WebhookIcon,
			title: "Webhook Relay",
			body: "Webhook Midtrans diverifikasi lalu diteruskan ke callback toko dengan signature platform, lengkap dengan status delivery.",
			tone: "bg-orange-500 text-white dark:bg-orange-500/20 dark:text-orange-300",
		},
		{
			icon: RefreshCcwIcon,
			title: "Auto Retry 10x",
			body: "Delivery gagal akan retry bertahap dan tetap bisa di-resend manual dari dashboard ketika perlu penanganan operator.",
			tone: "bg-red-500 text-white dark:bg-red-500/20 dark:text-red-300",
		},
		{
			icon: GaugeIcon,
			title: "Rate Limiting",
			body: "Batas per token dan per store dijaga via Redis agar abuse tidak mengganggu trafik pembayaran normal.",
			tone: "bg-stone-700 text-white dark:bg-white/10 dark:text-stone-100",
		},
	];

	const workSteps = [
		{
			title: "Toko kirim request",
			body: "Backend toko memanggil endpoint charge PayGate dengan bearer token store dan payload custom yang lebih sederhana.",
		},
		{
			title: "Validasi dan rate limit",
			body: "Token, status store, idempotency key, dan batas request dicek lebih dulu sebelum request menyentuh Midtrans.",
		},
		{
			title: "Audit dan mapping",
			body: "Request disalin ke audit log dalam versi ter-masking lalu di-mapping ke format Core API Midtrans.",
		},
		{
			title: "Forward ke Midtrans",
			body: "Server platform memanggil Midtrans dengan server key pusat, lengkap dengan timeout dan error handling.",
		},
		{
			title: "Response aman ke toko",
			body: "Hanya data aman seperti VA, payment type, dan status yang dikembalikan ke toko tanpa credential sensitif.",
		},
		{
			title: "Webhook relay",
			body: "Saat Midtrans mengirim notifikasi, platform memverifikasi signature, memperbarui status, lalu meneruskan webhook ke toko.",
		},
	];

	const securityCards = [
		{
			icon: ShieldCheckIcon,
			title: "Signature Verification",
			body: "Inbound Midtrans diverifikasi dengan SHA512, outbound ke toko ditandatangani HMAC-SHA256 memakai secret per store.",
		},
		{
			icon: KeyRoundIcon,
			title: "Token Hashing",
			body: "API token hanya ditampilkan sekali saat dibuat. Yang disimpan di server hanyalah hash dan prefix token.",
		},
		{
			icon: EyeOffIcon,
			title: "Data Masking",
			body: "Authorization, Server Key, token, webhook secret, dan password tidak pernah disimpan mentah di audit log.",
		},
		{
			icon: LockIcon,
			title: "Tenant Isolation",
			body: "Setiap query dashboard dan store-facing API memegang batas store_id agar data antar toko tidak tercampur.",
		},
	];

	const techStacks = [
		{ emoji: "📘", title: "Go", body: "Chi Router" },
		{ emoji: "🐘", title: "PostgreSQL", body: "pgx + sqlc" },
		{ emoji: "⚡", title: "Redis", body: "Queue + cache" },
		{ emoji: "🔄", title: "Asynq", body: "Worker delivery" },
		{ emoji: "⚛️", title: "Svelte + Vite", body: "Dashboard baru" },
		{ emoji: "🎨", title: "Tailwind + shadcn", body: "Design system" },
		{ emoji: "🐋", title: "Docker", body: "Local compose" },
		{ emoji: "💳", title: "Midtrans", body: "Core API" },
	];

	onMount(() => setupRevealObserver());
</script>

<svelte:head>
	<title>PayGate — Payment Middleware untuk Multi-Toko</title>
</svelte:head>

<MarketingNavbar mode="home" activePage="home" />

<section class="grid-pattern spotlight-container relative flex min-h-screen items-center justify-center overflow-hidden pt-[72px]">
	<div class="anim-pulse-glow pointer-events-none absolute right-[10%] top-20 h-[400px] w-[400px] rounded-full bg-emerald-400/10 blur-[120px] dark:bg-emerald-500/5"></div>
	<div class="anim-pulse-glow pointer-events-none absolute bottom-20 left-[5%] h-[300px] w-[300px] rounded-full bg-amber-400/10 blur-[100px] dark:bg-amber-500/5" style="animation-delay: 2s;"></div>

	<div class="relative z-10 mx-auto max-w-4xl px-5 py-20 text-center md:px-8">
		<div class="anim-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/70 px-4 py-1.5 dark:border-white/10 dark:bg-white/5">
			<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
			<span class="text-[13px] font-semibold text-stone-600 dark:text-stone-300">Midtrans Payment Middleware</span>
		</div>

		<h1 class="anim-fade-up mb-6 text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-5xl md:text-6xl lg:text-[68px]" style="animation-delay: 100ms;">
			Satu Gateway,<br />
			<span class="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:via-emerald-300 dark:to-teal-400">
				Banyak Toko
			</span>
		</h1>

		<p class="anim-fade-up mx-auto mb-10 max-w-2xl text-lg font-medium leading-relaxed text-stone-600 dark:text-stone-400 md:text-xl" style="animation-delay: 200ms;">
			Middleware pembayaran yang menyembunyikan credential Midtrans, mencatat setiap request untuk audit, dan meneruskan webhook secara aman ke toko Anda.
		</p>

		<div class="anim-fade-up mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row" style="animation-delay: 300ms;">
			<button
				type="button"
				class="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-8 py-4 text-[16px] font-bold text-white transition-all duration-300 hover:bg-stone-800 sm:w-auto dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100"
				on:click={() => goto("/register")}
			>
				Mulai Gratis
				<ArrowRightIcon class="size-[18px]" />
			</button>
			<a href="#developer" class="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200/60 bg-white/70 px-8 py-4 text-[16px] font-bold transition-all duration-300 hover:bg-white sm:w-auto dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
				<Code2Icon class="size-[18px]" />
				Lihat Dokumentasi
			</a>
		</div>

		<div class="anim-fade-up relative mx-auto max-w-3xl" style="animation-delay: 450ms;">
			<div class="glass-dark-card rounded-[28px] border border-white/10 p-5 md:p-8">
				<div class="flex flex-col items-center justify-between gap-4 md:flex-row md:gap-0">
					<div class="anim-float flex flex-col items-center gap-2">
						<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
							<StoreIcon class="size-[26px] text-stone-200" />
						</div>
						<span class="text-[12px] font-bold uppercase tracking-wider text-stone-300">Backend Toko</span>
						<span class="font-mono text-[11px] text-stone-500">Bearer sk_test_…</span>
					</div>
					<div class="hidden flex-1 flex-col items-center gap-1 px-2 md:flex">
						<div class="relative h-[2px] w-full overflow-hidden bg-gradient-to-r from-stone-600 via-emerald-500 to-stone-600">
							<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" style="animation: slideRight 2s ease-in-out infinite;"></div>
						</div>
						<span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Custom Payload</span>
					</div>
					<div class="md:hidden">
						<ArrowDownIcon class="size-6 text-emerald-500" />
					</div>
					<div class="anim-float-delay flex flex-col items-center gap-2">
						<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-stone-900 shadow-lg shadow-black/20">
							<ShieldCheckIcon class="size-[30px]" />
						</div>
						<span class="text-[12px] font-bold uppercase tracking-wider text-white">PayGate API</span>
						<div class="flex items-center gap-2 font-mono text-[10px] text-stone-500">
							<span class="rounded bg-white/10 px-1.5 py-0.5">Validate</span>
							<span class="rounded bg-white/10 px-1.5 py-0.5">Audit</span>
							<span class="rounded bg-white/10 px-1.5 py-0.5">Map</span>
						</div>
					</div>
					<div class="hidden flex-1 flex-col items-center gap-1 px-2 md:flex">
						<div class="relative h-[2px] w-full overflow-hidden bg-gradient-to-r from-stone-600 via-emerald-500 to-stone-600">
							<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" style="animation: slideRight 2s ease-in-out 0.5s infinite;"></div>
						</div>
						<span class="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Core API</span>
					</div>
					<div class="md:hidden">
						<ArrowDownIcon class="size-6 text-emerald-500" />
					</div>
					<div class="anim-float flex flex-col items-center gap-2" style="animation-delay: 1s;">
						<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20">
							<LandmarkIcon class="size-[26px] text-blue-400" />
						</div>
						<span class="text-[12px] font-bold uppercase tracking-wider text-stone-300">Midtrans</span>
						<span class="text-[11px] text-stone-500">Server Key tersembunyi</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="anim-fade absolute bottom-8 left-1/2 -translate-x-1/2" style="animation-delay: 1.2s;">
		<a href="#statistik" class="flex flex-col items-center gap-2 text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300">
			<span class="text-[11px] font-semibold uppercase tracking-wider">Scroll</span>
			<ArrowDownIcon class="size-5 animate-bounce" />
		</a>
	</div>
</section>

<section id="statistik" class="py-20">
	<div class="mx-auto max-w-5xl px-5 md:px-8">
		<div class="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
			<div class="reveal text-center">
				<div class="text-3xl font-extrabold tracking-tight md:text-4xl">99.9%</div>
				<div class="mt-1 text-[14px] font-medium text-stone-500 dark:text-stone-400">Uptime API</div>
			</div>
			<div class="reveal reveal-d1 text-center">
				<div class="text-3xl font-extrabold tracking-tight md:text-4xl">&lt;200ms</div>
				<div class="mt-1 text-[14px] font-medium text-stone-500 dark:text-stone-400">Latensi Proxy</div>
			</div>
			<div class="reveal reveal-d2 text-center">
				<div class="text-3xl font-extrabold tracking-tight md:text-4xl">100%</div>
				<div class="mt-1 text-[14px] font-medium text-stone-500 dark:text-stone-400">Audit Trail</div>
			</div>
			<div class="reveal reveal-d3 text-center">
				<div class="text-3xl font-extrabold tracking-tight md:text-4xl">10x</div>
				<div class="mt-1 text-[14px] font-medium text-stone-500 dark:text-stone-400">Webhook Retry</div>
			</div>
		</div>
	</div>
</section>

<section id="fitur" class="py-20 md:py-28">
	<div class="mx-auto max-w-6xl px-5 md:px-8">
		<div class="mx-auto mb-16 max-w-2xl text-center">
			<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
				<SparklesIcon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">Fitur Utama</span>
			</div>
			<h2 class="reveal mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Semua yang Toko Anda Butuhkan</h2>
			<p class="reveal reveal-d1 text-[16px] leading-relaxed text-stone-500 dark:text-stone-400">
				Dari menyembunyikan credential hingga relay webhook yang reliabel, semua ditangani platform.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
			{#each featureCards as feature, index}
				<div class={`reveal ${index > 0 ? `reveal-d${Math.min(index, 4)}` : ""} rounded-[24px] border border-stone-200/60 bg-white/70 p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:shadow-black/20`}>
					<div class={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${feature.tone}`}>
						<svelte:component this={feature.icon} class="size-[22px]" />
					</div>
					<h3 class="mb-2 text-[17px] font-bold">{feature.title}</h3>
					<p class="text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">{feature.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section id="cara-kerja" class="py-20 md:py-28">
	<div class="mx-auto max-w-5xl px-5 md:px-8">
		<div class="mx-auto mb-16 max-w-2xl text-center">
			<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3.5 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
				<RouteIcon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">Cara Kerja</span>
			</div>
			<h2 class="reveal mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Dari Request Toko ke Midtrans</h2>
			<p class="reveal reveal-d1 text-[16px] leading-relaxed text-stone-500 dark:text-stone-400">
				Satu request pembayaran melewati enam langkah yang teraudit dari awal sampai akhir.
			</p>
		</div>

		<div class="space-y-0">
			{#each workSteps as step, index}
				<div class={`reveal ${index > 0 ? `reveal-d${Math.min(index, 4)}` : ""} flex gap-5 md:gap-8`}>
					<div class="flex shrink-0 flex-col items-center">
						<div class={`flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-bold ${index === workSteps.length - 1 ? "bg-emerald-600 text-white" : "bg-stone-900 text-white dark:bg-white dark:text-stone-900"}`}>
							{index + 1}
						</div>
						{#if index < workSteps.length - 1}
							<div class="my-2 w-0.5 flex-1 bg-stone-200 dark:bg-white/10"></div>
						{/if}
					</div>
					<div class={index === workSteps.length - 1 ? "pb-4" : "pb-12"}>
						<h3 class="mb-1.5 text-[17px] font-bold">{step.title}</h3>
						<p class="text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">{step.body}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<section id="developer" class="relative py-20 md:py-28">
	<div class="absolute inset-0 bg-stone-900/[0.03] dark:bg-white/[0.02]"></div>
	<div class="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
		<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<div>
				<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-stone-200 px-3.5 py-1 text-stone-700 dark:bg-white/10 dark:text-stone-300">
					<TerminalIcon class="size-[14px]" />
					<span class="text-[12px] font-bold uppercase tracking-wider">Developer First</span>
				</div>
				<h2 class="reveal mb-5 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">API yang Mudah, Response yang Bersih</h2>
				<p class="reveal reveal-d1 mb-8 text-[16px] leading-relaxed text-stone-500 dark:text-stone-400">
					Kirim payload sederhana, terima response yang jelas, dan biarkan PayGate menangani mapping ke Midtrans di belakang layar.
				</p>

				<div class="reveal reveal-d2 space-y-4">
					{#each [
						"Payload custom sederhana",
						"Idempotency built-in",
						"Error response terstruktur",
						"Webhook guide dan status mapping jelas"
					] as benefit}
						<div class="flex items-start gap-3">
							<div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
								<CheckIcon class="size-[14px] text-emerald-600 dark:text-emerald-400" />
							</div>
							<div class="text-[15px] font-semibold">{benefit}</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="reveal reveal-d2 space-y-4">
				<div class="overflow-hidden rounded-[24px] border border-white/10 bg-[#0c0a09] text-stone-100 shadow-2xl shadow-black/20">
					<div class="flex items-center justify-between border-b border-white/10 px-5 py-3">
						<div class="flex items-center gap-2">
							<span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">POST</span>
							<span class="font-mono text-[13px] text-stone-400">/v1/transactions/charge</span>
						</div>
					</div>
					<pre class="code-surface">{developerChargeRequest}</pre>
				</div>

				<div class="overflow-hidden rounded-[24px] border border-white/10 bg-[#0c0a09] text-stone-100 shadow-2xl shadow-black/20">
					<div class="flex items-center justify-between border-b border-white/10 px-5 py-3">
						<div class="flex items-center gap-2">
							<span class="rounded bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-blue-400">200 OK</span>
							<span class="text-[13px] text-stone-400">Response</span>
						</div>
					</div>
					<pre class="code-surface">{developerChargeResponse}</pre>
				</div>
			</div>
		</div>
	</div>
</section>

<section id="keamanan" class="py-20 md:py-28">
	<div class="mx-auto max-w-6xl px-5 md:px-8">
		<div class="mx-auto mb-16 max-w-2xl text-center">
			<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-red-100 px-3.5 py-1 text-red-700 dark:bg-red-900/20 dark:text-red-400">
				<LockIcon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">Keamanan</span>
			</div>
			<h2 class="reveal mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Dibangun untuk Keamanan Multi-Tenant</h2>
			<p class="reveal reveal-d1 text-[16px] leading-relaxed text-stone-500 dark:text-stone-400">
				Setiap lapisan dirancang agar data antar toko tidak pernah bocor.
			</p>
		</div>

		<div class="grid grid-cols-1 gap-5 md:grid-cols-2">
			{#each securityCards as item, index}
				<div class={`reveal ${index > 0 ? `reveal-d${Math.min(index, 4)}` : ""} rounded-[24px] border border-stone-200/60 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-white/[0.04]`}>
					<div class="mb-3 flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-white/10 dark:text-stone-200">
							<svelte:component this={item.icon} class="size-5" />
						</div>
						<h3 class="text-[16px] font-bold">{item.title}</h3>
					</div>
					<p class="text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">{item.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="relative py-20 md:py-28">
	<div class="absolute inset-0 bg-stone-900/[0.03] dark:bg-white/[0.02]"></div>
	<div class="relative z-10 mx-auto max-w-5xl px-5 md:px-8">
		<div class="mx-auto mb-16 max-w-2xl text-center">
			<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-stone-200 px-3.5 py-1 text-stone-700 dark:bg-white/10 dark:text-stone-300">
				<Layers3Icon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">Tech Stack</span>
			</div>
			<h2 class="reveal mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Dibangun dengan Stack yang Tepat</h2>
			<p class="reveal reveal-d1 text-[16px] leading-relaxed text-stone-500 dark:text-stone-400">
				Setiap komponen dipilih untuk alasan operasional yang jelas, bukan sekadar tren.
			</p>
		</div>

		<div class="reveal reveal-d1 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
			{#each techStacks as stack}
				<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-4 text-center transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:shadow-black/15">
					<div class="mb-2 text-2xl">{stack.emoji}</div>
					<div class="text-[14px] font-bold">{stack.title}</div>
					<div class="text-[12px] text-stone-500 dark:text-stone-400">{stack.body}</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="py-20 md:py-28">
	<div class="mx-auto max-w-3xl px-5 text-center md:px-8">
		<div class="reveal relative overflow-hidden rounded-[32px] bg-stone-900 p-10 dark:bg-white md:p-14">
			<div class="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-500/20 blur-[80px]"></div>
			<div class="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-blue-500/10 blur-[60px]"></div>

			<div class="relative z-10">
				<h2 class="mb-4 text-3xl font-extrabold tracking-[-0.03em] text-white dark:text-stone-900 md:text-4xl">
					Siap Mengelola Pembayaran dengan Lebih Aman?
				</h2>
				<p class="mx-auto mb-8 max-w-lg text-[16px] leading-relaxed text-stone-300 dark:text-stone-600">
					Daftar gratis, buat store pertama, generate token, dan mulai kirim transaksi tanpa membuka credential Midtrans ke merchant Anda.
				</p>
				<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<button
						type="button"
						class="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-[16px] font-bold text-stone-900 transition-all duration-300 hover:bg-stone-100 sm:w-auto dark:bg-stone-900 dark:text-white dark:hover:bg-stone-800"
						on:click={() => goto("/register")}
					>
						Daftar Sekarang
						<ArrowRightIcon class="size-[18px]" />
					</button>
					<a href="#developer" class="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-8 py-4 text-[16px] font-bold text-white transition-all duration-300 hover:bg-white/10 sm:w-auto dark:border-stone-900/20 dark:text-stone-900 dark:hover:bg-stone-900/10">
						<BookOpenIcon class="size-[18px]" />
						Baca Docs
					</a>
				</div>
			</div>
		</div>
	</div>
</section>

<MarketingFooter />
