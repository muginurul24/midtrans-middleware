<script lang="ts">
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import RefreshCcwIcon from "@lucide/svelte/icons/refresh-ccw";
	import ScrollTextIcon from "@lucide/svelte/icons/scroll-text";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import StoreIcon from "@lucide/svelte/icons/store";

	import { consumePendingRedirect } from "$lib/auth/session";
	import SignupForm from "$lib/components/signup-form.svelte";
	import ThemeToggle from "$lib/components/paygate/theme-toggle.svelte";
	import { goto, route as routeAction } from "$lib/spa";

	export let route: unknown = undefined;
	$: route;
</script>

<svelte:head>
	<title>Daftar — PayGate</title>
</svelte:head>

<div class="flex min-h-screen">
	<div class="grid-pattern relative hidden overflow-hidden bg-stone-900 lg:flex lg:w-[52%]">
		<div class="anim-pulse-glow pointer-events-none absolute right-[10%] top-20 h-[400px] w-[400px] rounded-full bg-blue-500/15 blur-[120px]"></div>
		<div class="anim-pulse-glow pointer-events-none absolute bottom-20 left-[5%] h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" style="animation-delay: 2s;"></div>

		<div class="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
			<a href="/" use:routeAction class="anim-fade-up flex items-center gap-2.5 text-white">
				<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-stone-900">
					<ShieldCheckIcon class="size-5" />
				</div>
				<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
			</a>

			<div class="flex flex-1 items-center justify-center py-10">
				<div class="anim-fade-up w-full max-w-md space-y-4" style="animation-delay: 200ms;">
					<h2 class="text-2xl font-bold tracking-tight text-white">Mengapa PayGate?</h2>
					<div class="space-y-3">
						{#each [
							{ icon: EyeOffIcon, title: "Credential aman", body: "Server Key Midtrans tidak pernah terekspos ke merchant atau frontend." },
							{ icon: ScrollTextIcon, title: "Audit lengkap", body: "Setiap request dan response tercatat agar incident lebih cepat ditelusuri." },
							{ icon: RefreshCcwIcon, title: "Webhook reliabel", body: "Retry 20 detik x 10 kali plus resend manual saat perlu intervensi operator." },
							{ icon: StoreIcon, title: "Multi-toko", body: "Satu akun, banyak store, dan data setiap tenant tetap terisolasi." }
						] as item}
							<div class="flex items-start gap-3.5 rounded-xl border border-white/[0.08] bg-white/[0.06] p-4">
								<div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-stone-200">
									<svelte:component this={item.icon} class="size-[18px]" />
								</div>
								<div>
									<div class="mb-0.5 text-[14px] font-semibold text-stone-200">{item.title}</div>
									<div class="text-[13px] leading-relaxed text-stone-500">{item.body}</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="anim-fade-up" style="animation-delay: 400ms;">
				<div class="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.06] p-4">
					<div class="flex-1 text-center">
						<div class="font-mono text-xl font-bold text-white">99.9%</div>
						<div class="mt-0.5 text-[11px] text-stone-500">Uptime</div>
					</div>
					<div class="h-10 w-px bg-white/10"></div>
					<div class="flex-1 text-center">
						<div class="font-mono text-xl font-bold text-white">&lt;200ms</div>
						<div class="mt-0.5 text-[11px] text-stone-500">Latensi</div>
					</div>
					<div class="h-10 w-px bg-white/10"></div>
					<div class="flex-1 text-center">
						<div class="font-mono text-xl font-bold text-white">Gratis</div>
						<div class="mt-0.5 text-[11px] text-stone-500">MVP</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="relative flex flex-1 items-center justify-center overflow-y-auto p-5 md:p-8">
		<a href="/" use:routeAction class="absolute left-5 top-5 flex items-center gap-2.5 lg:hidden">
			<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-900">
				<ShieldCheckIcon class="size-5" />
			</div>
			<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
		</a>
		<ThemeToggle className="absolute right-5 top-5" />

		<div class="my-10 w-full max-w-[440px] lg:my-0">
			<SignupForm
				on:success={(event) =>
					goto(event.detail.mfa.can_access_dashboard ? consumePendingRedirect() : "/verify")}
			/>
		</div>
	</div>
</div>
