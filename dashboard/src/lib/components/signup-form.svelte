<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
	import CircleIcon from "@lucide/svelte/icons/circle";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import LockIcon from "@lucide/svelte/icons/lock";
	import MailIcon from "@lucide/svelte/icons/mail";
	import UserIcon from "@lucide/svelte/icons/user";
	import { toast } from "svelte-sonner";

	import type { APIError, MFAState } from "$lib/api/types";
	import { register, type SessionPersistence } from "$lib/auth/session";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { Input } from "$lib/components/ui/input";
	import { route } from "$lib/spa";

	const dispatch = createEventDispatcher<{
		success: { email: string; mfa: MFAState };
	}>();

	let name = "";
	let email = "";
	let password = "";
	let confirmPassword = "";
	let terms = false;
	let remember = true;
	let showPassword = false;
	let showConfirmPassword = false;
	let isSubmitting = false;
	let fieldErrors: Record<string, string> = {};
	let formError = "";

	$: passwordChecks = {
		length: password.length >= 8,
		upper: /[A-Z]/.test(password),
		lower: /[a-z]/.test(password),
		number: /\d/.test(password),
		special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
	};

	$: passwordScore = Object.values(passwordChecks).filter(Boolean).length;
	$: strengthWidth = `${passwordScore * 20}%`;
	$: strengthLabel =
		passwordScore <= 1
			? "Sangat lemah"
			: passwordScore === 2
				? "Lemah"
				: passwordScore === 3
					? "Cukup"
					: passwordScore === 4
						? "Kuat"
						: "Sangat kuat";
	$: strengthTone =
		passwordScore <= 1
			? "bg-red-500"
			: passwordScore === 2
				? "bg-orange-500"
				: passwordScore === 3
					? "bg-amber-500"
					: "bg-emerald-500";

	function validate() {
		const nextErrors: Record<string, string> = {};

		if (!name.trim()) nextErrors.name = "Nama wajib diisi.";
		else if (name.trim().length < 2) nextErrors.name = "Nama minimal 2 karakter.";

		if (!email.trim()) nextErrors.email = "Email wajib diisi.";
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			nextErrors.email = "Format email tidak valid.";
		}

		if (password.length < 8) nextErrors.password = "Password minimal 8 karakter.";
		if (confirmPassword !== password) nextErrors.confirm = "Password tidak cocok.";
		if (!terms) nextErrors.terms = "Anda harus menyetujui kebijakan privasi.";

		fieldErrors = nextErrors;
		return Object.keys(nextErrors).length === 0;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		formError = "";

		if (!validate()) {
			return;
		}

		isSubmitting = true;
		try {
			const persistence: SessionPersistence = remember ? "local" : "session";
			const mfa = await register(
				{
					name: name.trim(),
					email: email.trim(),
					password,
				},
				{ persistence },
			);
			toast.success(
				mfa.can_access_dashboard
					? "Akun berhasil dibuat. Dashboard siap digunakan."
					: "Akun berhasil dibuat. Lanjutkan verifikasi MFA untuk membuka dashboard.",
			);
			dispatch("success", { email: email.trim(), mfa });
		} catch (error) {
			const apiError = error as APIError;
			formError = apiError.message;
			toast.error("Registrasi gagal. Periksa data form atau status email yang digunakan.");
		} finally {
			isSubmitting = false;
		}
	}

	const checklist = [
		{ label: "Min. 8 karakter", key: "length" },
		{ label: "Huruf besar", key: "upper" },
		{ label: "Huruf kecil", key: "lower" },
		{ label: "Angka", key: "number" },
		{ label: "Simbol (!@#$)", key: "special" },
	] as const;
</script>

<Card.Root class="panel-card border-none shadow-none">
	<Card.Header class="space-y-2">
		<Card.Title class="text-2xl font-bold tracking-tight">Buat Akun Baru</Card.Title>
		<Card.Description class="text-[15px] leading-relaxed text-stone-500 dark:text-stone-400">
			Gratis untuk MVP. Setelah akun dibuat, Anda bisa langsung membuat store dan generate API token pertama.
		</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-5">
		{#if formError}
			<div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-300">
				{formError}
			</div>
		{/if}

		<form class="space-y-5" on:submit={handleSubmit}>
			<div class="space-y-1.5">
				<label for="register-name" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Nama lengkap</label>
				<div class="relative">
					<UserIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="register-name"
						bind:value={name}
						type="text"
						autocomplete="name"
						placeholder="Ahmad Rizki"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 dark:border-white/10 dark:bg-white/5"
					/>
				</div>
				{#if fieldErrors.name}
					<p class="text-[13px] font-medium text-red-500">{fieldErrors.name}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="register-email" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Email</label>
				<div class="relative">
					<MailIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="register-email"
						bind:value={email}
						type="email"
						autocomplete="email"
						placeholder="ahmad@example.com"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 dark:border-white/10 dark:bg-white/5"
					/>
				</div>
				{#if fieldErrors.email}
					<p class="text-[13px] font-medium text-red-500">{fieldErrors.email}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="register-password" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Password</label>
				<div class="relative">
					<LockIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="register-password"
						bind:value={password}
						type={showPassword ? "text" : "password"}
						autocomplete="new-password"
						placeholder="Minimal 8 karakter"
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
				<div class="space-y-2">
					<div class="flex items-center justify-between text-[12px]">
						<span class="font-medium text-stone-400 dark:text-stone-500">Kekuatan password</span>
						<span class="font-bold text-stone-600 dark:text-stone-300">{strengthLabel}</span>
					</div>
					<div class="h-1.5 rounded-full bg-stone-200 dark:bg-white/10">
						<div class={`h-full rounded-full transition-all duration-300 ${strengthTone}`} style={`width: ${strengthWidth};`}></div>
					</div>
					<div class="grid grid-cols-2 gap-x-4 gap-y-1">
						{#each checklist as item}
							<div class={`flex items-center gap-1.5 text-[12px] ${passwordChecks[item.key] ? "text-emerald-600 dark:text-emerald-400" : "text-stone-400 dark:text-stone-500"}`}>
								{#if passwordChecks[item.key]}
									<CheckCircle2Icon class="size-3.5" />
								{:else}
									<CircleIcon class="size-3.5" />
								{/if}
								<span>{item.label}</span>
							</div>
						{/each}
					</div>
				</div>
				{#if fieldErrors.password}
					<p class="text-[13px] font-medium text-red-500">{fieldErrors.password}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label for="register-confirm" class="text-[13px] font-semibold text-stone-700 dark:text-stone-300">Konfirmasi password</label>
				<div class="relative">
					<LockIcon class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
					<Input
						id="register-confirm"
						bind:value={confirmPassword}
						type={showConfirmPassword ? "text" : "password"}
						autocomplete="new-password"
						placeholder="Ulangi password"
						class="h-12 rounded-2xl border-stone-200/70 bg-white/80 pl-10 pr-11 dark:border-white/10 dark:bg-white/5"
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-black/5 hover:text-stone-700 dark:hover:bg-white/10 dark:hover:text-stone-200"
						on:click={() => (showConfirmPassword = !showConfirmPassword)}
					>
						{#if showConfirmPassword}
							<EyeOffIcon class="size-4" />
						{:else}
							<EyeIcon class="size-4" />
						{/if}
					</button>
				</div>
				{#if fieldErrors.confirm}
					<p class="text-[13px] font-medium text-red-500">{fieldErrors.confirm}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label class="flex items-start gap-3 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
					<Checkbox bind:checked={terms} class="mt-0.5" />
					<span>
						Saya menyetujui
						<a href="/privacy" use:route class="font-semibold text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">
							Privacy Policy
						</a>
						dan kebijakan penggunaan PayGate.
					</span>
				</label>
				{#if fieldErrors.terms}
					<p class="text-[13px] font-medium text-red-500">{fieldErrors.terms}</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<label class="flex items-center gap-3 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
					<Checkbox bind:checked={remember} class="mt-0.5" />
					<span>Simpan sesi di perangkat ini setelah akun dibuat.</span>
				</label>
			</div>

			<Button type="submit" class="h-12 w-full rounded-2xl text-[15px] font-bold" disabled={isSubmitting}>
				{#if isSubmitting}
					<span class="inline-flex items-center gap-2">
						<span class="inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
						Menyiapkan akun...
					</span>
				{:else}
					<span class="inline-flex items-center gap-2">
						Buat Akun
						<ArrowRightIcon class="size-4" />
					</span>
				{/if}
			</Button>
		</form>
	</Card.Content>

	<Card.Footer class="justify-center">
		<p class="text-center text-[14px] text-stone-500 dark:text-stone-400">
			Sudah punya akun?
			<a href="/login" use:route class="font-semibold text-stone-900 underline-offset-2 hover:underline dark:text-stone-100">Masuk</a>
		</p>
	</Card.Footer>
</Card.Root>
