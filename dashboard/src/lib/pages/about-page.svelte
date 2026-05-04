<script lang="ts">
	import CheckIcon from "@lucide/svelte/icons/check";
	import CompassIcon from "@lucide/svelte/icons/compass";
	import HeartHandshakeIcon from "@lucide/svelte/icons/heart-handshake";
	import Layers3Icon from "@lucide/svelte/icons/layers-3";
	import MapIcon from "@lucide/svelte/icons/map";
	import RocketIcon from "@lucide/svelte/icons/rocket";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import TargetIcon from "@lucide/svelte/icons/target";
	import { onMount } from "svelte";

	import MarketingFooter from "$lib/components/paygate/marketing-footer.svelte";
	import MarketingNavbar from "$lib/components/paygate/marketing-navbar.svelte";
	import { setupRevealObserver } from "$lib/paygate/reveal";

	export let route: unknown = undefined;
	$: route;

	const principles = [
		{
			icon: ShieldCheckIcon,
			title: "Security by default",
			body: "Kami ingin merchant kecil tetap punya standar keamanan yang biasanya hanya dimiliki platform pembayaran yang jauh lebih besar.",
		},
		{
			icon: Layers3Icon,
			title: "Operational clarity",
			body: "Audit log, delivery history, status mapping, dan route docs harus cukup jelas untuk dipakai debugging jam 2 pagi tanpa menebak-nebak.",
		},
		{
			icon: HeartHandshakeIcon,
			title: "Merchant empathy",
			body: "Copywriting, flow, dan detail dashboard ditulis agar mudah dipahami tim ops maupun developer merchant.",
		},
	];

	const roadmap = [
		{
			title: "Fondasi Midtrans Multi-Store",
			status: "Aktif",
			tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
			body: "Charge transaction, webhook inbound, relay delivery, audit log, auth dashboard, token, dan store management.",
		},
		{
			title: "Checkout Tanpa Backend Merchant",
			status: "Prioritas Tinggi",
			tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
			body: "Flow untuk merchant yang belum punya backend sendiri, termasuk public payment session dan link yang bisa dibagikan.",
		},
		{
			title: "Gateway Tambahan",
			status: "Evaluasi",
			tone: "bg-stone-200 text-stone-700 dark:bg-white/10 dark:text-stone-300",
			body: "Adapter tambahan untuk gateway lain seperti Xendit atau Tripay tanpa mengubah kontrak utama merchant.",
		},
		{
			title: "Operasional Lanjutan",
			status: "Perencanaan",
			tone: "bg-stone-200 text-stone-700 dark:bg-white/10 dark:text-stone-300",
			body: "Refund, reconciliation, team roles, CSV export, alerting, dan observability yang lebih dalam.",
		},
	];

	onMount(() => setupRevealObserver());
</script>

<svelte:head>
	<title>Tentang — PayGate</title>
</svelte:head>

<MarketingNavbar mode="pages" activePage="about" />

<section class="grid-pattern relative overflow-hidden pt-[72px]">
	<div class="anim-pulse-glow pointer-events-none absolute left-[10%] top-16 h-[340px] w-[340px] rounded-full bg-emerald-400/10 blur-[120px] dark:bg-emerald-500/5"></div>
	<div class="mx-auto max-w-4xl px-5 py-24 text-center md:px-8 md:py-32">
		<div class="anim-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/70 px-4 py-1.5 dark:border-white/10 dark:bg-white/5">
			<CompassIcon class="size-[14px] text-emerald-500" />
			<span class="text-[13px] font-semibold text-stone-600 dark:text-stone-300">Tentang PayGate</span>
		</div>
		<h1 class="anim-fade-up mb-6 text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-5xl md:text-6xl" style="animation-delay: 100ms;">
			Membangun Middleware Pembayaran yang
			<span class="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
				Jelas dan Aman
			</span>
		</h1>
		<p class="anim-fade-up mx-auto max-w-2xl text-lg font-medium leading-relaxed text-stone-500 dark:text-stone-400 md:text-xl" style="animation-delay: 200ms;">
			PayGate dibuat untuk tim yang ingin mengelola banyak merchant lewat satu akun Midtrans, tanpa mengorbankan auditability, keamanan, dan kejelasan operasional.
		</p>
	</div>
</section>

<section class="py-20 md:py-28">
	<div class="mx-auto max-w-6xl px-5 md:px-8">
		<div class="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
			<div>
				<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3.5 py-1 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
					<TargetIcon class="size-[14px]" />
					<span class="text-[12px] font-bold uppercase tracking-wider">Misi</span>
				</div>
				<h2 class="reveal mb-5 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Satu lapisan aman di antara merchant dan gateway</h2>
				<div class="reveal reveal-d1 space-y-4 text-[16px] leading-relaxed text-stone-500 dark:text-stone-400">
					<p>
						Banyak merchant butuh integrasi pembayaran yang stabil, tetapi tidak semua tim nyaman menyebarkan server key Midtrans ke banyak codebase atau tenant.
					</p>
					<p>
						PayGate hadir sebagai lapisan orkestrasi: token store per merchant, audit trail yang rapi, retry webhook yang dapat ditelusuri, dan dashboard yang berbicara dengan bahasa operasional sehari-hari.
					</p>
					<p>
						Target kami sederhana: membuat pembayaran multi-tenant lebih aman, lebih mudah di-debug, dan lebih cepat dipelihara oleh tim kecil.
					</p>
				</div>
			</div>

			<div class="reveal reveal-d2 hero-dark-panel rounded-[28px] border border-white/10 p-8 text-white">
				<div class="mb-6 flex items-center gap-2">
					<RocketIcon class="size-5 text-emerald-300" />
					<span class="text-[12px] font-bold uppercase tracking-[0.18em] text-stone-300">Kenapa Kami Bangun Ini</span>
				</div>
				<div class="space-y-4 text-[15px] leading-relaxed text-stone-300">
					<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
						<div class="mb-1 font-semibold text-white">Credential tersebar terlalu luas</div>
						<div>Merchant sering harus menyimpan server key di banyak aplikasi atau tim berbeda.</div>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
						<div class="mb-1 font-semibold text-white">Debugging webhook memakan waktu</div>
						<div>Tanpa histori delivery yang lengkap, kegagalan callback sering sulit direproduksi.</div>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
						<div class="mb-1 font-semibold text-white">Multi-store butuh isolasi yang nyata</div>
						<div>Store A tidak boleh bisa menyentuh data, token, atau secret milik store B.</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="relative py-20 md:py-28">
	<div class="absolute inset-0 bg-stone-900/[0.03] dark:bg-white/[0.02]"></div>
	<div class="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
		<div class="mx-auto mb-16 max-w-2xl text-center">
			<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3.5 py-1 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
				<CheckIcon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">Prinsip Produk</span>
			</div>
			<h2 class="reveal mb-4 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Pragmatis, tidak bertele-tele, dan mudah diaudit</h2>
		</div>

		<div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
			{#each principles as item, index}
				<div class={`reveal ${index > 0 ? `reveal-d${index}` : ""} rounded-[24px] border border-stone-200/60 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-white/[0.04]`}>
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-white/10 dark:text-stone-200">
						<svelte:component this={item.icon} class="size-[20px]" />
					</div>
					<h3 class="mb-2 text-[17px] font-bold">{item.title}</h3>
					<p class="text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">{item.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="py-20 md:py-28">
	<div class="mx-auto max-w-3xl px-5 md:px-8">
		<div class="mb-16 text-center">
			<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
				<MapIcon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">Arah Produk</span>
			</div>
			<h2 class="reveal text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Arah Pengembangan PayGate</h2>
		</div>

		<div class="space-y-0">
			{#each roadmap as item, index}
				<div class={`reveal ${index > 0 ? `reveal-d${Math.min(index, 4)}` : ""} flex gap-5 md:gap-8`}>
					<div class="flex shrink-0 flex-col items-center">
						<div class={`flex h-11 w-11 items-center justify-center rounded-full text-[14px] font-bold ${index === 0 ? "bg-emerald-600 text-white" : index === 1 ? "bg-amber-500 text-white" : "bg-stone-300 text-stone-700 dark:bg-white/15 dark:text-stone-300"}`}>
							{#if index === 0}
								<CheckIcon class="size-[18px]" />
							{:else}
								{index + 1}
							{/if}
						</div>
						{#if index < roadmap.length - 1}
							<div class={`my-2 w-0.5 flex-1 ${index === 0 ? "bg-emerald-300 dark:bg-emerald-700" : "bg-stone-200 dark:bg-white/10"}`}></div>
						{/if}
					</div>
					<div class={index === roadmap.length - 1 ? "pb-4" : "pb-12"}>
						<div class="mb-1 flex items-center gap-2">
							<h3 class="text-[17px] font-bold">{item.title}</h3>
							<span class={`rounded-full px-2 py-0.5 text-[11px] font-bold ${item.tone}`}>{item.status}</span>
						</div>
						<p class="text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">{item.body}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<MarketingFooter />
