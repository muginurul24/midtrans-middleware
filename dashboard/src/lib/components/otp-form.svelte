<script lang="ts">
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import RefreshCcwIcon from "@lucide/svelte/icons/refresh-ccw";
	import { toast } from "svelte-sonner";

	import type { APIError, MFASetup } from "$lib/api/types";
	import {
		consumePendingRedirect,
		reloadSession,
		session,
		setupMfa,
		verifyMfa,
	} from "$lib/auth/session";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Field from "$lib/components/ui/field";
	import { Input } from "$lib/components/ui/input";
	import * as InputOTP from "$lib/components/ui/input-otp";
	import { goto, route } from "$lib/spa";

	let code = "";
	let recoveryCode = "";
	let useRecoveryCode = false;
	let setup: MFASetup | null = null;
	let recoveryCodes: string[] = [];
	let isSubmitting = false;
	let isPreparing = false;
	let error = "";
	let info = "";

	$: userEmail = $session.user?.email ?? "akun aktif";
	$: requiresSetup = $session.mfa?.setup_required ?? false;
	$: mfaEnabled = $session.mfa?.enabled ?? false;
	$: mfaVerified = $session.mfa?.verified ?? false;
	$: canAccessDashboard = $session.mfa?.can_access_dashboard ?? false;
	$: verificationValue = useRecoveryCode ? recoveryCode.trim() : code.trim();
	$: actionLabel = useRecoveryCode ? "Verifikasi recovery code" : "Verifikasi";
	$: setupButtonLabel = setup ? "Buat ulang secret" : "Siapkan authenticator";

	$: if ($session.user && requiresSetup && !setup && !isPreparing) {
		void prepareSetup();
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = "";
		info = "";

		if (!verificationValue) {
			error = useRecoveryCode
				? "Masukkan recovery code yang aktif."
				: "Masukkan 6 digit kode verifikasi.";
			return;
		}

		isSubmitting = true;
		try {
			const data = await verifyMfa(verificationValue);
			recoveryCodes = data.recovery_codes ?? [];
			setup = null;
			code = "";
			recoveryCode = "";
			useRecoveryCode = false;
			info = recoveryCodes.length
				? "MFA aktif. Simpan recovery code ini sekarang karena hanya ditampilkan sekali."
				: "Kode MFA valid. Sesi dashboard ini sudah terverifikasi.";
			toast.success("Verifikasi MFA berhasil.");

			if (canAccessDashboard || data.mfa.can_access_dashboard) {
				goto(consumePendingRedirect());
			} else {
				await reloadSession();
			}
		} catch (caught) {
			const apiError = caught as APIError;
			error = apiError.message;
			toast.error("Verifikasi MFA gagal.");
		} finally {
			isSubmitting = false;
		}
	}

	async function prepareSetup(rotate = false) {
		isPreparing = true;
		error = "";
		info = "";
		recoveryCodes = [];
		try {
			setup = await setupMfa(rotate);
			info = rotate
				? "Secret baru siap dipakai. Masukkan ke authenticator lalu verifikasi 6 digit kodenya."
				: "Secret MFA siap dipakai. Masukkan ke authenticator lalu verifikasi 6 digit kodenya.";
		} catch (caught) {
			const apiError = caught as APIError;
			error = apiError.message;
		} finally {
			isPreparing = false;
		}
	}

	async function refreshMfaState() {
		error = "";
		info = "";
		try {
			const mfa = await reloadSession();
			if (mfa.can_access_dashboard) {
				goto(consumePendingRedirect());
				return;
			}
			info = "Status MFA berhasil diperbarui untuk sesi ini.";
		} catch (caught) {
			const apiError = caught as APIError;
			error = apiError.message;
		}
	}

	async function copyText(value: string, label: string) {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`${label} berhasil disalin.`);
		} catch {
			toast.error(`Gagal menyalin ${label.toLowerCase()}.`);
		}
	}
</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header>
		<Card.Title class="text-2xl font-bold tracking-tight">Verifikasi MFA</Card.Title>
		<Card.Description class="text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
			Verifikasi sesi untuk <span class="font-semibold text-stone-800 dark:text-stone-200">{userEmail}</span> dengan kode authenticator atau recovery code.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<div class="mb-5 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[13px] text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-stone-300">
			<div class="font-semibold text-stone-900 dark:text-stone-100">
				{#if canAccessDashboard}
					Sesi ini sudah lolos kebijakan MFA.
				{:else if requiresSetup}
					Backend production mewajibkan setup MFA sebelum dashboard bisa dibuka.
				{:else if mfaEnabled && !mfaVerified}
					MFA aktif, tetapi sesi ini belum diverifikasi.
				{:else}
					MFA masih opsional di environment ini, tetapi Anda tetap bisa mengaktifkannya dari sini.
				{/if}
			</div>
			<div class="mt-1 leading-relaxed text-stone-500 dark:text-stone-400">
				{#if requiresSetup}
					Scan secret atau input manual ke aplikasi authenticator, lalu masukkan 6 digit kode yang muncul.
				{:else if mfaEnabled && !mfaVerified}
					Masukkan kode dari authenticator yang sudah aktif untuk membuka akses dashboard penuh.
				{:else}
					Halaman ini tetap berguna untuk menguji alur MFA sebelum environment production dipakai.
				{/if}
			</div>
		</div>

		{#if info}
			<div class="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-300">
				{info}
			</div>
		{/if}

		<form class="space-y-5" on:submit={handleSubmit}>
			{#if setup}
				<div class="space-y-3 rounded-2xl border border-stone-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
					<div>
						<div class="text-[13px] font-semibold text-stone-900 dark:text-stone-100">Secret authenticator</div>
						<p class="mt-1 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
							Gunakan secret ini di Google Authenticator, 1Password, atau aplikasi TOTP lain jika QR belum tersedia.
						</p>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<code class="rounded-xl bg-stone-100 px-3 py-2 font-mono text-[13px] text-stone-700 dark:bg-black/30 dark:text-stone-200">
							{setup.secret}
						</code>
						<Button type="button" variant="outline" class="rounded-xl" onclick={() => setup && copyText(setup.secret, "Secret MFA")}>
							<CopyIcon class="size-4" />
							Salin secret
						</Button>
					</div>
					<div class="rounded-xl border border-dashed border-stone-300 px-3 py-2 text-[12px] leading-relaxed text-stone-500 dark:border-white/10 dark:text-stone-400">
						Issuer: <span class="font-semibold text-stone-700 dark:text-stone-200">{setup.issuer}</span>
						<br />
						Akun authenticator: <span class="font-semibold text-stone-700 dark:text-stone-200">{setup.account_name}</span>
					</div>
				</div>
			{/if}

			<Field.Group>
				<Field.Field class="space-y-2">
					<Field.Label for="otp">{useRecoveryCode ? "Recovery code" : "Kode authenticator"}</Field.Label>
					{#if useRecoveryCode}
						<Input
							id="recovery-code"
							bind:value={recoveryCode}
							placeholder="Masukkan recovery code"
							class="h-12 rounded-2xl border-stone-200/70 bg-white/85 font-mono uppercase dark:border-white/10 dark:bg-white/5"
						/>
					{:else}
						<InputOTP.Root id="otp" bind:value={code} maxlength={6} required>
							{#snippet children({ cells })}
								<InputOTP.Group class="grid grid-cols-6 gap-2.5">
									{#each cells as cell (cell)}
										<InputOTP.Slot
											{cell}
											class="data-[slot=input-otp-slot]:h-12 data-[slot=input-otp-slot]:rounded-2xl data-[slot=input-otp-slot]:border data-[slot=input-otp-slot]:border-stone-200 data-[slot=input-otp-slot]:bg-white/85 data-[slot=input-otp-slot]:text-lg data-[slot=input-otp-slot]:font-bold dark:data-[slot=input-otp-slot]:border-white/10 dark:data-[slot=input-otp-slot]:bg-white/5"
										/>
									{/each}
								</InputOTP.Group>
							{/snippet}
						</InputOTP.Root>
					{/if}
					<Field.Description>
						{#if useRecoveryCode}
							Gunakan salah satu recovery code yang pernah diunduh saat MFA pertama kali diaktifkan.
						{:else}
							Masukkan 6 digit kode TOTP yang tampil di aplikasi authenticator Anda saat ini.
						{/if}
					</Field.Description>
					{#if error}
						<p class="text-[13px] font-medium text-red-500">{error}</p>
					{/if}
				</Field.Field>
			</Field.Group>

			<button
				type="button"
				class="text-[13px] font-semibold text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
				on:click={() => {
					error = "";
					useRecoveryCode = !useRecoveryCode;
					code = "";
					recoveryCode = "";
				}}
			>
				{useRecoveryCode ? "Gunakan kode authenticator 6 digit" : "Gunakan recovery code"}
			</button>

			<Button type="submit" class="h-12 w-full rounded-2xl text-[15px] font-bold" disabled={isSubmitting}>
				{#if isSubmitting}
					<span class="inline-flex items-center gap-2">
						<span class="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
						Memverifikasi...
					</span>
				{:else}
					<span class="inline-flex items-center gap-2">
						{actionLabel}
						<ArrowRightIcon class="size-4" />
					</span>
				{/if}
			</Button>
		</form>

		{#if recoveryCodes.length > 0}
			<div class="mt-5 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
				<div>
					<div class="text-sm font-semibold text-amber-800 dark:text-amber-300">Recovery code baru</div>
					<p class="mt-1 text-[13px] leading-relaxed text-amber-700/80 dark:text-amber-300/80">
						Simpan recovery code ini di password manager atau vault internal. Setelah halaman ditutup, kode ini tidak ditampilkan ulang.
					</p>
				</div>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each recoveryCodes as item}
						<button
							type="button"
							class="rounded-xl bg-white px-3 py-2 text-left font-mono text-[13px] font-semibold text-stone-700 shadow-sm transition-colors hover:bg-stone-50 dark:bg-black/30 dark:text-stone-100 dark:hover:bg-black/40"
							on:click={() => copyText(item, "Recovery code")}
						>
							{item.toUpperCase()}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</Card.Content>

	<Card.Footer class="flex-col gap-3">
		<button
			type="button"
			class="inline-flex items-center gap-2 text-[13px] font-semibold text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
			on:click={() => {
				if (setup || requiresSetup || !mfaEnabled) {
					void prepareSetup(Boolean(setup));
					return;
				}
				void refreshMfaState();
			}}
		>
			<RefreshCcwIcon class="size-4" />
			{#if setup || requiresSetup || !mfaEnabled}
				{#if isPreparing}
					Menyiapkan secret...
				{:else}
					{setupButtonLabel}
				{/if}
			{:else}
				Refresh status MFA
			{/if}
		</button>
		<a href="/login" use:route class="text-[13px] font-medium text-stone-400 underline-offset-2 hover:underline dark:text-stone-500">
			Kembali ke login
		</a>
	</Card.Footer>
</Card.Root>
