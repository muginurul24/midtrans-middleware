<script lang="ts">
	import LandmarkIcon from "@lucide/svelte/icons/landmark";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import StoreIcon from "@lucide/svelte/icons/store";

	import LoginForm from "$lib/components/login-form.svelte";
	import ThemeToggle from "$lib/components/paygate/theme-toggle.svelte";
	import { route as routeAction } from "$lib/spa";

	export let route: unknown = undefined;
	$: route;
</script>

<svelte:head>
	<title>Masuk — PayGate</title>
</svelte:head>

<div class="flex min-h-screen">
	<div class="grid-pattern relative hidden overflow-hidden bg-stone-900 lg:flex lg:w-[52%]">
		<div class="anim-pulse-glow pointer-events-none absolute left-[10%] top-20 h-[400px] w-[400px] rounded-full bg-emerald-500/15 blur-[120px]"></div>
		<div class="anim-pulse-glow pointer-events-none absolute bottom-20 right-[5%] h-[300px] w-[300px] rounded-full bg-teal-500/10 blur-[100px]" style="animation-delay: 2s;"></div>

		<div class="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
			<a href="/" use:routeAction class="anim-fade-up flex items-center gap-2.5 text-white">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-900">
					<ShieldCheckIcon class="size-5" />
				</div>
				<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
			</a>

			<div class="flex flex-1 items-center justify-center py-10">
				<div class="anim-fade-up w-full max-w-md" style="animation-delay: 200ms;">
					<div class="glass-dark-card rounded-[28px] border border-white/[0.1] p-6">
						<div class="mb-5 flex items-center gap-2">
							<div class="h-2.5 w-2.5 rounded-full bg-emerald-400"></div>
							<span class="text-[12px] font-semibold uppercase tracking-wider text-stone-400">System Architecture</span>
						</div>
						<div class="space-y-4">
							{#each ["Toko A", "Toko B", "Toko C"] as store, index}
								<div class="flex items-center justify-between">
									<div class="anim-float flex min-w-[100px] flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3" style={`animation-delay: ${index}s;`}>
										<StoreIcon class="size-[22px] text-stone-300" />
										<span class="text-[11px] font-semibold text-stone-400">{store}</span>
									</div>
									<div class="relative mx-3 h-[2px] flex-1 overflow-hidden bg-gradient-to-r from-stone-600 via-emerald-500 to-stone-600">
										<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={`animation: slideRight 2.5s ease-in-out ${index * 0.4}s infinite;`}></div>
									</div>
									{#if index === 0}
										<div class="anim-float-slow flex min-w-[110px] flex-col items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-3">
											<ShieldCheckIcon class="size-6 text-emerald-400" />
											<span class="text-[11px] font-bold text-emerald-400">PayGate</span>
										</div>
										<div class="relative mx-3 h-[2px] flex-1 overflow-hidden bg-gradient-to-r from-stone-600 via-emerald-500 to-stone-600">
											<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style="animation: slideRight 2.5s ease-in-out 0.4s infinite;"></div>
										</div>
										<div class="anim-float flex min-w-[100px] flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.06] px-4 py-3">
											<LandmarkIcon class="size-[22px] text-blue-400" />
											<span class="text-[11px] font-semibold text-stone-400">Midtrans</span>
										</div>
									{:else}
										<div class="mx-[68px] flex items-center justify-center">
											<div class="flex h-3 w-3 items-center justify-center rounded-full border-2 border-emerald-500/50">
												<div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						<div class="mt-5 flex items-center gap-3 border-t border-white/[0.08] pt-4">
							<div class="flex -space-x-2">
								<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-stone-900 bg-emerald-500/30 text-[9px] font-bold text-emerald-300">A</div>
								<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-stone-900 bg-blue-500/30 text-[9px] font-bold text-blue-300">B</div>
								<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-stone-900 bg-amber-500/30 text-[9px] font-bold text-amber-300">C</div>
							</div>
							<span class="text-[12px] text-stone-500">3 toko aktif · 1 akun Midtrans</span>
						</div>
					</div>
				</div>
			</div>

			<div class="anim-fade-up" style="animation-delay: 400ms;">
				<div class="rounded-xl border border-white/[0.08] bg-white/[0.06] p-4">
					<p class="text-[14px] italic leading-relaxed text-stone-300">
						"PayGate menghilangkan beban menjaga credential Midtrans di banyak codebase. Sekarang merchant hanya perlu token store yang rapi."
					</p>
					<div class="mt-3 flex items-center gap-2.5">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-[11px] font-bold text-white">R</div>
						<div>
							<div class="text-[13px] font-semibold text-stone-200">Rizki Pratama</div>
							<div class="text-[11px] text-stone-500">CTO, TokoBaju.id</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="relative flex flex-1 items-center justify-center p-5 md:p-8">
		<a href="/" use:routeAction class="absolute left-5 top-5 flex items-center gap-2.5 lg:hidden">
			<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-900">
				<ShieldCheckIcon class="size-5" />
			</div>
			<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
		</a>
		<ThemeToggle className="absolute right-5 top-5" />

		<div class="my-10 w-full max-w-[420px] lg:my-0">
			<LoginForm />
		</div>
	</div>
</div>
