<script lang="ts">
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";

	import OTPForm from "$lib/components/otp-form.svelte";
	import ThemeToggle from "$lib/components/paygate/theme-toggle.svelte";
	import { route as routeAction } from "$lib/spa";

	export let route: unknown = undefined;
	$: route;
</script>

<svelte:head>
	<title>Verifikasi MFA — PayGate</title>
</svelte:head>

<div class="grid-pattern flex min-h-screen items-center justify-center px-5 py-10">
	<a href="/" use:routeAction class="absolute left-5 top-5 flex items-center gap-2.5">
		<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-900">
			<ShieldCheckIcon class="size-5" />
		</div>
		<span class="font-display text-xl font-bold tracking-tight">PayGate</span>
	</a>
	<ThemeToggle className="absolute right-5 top-5" />

	<div class="w-full max-w-sm">
		<OTPForm />
	</div>
</div>
