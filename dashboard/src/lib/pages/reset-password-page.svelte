<script lang="ts">
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import ShieldEllipsisIcon from "@lucide/svelte/icons/shield-ellipsis";

	import ResetPasswordForm from "$lib/components/reset-password-form.svelte";
	import ThemeToggle from "$lib/components/paygate/theme-toggle.svelte";
	import { route as routeAction } from "$lib/spa";

	export let route: unknown = undefined;
	$: route;
</script>

<svelte:head>
	<title>Reset Password — PayGate</title>
</svelte:head>

<div class="flex min-h-screen">
	<div class="grid-pattern relative hidden overflow-hidden bg-stone-900 lg:flex lg:w-[52%]">
		<div class="anim-pulse-glow pointer-events-none absolute left-[10%] top-20 h-[360px] w-[360px] rounded-full bg-amber-500/12 blur-[120px]"></div>
		<div class="anim-pulse-glow pointer-events-none absolute bottom-12 right-[10%] h-[280px] w-[280px] rounded-full bg-emerald-500/10 blur-[110px]" style="animation-delay: 2.2s;"></div>

		<div class="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
			<a href="/" use:routeAction class="anim-fade-up flex items-center gap-2.5 text-white">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-900">
					<ShieldCheckIcon class="size-5" />
				</div>
				<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
			</a>

			<div class="anim-fade-up max-w-lg space-y-6" style="animation-delay: 180ms;">
				<div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-stone-300">
					<KeyRoundIcon class="size-4" />
					Secure Password Reset
				</div>
				<div class="space-y-3">
					<h1 class="text-4xl font-bold tracking-tight text-white">Tutup akses lama, mulai sesi baru yang bersih.</h1>
					<p class="max-w-xl text-[16px] leading-relaxed text-stone-300">
						Reset password PayGate dirancang untuk operasi merchant: token reset dibatasi waktu, semua sesi aktif lama diputus, dan operator tetap harus login ulang sebelum masuk dashboard.
					</p>
				</div>
				<div class="grid gap-4">
					<div class="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div class="text-sm font-semibold text-white">Tidak membuka akses dashboard otomatis</div>
						<p class="mt-1 text-[13px] leading-relaxed text-stone-400">
							Setelah reset sukses, operator kembali ke login agar alur MFA dan audit sesi tetap konsisten.
						</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div class="flex items-start gap-3">
							<ShieldEllipsisIcon class="mt-0.5 size-4 text-amber-300" />
							<div>
								<div class="text-sm font-semibold text-white">Cocok untuk link email atau token paste manual</div>
								<p class="mt-1 text-[13px] leading-relaxed text-stone-400">
									Halaman ini tetap bisa dipakai walau token datang dari email, vault internal, atau preview development lokal.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="anim-fade-up rounded-2xl border border-white/10 bg-white/6 p-4 text-[13px] leading-relaxed text-stone-300" style="animation-delay: 300ms;">
				Jika operator tidak mengenali permintaan reset ini, token yang tidak dipakai akan kedaluwarsa otomatis dan tidak membuka akses apa pun tanpa password baru.
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
			<ResetPasswordForm />
		</div>
	</div>
</div>
