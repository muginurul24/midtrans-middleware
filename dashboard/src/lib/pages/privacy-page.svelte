<script lang="ts">
	import FileTextIcon from "@lucide/svelte/icons/file-text";
	import MailIcon from "@lucide/svelte/icons/mail";
	import { onMount } from "svelte";

	import MarketingFooter from "$lib/components/paygate/marketing-footer.svelte";
	import MarketingNavbar from "$lib/components/paygate/marketing-navbar.svelte";
	import { privacySections } from "$lib/content/paygate";

	export let route: unknown = undefined;
	$: route;

	let currentSection = privacySections[0]?.id ?? "pendahuluan";

	onMount(() => {
		const handleScroll = () => {
			for (const section of privacySections) {
				const element = document.getElementById(section.id);
				if (element && window.scrollY >= element.offsetTop - 140) {
					currentSection = section.id;
				}
			}
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	});
</script>

<svelte:head>
	<title>Privacy Policy — PayGate</title>
</svelte:head>

<MarketingNavbar mode="pages" activePage="privacy" />

<main class="pt-[72px]">
	<div class="border-b border-stone-200/60 dark:border-white/[0.06]">
		<div class="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
			<div class="mb-4 inline-flex items-center gap-2 rounded-full bg-stone-200 px-3.5 py-1 text-stone-700 dark:bg-white/10 dark:text-stone-300">
				<FileTextIcon class="size-[14px]" />
				<span class="text-[12px] font-bold uppercase tracking-wider">Legal</span>
			</div>
			<h1 class="mb-3 text-3xl font-extrabold tracking-[-0.03em] md:text-4xl">Privacy Policy</h1>
			<p class="text-[15px] text-stone-500 dark:text-stone-400">Terakhir diperbarui: 4 Mei 2026</p>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-5 md:px-8">
		<div class="lg:grid lg:grid-cols-12 lg:gap-12">
			<aside class="hidden lg:col-span-3 lg:block">
				<div class="sticky top-[96px]">
					<nav class="space-y-1">
						<div class="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
							Daftar Isi
						</div>
						{#each privacySections as section}
							<a
								href={`#${section.id}`}
								class={`block rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${currentSection === section.id ? "bg-stone-200/60 font-semibold text-stone-900 dark:bg-white/10 dark:text-stone-100" : "text-stone-500 hover:bg-black/5 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/5 dark:hover:text-stone-100"}`}
							>
								{section.title.replace(/^\d+\.\s*/, "")}
							</a>
						{/each}
					</nav>
				</div>
			</aside>

			<article class="max-w-none pb-20 lg:col-span-9">
				<div class="space-y-10 py-12 text-[15px] leading-[1.8] text-stone-700 dark:text-stone-300">
					{#each privacySections as section}
						<section id={section.id}>
							<h2 class="mb-4 text-[22px] font-bold text-stone-900 dark:text-stone-100">{section.title}</h2>
							{#each section.paragraphs as paragraph}
								<p class="mt-3">{paragraph}</p>
							{/each}
							{#if section.id === "kontak-privacy"}
								<div class="mt-4 rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/[0.08] dark:bg-white/[0.04]">
									<div class="mb-3 flex items-center gap-3">
										<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-white/10 dark:text-stone-200">
											<MailIcon class="size-[18px]" />
										</div>
										<div>
											<div class="text-[15px] font-bold">Privacy & Data</div>
											<a href="mailto:privacy@paygate.id" class="text-[14px] text-emerald-600 hover:underline dark:text-emerald-400">
												privacy@paygate.id
											</a>
										</div>
									</div>
									<p class="text-[13px] text-stone-500 dark:text-stone-400">
										Kami menargetkan respons untuk permintaan terkait data dan privasi dalam 14 hari kerja.
									</p>
								</div>
							{/if}
						</section>
					{/each}
				</div>
			</article>
		</div>
	</div>
</main>

<MarketingFooter />
