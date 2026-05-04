<script lang="ts">
	import BellRingIcon from "@lucide/svelte/icons/bell-ring";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import PlayIcon from "@lucide/svelte/icons/play";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import WebhookIcon from "@lucide/svelte/icons/webhook";

	import type { AlertEndpoint, APIError } from "$lib/api/types";
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import * as Field from "$lib/components/ui/field";
	import { Input } from "$lib/components/ui/input";
	import * as Select from "$lib/components/ui/select/index.js";
	import * as Separator from "$lib/components/ui/separator";

	const supportedEvent = "webhook.failed_permanently";

	type ChannelValue = "webhook" | "slack_webhook" | "discord_webhook";

	export let endpoints: AlertEndpoint[] = [];
	export let loading = false;
	export let saving = false;
	export let testingEndpointId: string | null = null;
	export let deletingEndpointId: string | null = null;
	export let onCreate: (input: {
		name: string;
		channel: ChannelValue;
		destination_url: string;
		events: string[];
		status: "active" | "inactive";
		auth_token?: string;
	}) => Promise<void> | void = async () => {};
	export let onUpdate: (
		endpointID: string,
		input: {
			name: string;
			channel: ChannelValue;
			destination_url: string;
			events: string[];
			status: "active" | "inactive";
			auth_token?: string;
			clear_auth_token?: boolean;
		},
	) => Promise<void> | void = async () => {};
	export let onDelete: (endpointID: string) => Promise<void> | void = async () => {};
	export let onSendTest: (endpointID: string) => Promise<void> | void = async () => {};

	let selectedEndpointId = "";
	let name = "";
	let channel: ChannelValue = "webhook";
	let destinationURL = "";
	let authToken = "";
	let clearAuthToken = false;
	let isActive = true;
	let formError = "";

	$: selectedEndpoint = endpoints.find((item) => item.id === selectedEndpointId) ?? null;
	$: submitLabel = selectedEndpoint ? "Simpan perubahan" : "Tambah endpoint";
	$: submitHelper = selectedEndpoint
		? "Perubahan akan dipakai untuk alert berikutnya. Test alert bisa dikirim ulang kapan saja."
		: "Tambahkan destination baru untuk menerima alert webhook gagal permanen di luar dashboard.";
	$: channelHint =
		channel === "webhook"
			? "Kirim payload JSON lengkap yang bisa diproses sistem incident internal Anda."
			: channel === "slack_webhook"
				? "Kirim ringkasan alert singkat ke Slack Incoming Webhook tanpa perlu adapter tambahan."
				: "Kirim ringkasan alert singkat ke Discord Webhook untuk kanal operasional tim.";
	$: authHint =
		channel === "webhook"
			? "Isi bearer token jika endpoint internal Anda memerlukan autentikasi tambahan."
			: "Incoming webhook Slack/Discord biasanya tidak memerlukan bearer token tambahan.";

	function formatDateTime(value?: string | null) {
		if (!value) return "Belum pernah";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "Belum pernah";
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

	function channelLabel(value: ChannelValue) {
		switch (value) {
			case "slack_webhook":
				return "Slack Incoming Webhook";
			case "discord_webhook":
				return "Discord Webhook";
			default:
				return "Webhook JSON";
		}
	}

	function applyEndpoint(endpoint: AlertEndpoint) {
		selectedEndpointId = endpoint.id;
		name = endpoint.name;
		channel = endpoint.channel;
		destinationURL = endpoint.destination_url;
		authToken = "";
		clearAuthToken = false;
		isActive = endpoint.status === "active";
		formError = "";
	}

	function resetForm() {
		selectedEndpointId = "";
		name = "";
		channel = "webhook";
		destinationURL = "";
		authToken = "";
		clearAuthToken = false;
		isActive = true;
		formError = "";
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		formError = "";

		if (!name.trim()) {
			formError = "Nama endpoint wajib diisi agar operator tahu channel mana yang menerima alert.";
			return;
		}

		if (!destinationURL.trim()) {
			formError = "Destination URL wajib diisi agar PayGate tahu ke mana alert harus dikirim.";
			return;
		}

		const payload: {
			name: string;
			channel: ChannelValue;
			destination_url: string;
			events: string[];
			status: "active" | "inactive";
			auth_token?: string;
			clear_auth_token?: boolean;
		} = {
			name: name.trim(),
			channel,
			destination_url: destinationURL.trim(),
			events: [supportedEvent],
			status: isActive ? "active" : "inactive",
			...(authToken.trim() ? { auth_token: authToken.trim() } : {}),
			...(selectedEndpoint ? { clear_auth_token: clearAuthToken } : {}),
		};

		try {
			if (selectedEndpoint) {
				await onUpdate(selectedEndpoint.id, payload);
				authToken = "";
				clearAuthToken = false;
			} else {
				await onCreate(payload);
				resetForm();
			}
		} catch (caught) {
			const apiError = caught as APIError;
			formError = apiError.message;
		}
	}

	async function handleDelete(endpointID: string) {
		try {
			await onDelete(endpointID);
			if (selectedEndpointId === endpointID) {
				resetForm();
			}
		} catch (caught) {
			const apiError = caught as APIError;
			formError = apiError.message;
		}
	}

	async function handleTest(endpointID: string) {
		formError = "";
		try {
			await onSendTest(endpointID);
		} catch (caught) {
			const apiError = caught as APIError;
			formError = apiError.message;
		}
	}
</script>

<div class="grid grid-cols-1 gap-4 xl:grid-cols-5">
	<div class="space-y-4 xl:col-span-3">
		<Card.Root class="panel-card border-none shadow-none">
			<Card.Header class="gap-3">
				<div class="flex items-start justify-between gap-3">
					<div class="space-y-1">
						<Card.Title class="text-[18px] font-bold tracking-tight">
							Notifikasi Operasional
						</Card.Title>
						<Card.Description class="text-[13px] leading-relaxed">
							Hubungkan Slack, Discord, atau endpoint internal agar tim langsung tahu ketika webhook merchant gagal permanen.
						</Card.Description>
					</div>
					<Button variant="outline" class="rounded-xl" onclick={resetForm}>
						<PlusIcon class="size-4" />
						Endpoint baru
					</Button>
				</div>
			</Card.Header>

			<Card.Content class="space-y-4">
				<div class="rounded-[18px] border border-amber-200/70 bg-amber-50/80 p-4 text-[13px] leading-relaxed text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
					Alert saat ini fokus pada event yang paling kritis untuk merchant:
					<strong> webhook gagal permanen.</strong>
					Saat event ini terjadi, PayGate mengirim notifikasi ke semua endpoint aktif milik operator store terkait.
				</div>

				<form class="space-y-4" onsubmit={handleSubmit}>
					<Field.Group class="grid gap-4 md:grid-cols-2">
						<Field.Field>
							<Field.Label for="alert-endpoint-name">Nama endpoint</Field.Label>
							<Input
								id="alert-endpoint-name"
								bind:value={name}
								class="rounded-xl"
								placeholder="Slack Operasional, Discord Incident, atau Pager Internal"
							/>
							<Field.Description>
								Gunakan nama yang jelas agar operator tidak salah memilih channel saat incident.
							</Field.Description>
						</Field.Field>

						<Field.Field>
							<Field.Label for="alert-endpoint-channel">Format notifikasi</Field.Label>
							<Select.Root type="single" bind:value={channel}>
								<Select.Trigger id="alert-endpoint-channel" class="w-full rounded-xl">
									{channelLabel(channel)}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="webhook">Webhook JSON</Select.Item>
									<Select.Item value="slack_webhook">Slack Incoming Webhook</Select.Item>
									<Select.Item value="discord_webhook">Discord Webhook</Select.Item>
								</Select.Content>
							</Select.Root>
							<Field.Description>{channelHint}</Field.Description>
						</Field.Field>
					</Field.Group>

					<Field.Field>
						<Field.Label for="alert-endpoint-url">Destination URL</Field.Label>
						<Input
							id="alert-endpoint-url"
							bind:value={destinationURL}
							class="rounded-xl font-mono text-[13px]"
							placeholder={
								channel === "slack_webhook"
									? "https://hooks.slack.com/services/..."
									: channel === "discord_webhook"
										? "https://discord.com/api/webhooks/..."
										: "https://ops.example.com/webhooks/paygate"
							}
						/>
						<Field.Description>
							Gunakan HTTPS di production. Saat development lokal, HTTP masih diizinkan agar pengujian lebih cepat.
						</Field.Description>
					</Field.Field>

					<Field.Group class="grid gap-4 md:grid-cols-2">
						<Field.Field>
							<Field.Label for="alert-endpoint-auth">Bearer token opsional</Field.Label>
							<div class="relative">
								<KeyRoundIcon class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
								<Input
									id="alert-endpoint-auth"
									bind:value={authToken}
									class="rounded-xl pl-10 font-mono text-[13px]"
									placeholder={
										selectedEndpoint && selectedEndpoint.has_auth_token
											? "Biarkan kosong untuk mempertahankan token saat ini"
											: "Tidak wajib untuk Slack/Discord"
									}
								/>
							</div>
							<Field.Description>{authHint}</Field.Description>
						</Field.Field>

						<div class="rounded-[18px] border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
							<div class="space-y-3">
								<div class="flex items-start gap-3">
									<Checkbox bind:checked={isActive} id="alert-endpoint-active" />
									<div class="space-y-1">
										<label
											for="alert-endpoint-active"
											class="text-sm font-semibold leading-none text-stone-900 dark:text-stone-100"
										>
											Aktifkan endpoint ini
										</label>
										<p class="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
											Endpoint nonaktif tetap tersimpan, tetapi tidak menerima alert baru sampai diaktifkan lagi.
										</p>
									</div>
								</div>

								{#if selectedEndpoint && selectedEndpoint.has_auth_token}
									<div class="flex items-start gap-3">
										<Checkbox bind:checked={clearAuthToken} id="alert-endpoint-clear-auth" />
										<div class="space-y-1">
											<label
												for="alert-endpoint-clear-auth"
												class="text-sm font-semibold leading-none text-stone-900 dark:text-stone-100"
											>
												Hapus bearer token tersimpan
											</label>
											<p class="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
												Centang hanya jika endpoint baru tidak lagi memerlukan autentikasi header `Authorization`.
											</p>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</Field.Group>

					<div class="rounded-[18px] border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant="outline">Event aktif</Badge>
							<Badge class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
								webhook.failed_permanently
							</Badge>
						</div>
						<p class="mt-3 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
							Payload alert membawa identitas store, `order_id`, callback URL, jumlah percobaan terakhir, dan langkah tindak lanjut yang disarankan.
						</p>
					</div>

					{#if formError}
						<div class="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
							{formError}
						</div>
					{/if}

					<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p class="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
							{submitHelper}
						</p>
						<div class="flex flex-wrap items-center gap-2">
							{#if selectedEndpoint}
								<Button
									type="button"
									variant="outline"
									class="rounded-xl"
									disabled={testingEndpointId === selectedEndpoint.id}
									onclick={() => void handleTest(selectedEndpoint.id)}
								>
									<PlayIcon class="size-4" />
									{testingEndpointId === selectedEndpoint.id ? "Mengirim test..." : "Kirim test"}
								</Button>
							{/if}
							<Button type="submit" class="rounded-xl" disabled={saving}>
								<BellRingIcon class="size-4" />
								{saving ? "Menyimpan..." : submitLabel}
							</Button>
						</div>
					</div>
				</form>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="space-y-4 xl:col-span-2">
		<Card.Root class="panel-card border-none shadow-none">
			<Card.Header class="gap-2">
				<Card.Title class="text-[16px] font-bold tracking-tight">Endpoint Aktif</Card.Title>
				<Card.Description class="text-[13px] leading-relaxed">
					Pilih endpoint untuk mengubah URL, menonaktifkan sementara, atau mengirim test alert.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if loading}
					<div class="rounded-[18px] border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
						Memuat konfigurasi notifikasi operasional...
					</div>
				{:else if endpoints.length === 0}
					<div class="rounded-[18px] border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500 dark:border-white/10 dark:text-stone-400">
						Belum ada destination alert. Tambahkan minimal satu channel agar incident webhook tidak hanya terlihat di dashboard.
					</div>
				{:else}
					{#each endpoints as endpoint}
						<button
							type="button"
							class={`w-full rounded-[18px] border p-4 text-left transition-colors ${selectedEndpointId === endpoint.id ? "border-stone-900 bg-stone-50 dark:border-white dark:bg-white/10" : "border-stone-200/60 bg-white/70 hover:bg-stone-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/5"}`}
							onclick={() => applyEndpoint(endpoint)}
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0 space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<span class="truncate text-sm font-semibold">{endpoint.name}</span>
										<Badge variant={endpoint.status === "active" ? "default" : "outline"}>
											{endpoint.status === "active" ? "Aktif" : "Pause"}
										</Badge>
										{#if endpoint.has_auth_token}
											<Badge variant="outline">Bearer token</Badge>
										{/if}
									</div>
									<div class="flex items-center gap-2 text-[13px] text-stone-500 dark:text-stone-400">
										<WebhookIcon class="size-4 shrink-0" />
										<span class="truncate">{channelLabel(endpoint.channel)}</span>
									</div>
									<p class="truncate font-mono text-[12px] text-stone-500 dark:text-stone-400">
										{endpoint.destination_url}
									</p>
								</div>
								<div class="text-right text-[12px] text-stone-400 dark:text-stone-500">
									<div>Terakhir sukses</div>
									<div class="font-medium text-stone-600 dark:text-stone-300">
										{formatDateTime(endpoint.last_success_at)}
									</div>
								</div>
							</div>

							{#if endpoint.last_error}
								<div class="mt-3 rounded-[14px] border border-red-200/70 bg-red-50/80 px-3 py-2 text-[12px] leading-relaxed text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
									Error terakhir: {endpoint.last_error}
								</div>
							{/if}

							<Separator.Root class="my-3 bg-stone-200/70 dark:bg-white/10" />

							<div class="flex flex-wrap items-center justify-between gap-2 text-[12px] text-stone-500 dark:text-stone-400">
								<div class="space-y-1">
									<div>Terakhir di-trigger: {formatDateTime(endpoint.last_triggered_at)}</div>
									<div>Terakhir test: {formatDateTime(endpoint.last_tested_at)}</div>
								</div>
								<div class="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="rounded-xl"
										disabled={testingEndpointId === endpoint.id}
										onclick={(event) => {
											event.stopPropagation();
											void handleTest(endpoint.id);
										}}
									>
										<PlayIcon class="size-4" />
										{testingEndpointId === endpoint.id ? "Test..." : "Test"}
									</Button>
									<Button
										type="button"
										variant="destructive"
										size="sm"
										class="rounded-xl"
										disabled={deletingEndpointId === endpoint.id}
										onclick={(event) => {
											event.stopPropagation();
											void handleDelete(endpoint.id);
										}}
									>
										<Trash2Icon class="size-4" />
										{deletingEndpointId === endpoint.id ? "Menghapus..." : "Hapus"}
									</Button>
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
