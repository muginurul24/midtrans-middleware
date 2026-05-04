<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import InfoIcon from "@lucide/svelte/icons/info";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import LockIcon from "@lucide/svelte/icons/lock";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import type { APIError } from "$lib/api/types";
	import { resetPassword } from "$lib/auth/session";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { goto, route } from "$lib/spa";

	let token = "";
	let newPassword = "";
	let confirmPassword = "";
	let showPassword = false;
	let showConfirmPassword = false;
	let tokenError = "";
	let passwordError = "";
	let confirmError = "";
	let banner = "";
	let isSubmitting = false;
	let completed = false;

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		token = params.get("token")?.trim() ?? "";
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		tokenError = "";
		passwordError = "";
		confirmError = "";
		banner = "";

		if (!token.trim()) {
			tokenError = "Token reset wajib diisi.";
		}

		if (newPassword.trim().length < 8) {
			passwordError = "Password baru minimal 8 karakter.";
		}

		if (confirmPassword !== newPassword) {
			confirmError = "Konfirmasi password harus sama dengan password baru.";
		}

		if (tokenError || passwordError || confirmError) {
			return;
		}

		isSubmitting = true;
		try {
			await resetPassword({ token, new_password: newPassword });
			completed = true;
			newPassword = "";
			confirmPassword = "";
			toast.success("Password berhasil direset. Silakan login kembali.");
		} catch (error) {
			const apiError = error as APIError;
			banner = apiError.message;
			toast.error("Reset password gagal diproses.");
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header class="space-y-2">
		<Card.Title class="text-2xl font-bold tracking-tight">Buat password baru</Card.Title>
		<Card.Description class="text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
			Gunakan token reset yang diterima melalui email atau preview development. Reset sukses akan menutup semua sesi aktif lama.
		</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-5">
		{#if completed}
			<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-[13px] leading-relaxed text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
				<div class="font-semibold">Password berhasil diperbarui.</div>
				<div class="mt-1">Semua sesi lama sudah dianggap tidak valid. Lanjutkan login ulang untuk membuka dashboard.</div>
			</div>
		{/if}

		{#if banner}
			<div class="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
				<TriangleAlertIcon class="mt-0.5 size-4 shrink-0" />
				<div>{banner}</div>
			</div>
		{/if}

		<form class="space-y-5" onsubmit={handleSubmit}>
			<div class="space-y-1.5">
				<label for="reset-token" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Token reset</label>
				<div class="relative">
					<KeyRoundIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="reset-token"
						bind:value={token}
						placeholder="Tempel token reset di sini"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 dark:border-white/10 dark:bg-white/5"
					/>
				</div>
				<p class="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
					Jika Anda membuka halaman ini dari tautan reset, token biasanya sudah terisi otomatis.
				</p>
				{#if tokenError}
					<p class="text-[13px] font-medium text-red-500">{tokenError}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="reset-password" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Password baru</label>
				<div class="relative">
					<LockIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="reset-password"
						bind:value={newPassword}
						type={showPassword ? "text" : "password"}
						autocomplete="new-password"
						placeholder="Minimal 8 karakter"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 pr-11 dark:border-white/10 dark:bg-white/5"
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-700 dark:hover:bg-white/10 dark:hover:text-stone-200"
						onclick={() => (showPassword = !showPassword)}
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

			<div class="space-y-1.5">
				<label for="reset-password-confirm" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Konfirmasi password baru</label>
				<div class="relative">
					<LockIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="reset-password-confirm"
						bind:value={confirmPassword}
						type={showConfirmPassword ? "text" : "password"}
						autocomplete="new-password"
						placeholder="Ulangi password baru"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 pr-11 dark:border-white/10 dark:bg-white/5"
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-700 dark:hover:bg-white/10 dark:hover:text-stone-200"
						onclick={() => (showConfirmPassword = !showConfirmPassword)}
					>
						{#if showConfirmPassword}
							<EyeOffIcon class="size-4" />
						{:else}
							<EyeIcon class="size-4" />
						{/if}
					</button>
				</div>
				{#if confirmError}
					<p class="text-[13px] font-medium text-red-500">{confirmError}</p>
				{/if}
			</div>

			<div class="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-800 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
				<div class="flex gap-2">
					<InfoIcon class="mt-0.5 size-4 shrink-0" />
					<div>
						Setelah reset sukses, semua sesi dashboard lama akan di-revoke. Login ulang diperlukan agar operator memakai credential terbaru.
					</div>
				</div>
			</div>

			<Button type="submit" class="h-12 w-full rounded-2xl text-[15px] font-bold" disabled={isSubmitting}>
				{#if isSubmitting}
					<span class="inline-flex items-center gap-2">
						<span class="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
						Menyimpan password baru...
					</span>
				{:else}
					<span class="inline-flex items-center gap-2">
						Simpan password baru
						<ArrowRightIcon class="size-4" />
					</span>
				{/if}
			</Button>
		</form>
	</Card.Content>

	<Card.Footer class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
		<a href="/login" use:route class="inline-flex items-center gap-2 text-[14px] font-semibold text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
			<ArrowLeftIcon class="size-4" />
			Kembali ke login
		</a>
		{#if completed}
			<Button type="button" class="rounded-full" onclick={() => goto("/login")}>
				Login kembali
				<ArrowRightIcon class="size-4" />
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
