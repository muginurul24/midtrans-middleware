<script lang="ts">
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import CopyIcon from "@lucide/svelte/icons/copy";
	import InfoIcon from "@lucide/svelte/icons/info";
	import MailIcon from "@lucide/svelte/icons/mail";
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import { toast } from "svelte-sonner";

	import type { APIError, PasswordResetPreview } from "$lib/api/types";
	import { requestPasswordReset } from "$lib/auth/session";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { route } from "$lib/spa";

	let email = "";
	let emailError = "";
	let banner = "";
	let isSubmitting = false;
	let requestAccepted = false;
	let responseMessage =
		"Jika email terdaftar, instruksi reset password akan kami siapkan tanpa membuka informasi apakah akun tersebut ada atau tidak.";
	let preview: PasswordResetPreview | null = null;

	$: previewUrl =
		preview && typeof window !== "undefined"
			? `${window.location.origin}${preview.reset_path}`
			: "";

	async function copyValue(value: string, label: string) {
		try {
			await navigator.clipboard.writeText(value);
			toast.success(`${label} berhasil disalin.`);
		} catch {
			toast.error(`Gagal menyalin ${label}.`);
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		emailError = "";
		banner = "";

		if (!email.trim()) {
			emailError = "Email wajib diisi.";
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			emailError = "Format email tidak valid.";
			return;
		}

		isSubmitting = true;
		try {
			const data = await requestPasswordReset({ email });
			requestAccepted = true;
			responseMessage =
				data.message ||
				"Jika email terdaftar, instruksi reset password sudah disiapkan.";
			preview = data.preview ?? null;
			toast.success("Permintaan reset password diterima.");
		} catch (error) {
			const apiError = error as APIError;
			banner = apiError.message;
			toast.error("Permintaan reset password gagal diproses.");
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header class="space-y-2">
		<Card.Title class="text-2xl font-bold tracking-tight">Lupa password?</Card.Title>
		<Card.Description class="text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
			Masukkan email operator dashboard. Jika akun terdaftar, PayGate akan menyiapkan instruksi reset password yang aman.
		</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-5">
		{#if banner}
			<div class="flex gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
				<TriangleAlertIcon class="mt-0.5 size-4 shrink-0" />
				<div>{banner}</div>
			</div>
		{/if}

		{#if requestAccepted}
			<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-[13px] leading-relaxed text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
				<div class="font-semibold">Permintaan reset sudah diterima.</div>
				<div class="mt-1">{responseMessage}</div>
			</div>
		{/if}

		<form class="space-y-5" onsubmit={handleSubmit}>
			<div class="space-y-1.5">
				<label for="forgot-email" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Email operator</label>
				<div class="relative">
					<MailIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="forgot-email"
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

			<Button type="submit" class="h-12 w-full rounded-2xl text-[15px] font-bold" disabled={isSubmitting}>
				{#if isSubmitting}
					<span class="inline-flex items-center gap-2">
						<span class="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
						Menyiapkan reset...
					</span>
				{:else}
					<span class="inline-flex items-center gap-2">
						Kirim instruksi reset
						<ArrowRightIcon class="size-4" />
					</span>
				{/if}
			</Button>
		</form>

		{#if preview}
			<div class="space-y-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-900/30 dark:bg-blue-950/20">
				<div class="flex gap-2 text-[13px] text-blue-800 dark:text-blue-300">
					<InfoIcon class="mt-0.5 size-4 shrink-0" />
					<div>
						<div class="font-semibold">Preview reset lokal aktif</div>
						<div class="mt-1 leading-relaxed">
							Mailer production belum dipakai di environment ini. Gunakan link atau token berikut untuk menguji alur reset password secara lokal.
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<div class="text-[12px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Reset link</div>
					<div class="rounded-2xl bg-stone-950 p-3 font-mono text-[12px] text-stone-100 break-all">
						{previewUrl}
					</div>
					<Button type="button" variant="outline" class="rounded-full" onclick={() => void copyValue(previewUrl, "Reset link")}>
						<CopyIcon class="size-4" />
						Salin link reset
					</Button>
				</div>

				<div class="space-y-2">
					<div class="text-[12px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">Reset token</div>
					<div class="rounded-2xl bg-stone-950 p-3 font-mono text-[12px] text-stone-100 break-all">
						{preview.reset_token}
					</div>
					<div class="text-[12px] leading-relaxed text-blue-700 dark:text-blue-300">
						Token berlaku sampai {new Intl.DateTimeFormat("id-ID", {
							dateStyle: "medium",
							timeStyle: "short",
							timeZone: "Asia/Jakarta",
						}).format(new Date(preview.expires_at))}.
					</div>
					<Button
						type="button"
						variant="outline"
						class="rounded-full"
						onclick={() => preview && void copyValue(preview.reset_token, "Reset token")}
					>
						<CopyIcon class="size-4" />
						Salin token
					</Button>
				</div>
			</div>
		{/if}
	</Card.Content>

	<Card.Footer class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
		<a href="/login" use:route class="inline-flex items-center gap-2 text-[14px] font-semibold text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">
			<ArrowLeftIcon class="size-4" />
			Kembali ke login
		</a>
		<a href="/contact" use:route class="text-[13px] font-medium text-stone-500 underline-offset-2 transition-colors hover:text-stone-900 hover:underline dark:text-stone-400 dark:hover:text-stone-100">
			Butuh bantuan akses dari tim support?
		</a>
	</Card.Footer>
</Card.Root>
