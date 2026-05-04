<script lang="ts">
	import MailSearchIcon from "@lucide/svelte/icons/mail-search";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import TimerResetIcon from "@lucide/svelte/icons/timer-reset";

	import ForgotPasswordForm from "$lib/components/forgot-password-form.svelte";
	import ThemeToggle from "$lib/components/paygate/theme-toggle.svelte";
	import { route as routeAction } from "$lib/spa";

	export let route: unknown = undefined;
	$: route;
</script>

<svelte:head>
	<title>Lupa Password — PayGate</title>
</svelte:head>

<div class="flex min-h-screen">
	<div class="grid-pattern relative hidden overflow-hidden bg-stone-900 lg:flex lg:w-[52%]">
		<div class="anim-pulse-glow pointer-events-none absolute left-[8%] top-24 h-[340px] w-[340px] rounded-full bg-emerald-500/15 blur-[120px]"></div>
		<div class="anim-pulse-glow pointer-events-none absolute bottom-16 right-[8%] h-[260px] w-[260px] rounded-full bg-blue-500/10 blur-[100px]" style="animation-delay: 2s;"></div>

		<div class="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
			<a href="/" use:routeAction class="anim-fade-up flex items-center gap-2.5 text-white">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-900">
					<ShieldCheckIcon class="size-5" />
				</div>
				<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
			</a>

			<div class="anim-fade-up max-w-lg space-y-6" style="animation-delay: 180ms;">
				<div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-stone-300">
					<MailSearchIcon class="size-4" />
					Account Recovery
				</div>
				<div class="space-y-3">
					<h1 class="text-4xl font-bold tracking-tight text-white">Pulihkan akses operator tanpa mengorbankan keamanan sesi.</h1>
					<p class="max-w-xl text-[16px] leading-relaxed text-stone-300">
						Reset password dipisahkan dari login biasa, memakai token sekali pakai, dan otomatis menutup sesi lama agar operator yang kehilangan akses tidak meninggalkan sesi aktif berisiko.
					</p>
				</div>
				<div class="grid gap-4">
					<div class="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div class="text-sm font-semibold text-white">Token hanya sekali pakai</div>
						<p class="mt-1 text-[13px] leading-relaxed text-stone-400">
							Setelah password berhasil diganti, token reset langsung hangus dan tidak bisa dipakai ulang.
						</p>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/6 p-4">
						<div class="flex items-start gap-3">
							<TimerResetIcon class="mt-0.5 size-4 text-emerald-400" />
							<div>
								<div class="text-sm font-semibold text-white">Semua sesi lama di-revoke</div>
								<p class="mt-1 text-[13px] leading-relaxed text-stone-400">
									Reset sukses akan memaksa login ulang agar dashboard hanya bisa diakses dengan credential terbaru.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="anim-fade-up rounded-2xl border border-white/10 bg-white/6 p-4 text-[13px] leading-relaxed text-stone-300" style="animation-delay: 300ms;">
				Jika mailbox operator belum bisa diakses, arahkan user ke halaman kontak agar tim internal bisa menangani verifikasi identitas dan rotasi akses secara manual.
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
			<ForgotPasswordForm />
		</div>
	</div>
</div>
