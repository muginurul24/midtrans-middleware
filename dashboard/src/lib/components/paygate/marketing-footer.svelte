<script lang="ts">
	import GithubIcon from "@lucide/svelte/icons/github";
	import MailIcon from "@lucide/svelte/icons/mail";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import TwitterIcon from "@lucide/svelte/icons/twitter";

	import { route } from "$lib/spa";
</script>

<footer class="border-t border-stone-200/60 py-12 dark:border-white/[0.06]">
	<div class="mx-auto max-w-6xl px-5 md:px-8">
		<div class="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4">
			<div class="col-span-2 md:col-span-1">
				<a href="/" use:route class="mb-4 flex items-center gap-2">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-white dark:text-stone-900">
						<ShieldCheckIcon class="size-4" />
					</div>
					<span class="font-display text-lg font-bold tracking-tight">PayGate</span>
				</a>
				<p class="text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">
					Multi-tenant payment middleware untuk Midtrans Core API.
				</p>
			</div>

			<div>
				<h4 class="mb-4 text-[13px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
					Produk
				</h4>
				<ul class="space-y-2.5">
					<li><a href="/#fitur" class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Fitur</a></li>
					<li><a href="/#cara-kerja" class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Cara Kerja</a></li>
					<li><a href="/#keamanan" class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Keamanan</a></li>
				</ul>
			</div>

			<div>
				<h4 class="mb-4 text-[13px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
					Perusahaan
				</h4>
				<ul class="space-y-2.5">
					<li><a href="/about" use:route class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Tentang</a></li>
					<li><a href="/contact" use:route class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Kontak</a></li>
					<li><a href="/privacy" use:route class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Privacy Policy</a></li>
				</ul>
			</div>

			<div>
				<h4 class="mb-4 text-[13px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
					Developer
				</h4>
				<ul class="space-y-2.5">
					<li><a href="/#developer" class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Dokumentasi API</a></li>
					<li><a href="/app/docs" use:route class="text-[14px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100">Status Mapping</a></li>
				</ul>
			</div>
		</div>

		<div class="flex flex-col items-center justify-between gap-4 border-t border-stone-200/60 pt-8 dark:border-white/[0.06] md:flex-row">
			<p class="text-[13px] text-stone-400 dark:text-stone-500">
				© 2026 PayGate. Multi-tenant payment middleware.
			</p>
			<div class="flex items-center gap-4">
				<a href="https://github.com/paygate-id" target="_blank" rel="noreferrer" class="text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300">
					<GithubIcon class="size-[18px]" />
				</a>
				<a href="https://x.com/paygate_id" target="_blank" rel="noreferrer" class="text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300">
					<TwitterIcon class="size-[18px]" />
				</a>
				<a href="mailto:hello@paygate.id" class="text-stone-400 transition-colors hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300">
					<MailIcon class="size-[18px]" />
				</a>
			</div>
		</div>
	</div>
</footer>
