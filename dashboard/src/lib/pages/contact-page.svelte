<script lang="ts">
	import BugIcon from "@lucide/svelte/icons/bug";
	import Clock3Icon from "@lucide/svelte/icons/clock-3";
	import GithubIcon from "@lucide/svelte/icons/github";
	import HelpCircleIcon from "@lucide/svelte/icons/help-circle";
	import MailIcon from "@lucide/svelte/icons/mail";
	import MessageCircleIcon from "@lucide/svelte/icons/message-circle";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import MarketingFooter from "$lib/components/paygate/marketing-footer.svelte";
	import MarketingNavbar from "$lib/components/paygate/marketing-navbar.svelte";
	import { contactFaqs } from "$lib/content/paygate";
	import { setupRevealObserver } from "$lib/paygate/reveal";

	export let route: unknown = undefined;
	$: route;

	let openFaq = 0;
	let form = {
		name: "",
		email: "",
		subject: "",
		message: "",
	};
	let formError = "";
	let isSubmitting = false;

	const contactTopics: Record<string, { label: string; email: string }> = {
		integrasi: {
			label: "Pertanyaan integrasi API",
			email: "hello@paygate.id",
		},
		bug: {
			label: "Laporan bug",
			email: "support@paygate.id",
		},
		akun: {
			label: "Masalah akun atau store",
			email: "support@paygate.id",
		},
		webhook: {
			label: "Masalah webhook",
			email: "support@paygate.id",
		},
		fitur: {
			label: "Request fitur baru",
			email: "hello@paygate.id",
		},
		lainnya: {
			label: "Pertanyaan lainnya",
			email: "hello@paygate.id",
		},
	};

	onMount(() => setupRevealObserver());

	async function submitContact(event: SubmitEvent) {
		event.preventDefault();
		formError = "";

		if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
			formError = "Semua field wajib diisi.";
			return;
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
			formError = "Format email tidak valid.";
			return;
		}

		isSubmitting = true;
		try {
			const topic = contactTopics[form.subject] ?? contactTopics.lainnya;
			const subject = `[PayGate] ${topic.label} · ${form.name.trim()}`;
			const body = [
				`Nama: ${form.name.trim()}`,
				`Email: ${form.email.trim()}`,
				`Topik: ${topic.label}`,
				"",
				form.message.trim(),
			].join("\n");

			if (typeof window !== "undefined") {
				window.location.href = `mailto:${topic.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
			}

			toast.success(
				"Draft email berhasil dibuka. Kirim dari aplikasi email Anda agar tim PayGate bisa menindaklanjuti pesan ini.",
			);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Kontak — PayGate</title>
</svelte:head>

<MarketingNavbar mode="pages" activePage="contact" />

<section class="grid-pattern relative overflow-hidden pt-[72px]">
	<div class="anim-pulse-glow pointer-events-none absolute right-[10%] top-10 h-[350px] w-[350px] rounded-full bg-blue-400/10 blur-[120px] dark:bg-blue-500/5"></div>
	<div class="relative z-10 mx-auto max-w-4xl px-5 py-24 text-center md:px-8 md:py-32">
		<div class="anim-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/70 px-4 py-1.5 dark:border-white/10 dark:bg-white/5">
			<MessageCircleIcon class="size-[14px] text-blue-500" />
			<span class="text-[13px] font-semibold text-stone-600 dark:text-stone-300">Hubungi Kami</span>
		</div>
		<h1 class="anim-fade-up mb-6 text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-5xl md:text-6xl" style="animation-delay: 100ms;">
			Ada Pertanyaan?<br />
			<span class="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
				Kami Siap Membantu
			</span>
		</h1>
		<p class="anim-fade-up mx-auto max-w-2xl text-lg font-medium leading-relaxed text-stone-500 dark:text-stone-400 md:text-xl" style="animation-delay: 200ms;">
			Baik itu pertanyaan integrasi, laporan bug, atau diskusi arsitektur pembayaran, tim PayGate merespons dalam 24 jam kerja.
		</p>
	</div>
</section>

<section class="py-20 md:py-28">
	<div class="mx-auto max-w-6xl px-5 md:px-8">
		<div class="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-16">
			<div class="reveal lg:col-span-3">
				<div class="rounded-[24px] border border-stone-200/60 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-white/[0.04] md:p-8">
					<h2 class="mb-1 text-[20px] font-bold">Kirim Pesan</h2>
					<p class="mb-6 text-[14px] text-stone-500 dark:text-stone-400">Isi formulir di bawah untuk menyiapkan draft email ke tim PayGate. Ini lebih aman daripada memberi konfirmasi palsu sebelum pesan benar-benar dikirim.</p>

					<form class="space-y-5" on:submit={submitContact}>
						<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
							<div>
								<label for="contact-name" class="mb-1.5 block text-[13px] font-semibold text-stone-700 dark:text-stone-300">Nama lengkap</label>
								<input id="contact-name" bind:value={form.name} type="text" placeholder="Ahmad Rizki" class="input-focus w-full rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-[14px] placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-stone-500" />
							</div>
							<div>
								<label for="contact-email" class="mb-1.5 block text-[13px] font-semibold text-stone-700 dark:text-stone-300">Email</label>
								<input id="contact-email" bind:value={form.email} type="email" placeholder="ahmad@example.com" class="input-focus w-full rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-[14px] placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-stone-500" />
							</div>
						</div>
						<div>
							<label for="contact-subject" class="mb-1.5 block text-[13px] font-semibold text-stone-700 dark:text-stone-300">Subjek</label>
							<select id="contact-subject" bind:value={form.subject} class="input-focus w-full rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-[14px] dark:border-white/10 dark:bg-white/5">
								<option value="" disabled selected>Pilih topik...</option>
								<option value="integrasi">Pertanyaan integrasi API</option>
								<option value="bug">Laporan bug</option>
								<option value="akun">Masalah akun atau store</option>
								<option value="webhook">Masalah webhook</option>
								<option value="fitur">Request fitur baru</option>
								<option value="lainnya">Lainnya</option>
							</select>
						</div>
						<div>
							<label for="contact-message" class="mb-1.5 block text-[13px] font-semibold text-stone-700 dark:text-stone-300">Pesan</label>
							<textarea id="contact-message" bind:value={form.message} rows="5" placeholder="Jelaskan konteks masalah atau pertanyaan Anda. Sertakan order_id atau request_id bila ada." class="input-focus w-full resize-none rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-[14px] placeholder:text-stone-400 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-stone-500"></textarea>
						</div>
						{#if formError}
							<p class="text-[14px] font-medium text-red-500">{formError}</p>
						{/if}
						<button type="submit" class="rounded-2xl bg-stone-900 px-8 py-3.5 text-[15px] font-bold text-white transition-all duration-300 hover:bg-stone-800 dark:bg-white dark:text-stone-900 dark:hover:bg-stone-100" disabled={isSubmitting}>
							{isSubmitting ? "Menyiapkan draft..." : "Buka Draft Email"}
						</button>
					</form>
				</div>
			</div>

			<div class="space-y-5 lg:col-span-2">
				{#each [
					{ icon: MailIcon, title: "Email", body: "hello@paygate.id", helper: "Pertanyaan umum, partnership, dan sales." },
					{ icon: BugIcon, title: "Support Teknis", body: "support@paygate.id", helper: "Untuk bug, issue webhook, dan troubleshooting transaksi." },
					{ icon: GithubIcon, title: "GitHub", body: "github.com/paygate-id", helper: "Feature request dan bug report dapat dibuka sebagai issue." },
					{ icon: Clock3Icon, title: "Waktu Respons", body: "24 jam kerja", helper: "Senin sampai Jumat, 09:00 - 17:00 WIB." }
				] as item, index}
					<div class={`reveal ${index > 0 ? `reveal-d${index}` : ""} rounded-[24px] border border-stone-200/60 bg-white/70 p-6 dark:border-white/[0.08] dark:bg-white/[0.04]`}>
						<div class="mb-4 flex items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-white/10 dark:text-stone-200">
								<svelte:component this={item.icon} class="size-[18px]" />
							</div>
							<div>
								<div class="text-[15px] font-bold">{item.title}</div>
								<div class="text-[14px] text-emerald-600 dark:text-emerald-400">{item.body}</div>
							</div>
						</div>
						<p class="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">{item.helper}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<section class="relative py-20 md:py-28">
	<div class="absolute inset-0 bg-stone-900/[0.03] dark:bg-white/[0.02]"></div>
	<div class="relative z-10 mx-auto max-w-3xl px-5 md:px-8">
		<div class="mb-12 text-center">
			<div class="reveal mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-1 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
				<HelpCircleIcon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">FAQ</span>
			</div>
			<h2 class="reveal text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Pertanyaan yang Sering Ditanyakan</h2>
		</div>
		<div class="reveal reveal-d1 space-y-3">
			{#each contactFaqs as faq, index}
				<div class="overflow-hidden rounded-[20px] border border-stone-200/60 bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.04]">
					<button
						type="button"
						class="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
						on:click={() => (openFaq = openFaq === index ? -1 : index)}
					>
						<span class="pr-4 text-[15px] font-semibold">{faq.question}</span>
						<ChevronDownIcon class={`size-[18px] text-stone-400 transition-transform dark:text-stone-500 ${openFaq === index ? "rotate-180" : ""}`} />
					</button>
					<div class={`faq-content ${openFaq === index ? "open" : ""}`}>
						<div class="px-5 pb-4 text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">
							{faq.answer}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<MarketingFooter />
