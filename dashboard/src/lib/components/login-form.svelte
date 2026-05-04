<script lang="ts">
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import InfoIcon from "@lucide/svelte/icons/info";
	import LockIcon from "@lucide/svelte/icons/lock";
	import MailIcon from "@lucide/svelte/icons/mail";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import { toast } from "svelte-sonner";

	import { runtimeConnection } from "$lib/api/runtime";
	import type { APIError } from "$lib/api/types";
	import {
		consumePendingRedirect,
		login,
		session,
		type SessionPersistence,
	} from "$lib/auth/session";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Input } from "$lib/components/ui/input";
	import { goto, route } from "$lib/spa";

	let email = "";
	let password = "";
	let remember = true;
	let showPassword = false;
	let isSubmitting = false;
	let emailError = "";
	let passwordError = "";
	let banner = "";

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		emailError = "";
		passwordError = "";
		banner = "";

		if (!email.trim()) {
			emailError = "Email wajib diisi.";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			emailError = "Format email tidak valid.";
		}

		if (!password.trim()) {
			passwordError = "Password wajib diisi.";
		}

		if (emailError || passwordError) {
			return;
		}

		isSubmitting = true;
		try {
			const persistence: SessionPersistence = remember ? "local" : "session";
			const mfa = await login({ email, password }, { persistence });

			toast.success(
				mfa.can_access_dashboard
					? "Login berhasil. Dashboard siap dibuka."
					: "Login berhasil. Lanjutkan verifikasi MFA untuk membuka dashboard.",
			);
			goto(mfa.can_access_dashboard ? consumePendingRedirect() : "/verify");
		} catch (error) {
			const apiError = error as APIError;
			banner = apiError.message;
			toast.error("Login gagal. Periksa email, password, atau status MFA akun ini.");
		} finally {
			isSubmitting = false;
		}
	}

</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header class="space-y-2">
		<Card.Title class="text-2xl font-bold tracking-tight">Masuk ke PayGate</Card.Title>
		<Card.Description class="text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
			Kelola toko, token, transaksi, dan webhook dari satu dashboard yang aman.
		</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-5">
		{#if banner}
			<div class="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
				<TriangleAlertIcon class="mt-0.5 size-4 shrink-0" />
				<div>{banner}</div>
			</div>
		{/if}

		<form class="space-y-5" on:submit={handleSubmit}>
			<div class="space-y-1.5">
				<label for="login-email" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Email</label>
				<div class="relative">
					<MailIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="login-email"
						bind:value={email}
						type="email"
						autocomplete="email"
						placeholder="owner@paygate.id"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 dark:border-white/10 dark:bg-white/5"
					/>
				</div>
				{#if emailError}
					<p class="text-[13px] font-medium text-red-500">{emailError}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<div class="flex items-center justify-between">
					<label for="login-password" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Password</label>
					<div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right">
						<a
							href="/forgot-password"
							use:route
							class="text-[13px] font-semibold text-stone-700 underline-offset-2 transition-colors hover:text-stone-900 hover:underline dark:text-stone-300 dark:hover:text-stone-100"
						>
							Lupa password?
						</a>
						<a
							href="/contact"
							use:route
							class="text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
						>
							Butuh bantuan akses?
						</a>
					</div>
				</div>
				<div class="relative">
					<LockIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="login-password"
						bind:value={password}
						type={showPassword ? "text" : "password"}
						autocomplete="current-password"
						placeholder="Masukkan password"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 pr-11 dark:border-white/10 dark:bg-white/5"
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-700 dark:hover:bg-white/10 dark:hover:text-stone-200"
						on:click={() => (showPassword = !showPassword)}
					>
						{#if showPassword}
							<EyeOffIcon class="size-4" />
						{:else}
							<EyeIcon class="size-4" />
						{/if}
					</button>
				</div>
				{#if passwordError}
					<p class="text-[13px] font-medium text-red-500">{passwordError}</p>
				{/if}
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200/70 bg-white/80 px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
					<Checkbox bind:checked={remember} class="mt-0.5" />
					<span class="space-y-0.5">
						<span class="block text-[13px] font-semibold text-stone-700 dark:text-stone-200">
							Ingat saya di perangkat ini
						</span>
						<span class="block text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
							Matikan opsi ini jika Anda login dari perangkat bersama atau komputer publik.
						</span>
					</span>
				</label>
				<a href="/verify" use:route class="text-[13px] font-semibold text-stone-600 underline-offset-2 transition-colors hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-100">
					Verifikasi MFA
				</a>
			</div>

			<Button type="submit" class="h-12 w-full rounded-2xl text-[15px] font-bold" disabled={isSubmitting}>
				{#if isSubmitting}
					<span class="inline-flex items-center gap-2">
						<span class="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
						Memproses...
					</span>
				{:else}
					<span class="inline-flex items-center gap-2">
						Masuk
						<ArrowRightIcon class="size-4" />
					</span>
				{/if}
			</Button>
		</form>

		<div class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/30 dark:text-blue-300">
			<div class="flex gap-2">
				<InfoIcon class="mt-0.5 size-4 shrink-0" />
				<div>
					<div class="font-semibold">Info koneksi & sesi</div>
					<div>
						Frontend ini memakai <span class="font-mono">{runtimeConnection.apiHost}</span> sebagai backend aktif.
					</div>
					<div>Access token akan di-refresh otomatis saat masih ada refresh token aktif.</div>
					<div>Store API token tetap wajib dipakai server-to-server, bukan dari browser publik.</div>
					{#if $session.user}
						<div class="mt-2 border-t border-blue-200/70 pt-2 dark:border-blue-800/30">
							Sesi saat ini: <span class="font-mono">{$session.user.email}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</Card.Content>

	<Card.Footer class="justify-center">
		<p class="text-center text-[14px] text-stone-500 dark:text-stone-400">
			Belum punya akun?
			<a href="/register" use:route class="font-semibold text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">Daftar gratis</a>
		</p>
	</Card.Footer>
</Card.Root>
