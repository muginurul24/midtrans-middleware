<script lang="ts">
	import type { Component } from "svelte";
	import Clock3Icon from "@lucide/svelte/icons/clock-3";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import MailIcon from "@lucide/svelte/icons/mail";
	import RefreshCcwIcon from "@lucide/svelte/icons/refresh-ccw";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import UserRoundIcon from "@lucide/svelte/icons/user-round";

	import type { APIError, MFAState, TokenPair, User } from "$lib/api/types";
	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import { Badge, type BadgeVariant } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Field from "$lib/components/ui/field";
	import { Input } from "$lib/components/ui/input";
	import * as Separator from "$lib/components/ui/separator";

	export let user: User | null = null;
	export let tokens: TokenPair | null = null;
	export let mfa: MFAState | null = null;
	export let persistence: "local" | "session" = "local";
	export let changingPassword = false;
	export let refreshingSession = false;
	export let onRefreshSession: () => Promise<void> | void = async () => {};
	export let onChangePassword: (input: {
		current_password: string;
		new_password: string;
	}) => Promise<void> | void = async () => {};
	export let onLogout: () => Promise<void> | void = async () => {};
	export let onOpenMfa: () => void = () => {};

	type SummaryItem = {
		label: string;
		value: string;
		helper: string;
		icon?: Component<any>;
		tone?: "default" | "warning";
	};

	let currentPassword = "";
	let nextPassword = "";
	let confirmPassword = "";
	let passwordError = "";
	let passwordSuccess = "";
	let mfaVariant: BadgeVariant = "outline";

	$: passwordMismatch = Boolean(confirmPassword) && nextPassword !== confirmPassword;
	$: shortRole = user?.role ? user.role.replaceAll("_", " ") : "dashboard operator";
	$: persistenceLabel =
		persistence === "session"
			? "Hanya sampai browser ini ditutup"
			: "Diingat di perangkat ini";
	$: persistenceSummary =
		persistence === "session"
			? "Gunakan mode ini di perangkat bersama agar sesi tidak tertinggal setelah browser ditutup."
			: "Mode ini cocok untuk workstation operator yang Anda kendalikan sendiri.";
	$: mfaLabel = !mfa
		? "Belum dimuat"
		: mfa.enabled && mfa.verified
			? "Aktif & terverifikasi"
			: mfa.enabled
				? "Aktif, perlu verifikasi sesi baru"
				: mfa.required
					? "Wajib diaktifkan"
					: "Opsional";
	$: mfaVariant = (!mfa
		? "outline"
		: mfa.enabled && mfa.verified
			? "default"
			: mfa.enabled || mfa.required
				? "secondary"
				: "outline") as BadgeVariant;
	$: accountSummary = [
		{
			label: "Terdaftar",
			value: formatDateTime(user?.created_at),
			helper: "Waktu akun operator pertama kali dibuat.",
		},
		{
			label: "Profil terakhir sinkron",
			value: formatDateTime(user?.updated_at),
			helper: "Gunakan refresh sesi jika backend baru berubah.",
		},
	] as SummaryItem[];
	$: sessionSummary = [
		{
			label: "Penyimpanan sesi",
			value: persistenceLabel,
			helper: persistenceSummary,
			icon: KeyRoundIcon,
		},
		{
			label: "Access token",
			value: formatRelativeWindow(tokens?.access_expires_at),
			helper: `Kedaluwarsa: ${formatDateTime(tokens?.access_expires_at)}`,
			icon: Clock3Icon,
		},
		{
			label: "Refresh token",
			value: formatRelativeWindow(tokens?.refresh_expires_at),
			helper: `Kedaluwarsa: ${formatDateTime(tokens?.refresh_expires_at)}`,
			icon: RefreshCcwIcon,
		},
	] as SummaryItem[];
	$: mfaSummary = [
		{
			label: "Status akun",
			value: mfaLabel,
			helper: "Status ini menentukan apakah sesi saat ini dianggap aman untuk mengakses dashboard.",
			icon: UserRoundIcon,
		},
		{
			label: "Setup diwajibkan",
			value: mfa?.setup_required ? "Ya, sesi baru wajib setup" : "Tidak wajib saat ini",
			helper: "Aktifkan MFA lebih awal agar onboarding device baru tidak mengganggu operasional.",
			tone: mfa?.setup_required ? "warning" : "default",
		},
		{
			label: "Akses dashboard",
			value: mfa?.can_access_dashboard ? "Sesi aktif boleh masuk dashboard" : "Perlu verifikasi ulang",
			helper: "Jika status ini berubah, minta operator memverifikasi ulang sebelum lanjut mengelola store.",
			tone: mfa?.can_access_dashboard ? "default" : "warning",
		},
	] as SummaryItem[];
	$: passwordRules = [
		{ label: "Minimal 8 karakter", passed: nextPassword.length >= 8 },
		{
			label: "Berbeda dari current password",
			passed: Boolean(nextPassword) && nextPassword !== currentPassword,
		},
		{ label: "Konfirmasi password cocok", passed: Boolean(confirmPassword) && !passwordMismatch },
	];
	$: canSubmitPassword =
		Boolean(currentPassword && nextPassword && confirmPassword) &&
		nextPassword.length >= 8 &&
		nextPassword !== currentPassword &&
		!passwordMismatch;

	function formatDateTime(value?: string | null) {
		if (!value) return "Belum tersedia";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "Belum tersedia";
		return new Intl.DateTimeFormat("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "Asia/Jakarta",
		}).format(date);
	}

	function formatRelativeWindow(value?: string | null) {
		if (!value) return "Belum tersedia";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "Belum tersedia";

		const diff = date.getTime() - Date.now();
		const abs = Math.abs(diff);
		const minutes = Math.round(abs / 60000);

		if (minutes < 1) return diff >= 0 ? "Kurang dari 1 menit lagi" : "Baru saja lewat";
		if (minutes < 60) return diff >= 0 ? `${minutes} menit lagi` : `${minutes} menit yang lalu`;

		const hours = Math.round(minutes / 60);
		if (hours < 24) return diff >= 0 ? `${hours} jam lagi` : `${hours} jam yang lalu`;

		const days = Math.round(hours / 24);
		return diff >= 0 ? `${days} hari lagi` : `${days} hari yang lalu`;
	}

	function resetPasswordFeedback() {
		passwordError = "";
		passwordSuccess = "";
	}

	function cardToneClass(tone: SummaryItem["tone"]) {
		if (tone === "warning") {
			return "border-amber-200/70 bg-amber-50/80 dark:border-amber-900/30 dark:bg-amber-950/20";
		}

		return "border-stone-200/60 bg-white/80 dark:border-white/10 dark:bg-black/20";
	}

	async function handlePasswordSubmit(event: SubmitEvent) {
		event.preventDefault();
		passwordError = "";
		passwordSuccess = "";

		if (!currentPassword || !nextPassword || !confirmPassword) {
			passwordError = "Lengkapi current password, password baru, dan konfirmasi password.";
			return;
		}

		if (nextPassword.length < 8) {
			passwordError = "Password baru minimal 8 karakter agar lolos validasi backend.";
			return;
		}

		if (nextPassword === currentPassword) {
			passwordError = "Password baru harus berbeda dari current password.";
			return;
		}

		if (passwordMismatch) {
			passwordError = "Konfirmasi password belum sama dengan password baru.";
			return;
		}

		try {
			await onChangePassword({
				current_password: currentPassword,
				new_password: nextPassword,
			});
			currentPassword = "";
			nextPassword = "";
			confirmPassword = "";
			passwordSuccess =
				"Password berhasil diperbarui. Login berikutnya harus memakai password baru ini.";
		} catch (caught) {
			const apiError = caught as APIError | undefined;
			passwordError = apiError?.message ?? "Gagal mengganti password.";
		}
	}
</script>

<div class="grid grid-cols-1 gap-4 xl:grid-cols-5">
	<div class="space-y-4 xl:col-span-2">
		<Card.Root class="panel-card border-none shadow-none">
			<Card.Header class="gap-4">
				<div class="flex items-start gap-4">
					<Avatar.Root size="lg" class="size-14 rounded-2xl">
						<Avatar.Fallback
							class="rounded-2xl bg-stone-900 text-lg font-bold text-white dark:bg-white dark:text-stone-900"
						>
							{user?.name?.slice(0, 1).toUpperCase() ?? "U"}
						</Avatar.Fallback>
					</Avatar.Root>

					<div class="min-w-0 flex-1 space-y-2">
						<div class="flex flex-wrap items-center gap-2">
							<Card.Title class="text-[20px] font-bold tracking-tight">
								{user?.name ?? "Operator Dashboard"}
							</Card.Title>
							<Badge variant="outline" class="uppercase tracking-wider">
								{shortRole}
							</Badge>
						</div>
						<div class="flex items-center gap-2 text-[13px] text-stone-500 dark:text-stone-400">
							<MailIcon class="size-4 shrink-0" />
							<span class="truncate">{user?.email ?? "Email sesi belum tersedia"}</span>
						</div>
						<Card.Description class="text-[13px] leading-relaxed">
							Area ini merangkum identitas akun aktif, kekuatan sesi, dan aksi keamanan yang paling sering dipakai operator dashboard.
						</Card.Description>
					</div>
				</div>
			</Card.Header>

			<Card.Content class="grid gap-3 sm:grid-cols-2">
				{#each accountSummary as item}
					<div class={`rounded-2xl border p-3 ${cardToneClass(item.tone)}`}>
						<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
							{item.label}
						</div>
						<div class="mt-1 text-sm font-semibold">{item.value}</div>
						<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">{item.helper}</div>
					</div>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root class="panel-card border-none shadow-none">
			<Card.Header class="gap-2">
				<Card.Title class="flex items-center gap-2 text-[15px] font-semibold">
					<ShieldCheckIcon class="size-4 text-emerald-600 dark:text-emerald-400" />
					Kontrol Sesi
				</Card.Title>
				<Card.Description class="text-[13px] leading-relaxed">
					Perbarui metadata token aktif atau akhiri sesi browser ini tanpa memengaruhi store lain.
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-3">
				{#each sessionSummary as item}
					<div class={`rounded-2xl border p-3 ${cardToneClass(item.tone)}`}>
						<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
							{#if item.icon}
								<item.icon class="size-4" />
							{/if}
							{item.label}
						</div>
						<div class="mt-1 text-sm font-semibold">{item.value}</div>
						<div class="mt-1 text-[12px] text-stone-500 dark:text-stone-400">{item.helper}</div>
					</div>
				{/each}
			</Card.Content>

			<Separator.Root class="mx-6" />

			<Card.Footer class="flex flex-wrap gap-2">
				<Button
					type="button"
					class="rounded-xl"
					disabled={refreshingSession}
					onclick={() => void onRefreshSession()}
				>
					<RefreshCcwIcon class={`size-4 ${refreshingSession ? "animate-spin" : ""}`} />
					{refreshingSession ? "Menyegarkan..." : "Refresh Sesi"}
				</Button>
				<Button
					type="button"
					variant="destructive"
					class="rounded-xl"
					onclick={() => void onLogout()}
				>
					<LogOutIcon class="size-4" />
					Logout Sekarang
				</Button>
			</Card.Footer>
		</Card.Root>
	</div>

	<div class="space-y-4 xl:col-span-3">
		<Card.Root class="panel-card border-none shadow-none">
			<Card.Header class="gap-2">
				<Card.Title class="flex items-center gap-2 text-[15px] font-semibold">
					<ShieldCheckIcon class="size-4 text-blue-600 dark:text-blue-400" />
					Status MFA
				</Card.Title>
				<Card.Description class="text-[13px] leading-relaxed">
					Pantau apakah akun aktif sudah memenuhi kebijakan MFA production dan apakah sesi browser ini masih tervalidasi.
				</Card.Description>
			</Card.Header>

			<Card.Content class="space-y-4">
				<div class="grid gap-3 md:grid-cols-3">
					{#each mfaSummary as item}
						<div class={`rounded-2xl border p-4 ${cardToneClass(item.tone)}`}>
							<div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
								{#if item.icon}
									<item.icon class="size-4" />
								{/if}
								{item.label}
							</div>
							<div class="mt-2">
								{#if item.label === "Status akun"}
									<Badge variant={mfaVariant} class="h-6 rounded-full px-2.5 text-[11px]">
										{item.value}
									</Badge>
								{:else}
									<div class="text-sm font-semibold">{item.value}</div>
								{/if}
							</div>
							<div class="mt-2 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
								{item.helper}
							</div>
						</div>
					{/each}
				</div>

				<div
					class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300"
					role="note"
				>
					Jika status MFA berubah di backend atau perangkat authenticator diganti, gunakan tombol
					<span class="font-semibold">Refresh Sesi</span>
					untuk menarik ulang status terbaru sebelum melakukan troubleshooting login berikutnya.
				</div>
			</Card.Content>

			<Separator.Root class="mx-6" />

			<Card.Footer class="flex flex-wrap gap-2">
				<Button type="button" variant="outline" class="rounded-xl" onclick={onOpenMfa}>
					<ShieldCheckIcon class="size-4" />
					{mfa?.enabled ? "Kelola Verifikasi MFA" : "Setup Verifikasi MFA"}
				</Button>
			</Card.Footer>
		</Card.Root>

		<Card.Root class="panel-card border-none shadow-none">
			<Card.Header class="gap-2">
				<Card.Title class="flex items-center gap-2 text-[15px] font-semibold">
					<KeyRoundIcon class="size-4 text-stone-700 dark:text-stone-200" />
					Ganti Password
				</Card.Title>
				<Card.Description class="text-[13px] leading-relaxed">
					Pakai current password akun aktif untuk menetapkan password baru. Setelah berhasil, login berikutnya harus memakai password yang baru.
				</Card.Description>
			</Card.Header>

			<Card.Content>
				<form class="space-y-4" aria-busy={changingPassword} on:submit={handlePasswordSubmit}>
					<Field.Group>
						<Field.Field class="space-y-2">
							<Field.Label for="current-password">Current password</Field.Label>
							<Input
								id="current-password"
								type="password"
								bind:value={currentPassword}
								autocomplete="current-password"
								placeholder="Masukkan password saat ini"
								class="rounded-xl"
								oninput={resetPasswordFeedback}
							/>
							<Field.Description>
								Password saat ini dipakai backend untuk memastikan aksi ini berasal dari pemilik sesi yang sah.
							</Field.Description>
						</Field.Field>
					</Field.Group>

					<div class="grid gap-4 md:grid-cols-2">
						<Field.Group>
							<Field.Field class="space-y-2">
								<Field.Label for="new-password">Password baru</Field.Label>
								<Input
									id="new-password"
									type="password"
									bind:value={nextPassword}
									autocomplete="new-password"
									placeholder="Minimal 8 karakter"
									class="rounded-xl"
									oninput={resetPasswordFeedback}
								/>
								<Field.Description>
									Pilih password unik yang belum pernah dipakai untuk akun dashboard ini.
								</Field.Description>
							</Field.Field>
						</Field.Group>

						<Field.Group>
							<Field.Field class="space-y-2">
								<Field.Label for="confirm-password">Konfirmasi password</Field.Label>
								<Input
									id="confirm-password"
									type="password"
									bind:value={confirmPassword}
									autocomplete="new-password"
									placeholder="Ulangi password baru"
									class="rounded-xl"
									oninput={resetPasswordFeedback}
								/>
								<Field.Description>
									Konfirmasi harus sama persis agar operator tidak terkunci karena salah ketik.
								</Field.Description>
							</Field.Field>
						</Field.Group>
					</div>

					<div class="grid gap-2 sm:grid-cols-2">
						{#each passwordRules as rule}
							<div
								class={`rounded-xl border px-3 py-2 text-[12px] transition-colors ${
									rule.passed
										? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300"
										: "border-stone-200/60 bg-white/70 text-stone-500 dark:border-white/10 dark:bg-black/20 dark:text-stone-400"
								}`}
							>
								{rule.label}
							</div>
						{/each}
					</div>

					{#if passwordSuccess}
						<div
							class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300"
							role="status"
							aria-live="polite"
						>
							{passwordSuccess}
						</div>
					{/if}

					{#if passwordMismatch}
						<Field.Error role="alert">Konfirmasi password harus sama persis dengan password baru.</Field.Error>
					{:else if passwordError}
						<Field.Error role="alert">{passwordError}</Field.Error>
					{/if}

					<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-black/20">
						<div class="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
							Password manager browser sebaiknya memperbarui kredensial setelah perubahan berhasil.
						</div>
						<Button type="submit" class="rounded-xl" disabled={changingPassword || !canSubmitPassword}>
							{changingPassword ? "Menyimpan..." : "Simpan Password Baru"}
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>
</div>
