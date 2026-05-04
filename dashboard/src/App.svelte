<script lang="ts">
	import { onMount } from "svelte";
	import { ModeWatcher } from "mode-watcher";
	import { Toaster } from "svelte-sonner";

	import { bootstrapSession, consumePendingRedirect, session, setPendingRedirect } from "$lib/auth/session";
	import { dashboardTabMeta, resolveDashboardTab } from "$lib/dashboard/tabs";
	import { currentPath, syncCurrentPath } from "$lib/spa";
	import { resolveRoute } from "$lib/router";

	function titleForPath(path: string) {
		if (path === "/login") return "Masuk — PayGate";
		if (path === "/forgot-password") return "Lupa Password — PayGate";
		if (path === "/reset-password") return "Reset Password — PayGate";
		if (path === "/register") return "Daftar — PayGate";
		if (path === "/verify") return "Verifikasi MFA — PayGate";
		if (path === "/about") return "Tentang — PayGate";
		if (path === "/contact") return "Kontak — PayGate";
		if (path === "/privacy") return "Privacy Policy — PayGate";
		if (path.startsWith("/app")) {
			const [, , tabValue] = path.split("/");
			const activeTab = resolveDashboardTab(tabValue);
			return dashboardTabMeta[activeTab].title;
		}
		return "PayGate — Payment Middleware untuk Multi-Toko";
	}

	function syncDocumentTitle(path: string) {
		if (typeof document === "undefined") return;
		document.title = titleForPath(path);
	}

	function replacePath(path: string) {
		history.replaceState({}, "", path);
		syncDocumentTitle(path);
		syncCurrentPath();
	}

	$: requestedPath = $currentPath;
	$: protectedPath = requestedPath.startsWith("/app");
	$: authPath =
		requestedPath === "/login" ||
		requestedPath === "/register" ||
		requestedPath === "/forgot-password" ||
		requestedPath === "/reset-password";
	$: verifyPath = requestedPath === "/verify";
	$: renderPath = requestedPath;

	$: if ($session.isReady) {
		if (protectedPath && !$session.user) {
			setPendingRedirect(requestedPath);
			renderPath = "/login";
		} else if (protectedPath && $session.user && !$session.mfa?.can_access_dashboard) {
			setPendingRedirect(requestedPath);
			renderPath = "/verify";
		} else if (verifyPath && !$session.user) {
			renderPath = "/login";
		} else if (verifyPath && $session.mfa?.can_access_dashboard) {
			renderPath = consumePendingRedirect();
		} else if (authPath && $session.user) {
			renderPath = $session.mfa?.can_access_dashboard ? consumePendingRedirect() : "/verify";
		}
	}

	$: routeMatch = resolveRoute(renderPath);
	$: componentPromise = routeMatch.load();

	$: syncDocumentTitle(renderPath);

	$: if ($session.isReady && renderPath !== requestedPath) {
		replacePath(renderPath);
	}

	onMount(() => {
		syncDocumentTitle(window.location.pathname);
		syncCurrentPath();
		void bootstrapSession({
			preferRefresh: !window.location.pathname.startsWith("/app"),
		});

		const handlePopState = () => syncCurrentPath();
		window.addEventListener("popstate", handlePopState);

		return () => window.removeEventListener("popstate", handlePopState);
	});
</script>

<ModeWatcher defaultMode="dark" themeColors={{ dark: "#161311", light: "#efe7dd" }} />
<Toaster richColors position="top-right" theme="dark" />
{#if !$session.isReady}
	<div class="grid-pattern flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
		<div class="panel-card flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] p-8 text-center">
			<div class="flex size-14 items-center justify-center rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-900">
				<span class="inline-block size-6 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-stone-900/20 dark:border-t-stone-900"></span>
			</div>
			<div class="space-y-1">
				<h1 class="text-lg font-bold tracking-tight">Menyiapkan sesi dashboard</h1>
				<p class="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
					Memeriksa token aktif dan kebijakan MFA sebelum workspace dibuka.
				</p>
			</div>
		</div>
	</div>
{:else}
	{#key renderPath}
		{#await componentPromise then module}
			<svelte:component this={module.default} route={routeMatch.route} />
		{/await}
	{/key}
{/if}
