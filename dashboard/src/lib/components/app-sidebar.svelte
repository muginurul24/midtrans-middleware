<script lang="ts">
	import ArrowLeftRightIcon from "@lucide/svelte/icons/arrow-left-right";
	import BookOpenIcon from "@lucide/svelte/icons/book-open";
	import ChevronUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import KeyRoundIcon from "@lucide/svelte/icons/key-round";
	import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
	import ScrollTextIcon from "@lucide/svelte/icons/scroll-text";
	import SettingsIcon from "@lucide/svelte/icons/settings";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import StoreIcon from "@lucide/svelte/icons/store";
	import UserRoundIcon from "@lucide/svelte/icons/user-round";
	import WebhookIcon from "@lucide/svelte/icons/webhook";
	import type { ComponentProps } from "svelte";
	import type { User } from "$lib/api/types";

	import * as Avatar from "$lib/components/ui/avatar/index.js";
	import type { DashboardTab } from "$lib/dashboard/tabs";
	import * as Sidebar from "$lib/components/ui/sidebar";
	import { route as routeAction } from "$lib/spa";

	let {
		activeTab = "overview",
		user = null,
		webhookFailures = 0,
		variant = "inset",
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		activeTab?: DashboardTab;
		user?: User | null;
		webhookFailures?: number;
	} = $props();

	const mainItems = [
		{ label: "Overview", href: "/app", key: "overview", icon: LayoutDashboardIcon },
		{ label: "Toko", href: "/app/stores", key: "stores", icon: StoreIcon },
		{ label: "Transaksi", href: "/app/transactions", key: "transactions", icon: ArrowLeftRightIcon },
	];

	const monitoringItems = [
		{ label: "Audit Log", href: "/app/audit", key: "audit", icon: ScrollTextIcon },
		{ label: "Webhook", href: "/app/webhooks", key: "webhooks", icon: WebhookIcon },
		{ label: "API Token", href: "/app/stores", key: "stores", icon: KeyRoundIcon },
	];

	const secondaryItems = [
		{ label: "Dokumentasi", href: "/app/docs", key: "docs", icon: BookOpenIcon },
		{ label: "Profil & Sesi", href: "/app/profile", key: "profile", icon: UserRoundIcon },
		{ label: "Pengaturan", href: "/app/stores", key: "stores", icon: SettingsIcon },
	];
</script>

<Sidebar.Root collapsible="offcanvas" {variant} {...restProps}>
	<Sidebar.Header class="border-b border-stone-200/60 px-5 py-4 dark:border-white/10">
		<div class="flex items-center gap-3">
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-white dark:bg-white dark:text-stone-900">
				<ShieldCheckIcon class="size-[18px]" />
			</div>
			<span class="font-display text-lg font-bold tracking-tight">PayGate</span>
		</div>
	</Sidebar.Header>

	<Sidebar.Content class="px-3 py-4">
		<Sidebar.Group>
			<Sidebar.GroupLabel class="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
				Utama
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent class="mt-2 space-y-1">
				{#each mainItems as item}
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={activeTab === item.key} tooltipContent={item.label}>
								{#snippet child({ props })}
									<a href={item.href} use:routeAction {...props}>
										<item.icon />
										<span>{item.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				{/each}
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group class="mt-6">
			<Sidebar.GroupLabel class="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
				Monitoring
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent class="mt-2 space-y-1">
				{#each monitoringItems as item}
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={activeTab === item.key} tooltipContent={item.label}>
								{#snippet child({ props })}
									<a href={item.href} use:routeAction {...props}>
										<item.icon />
										<span>{item.label}</span>
										{#if item.key === "webhooks" && webhookFailures > 0}
											<span class="ml-auto h-2 w-2 rounded-full bg-orange-400 pulse-dot"></span>
										{/if}
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				{/each}
			</Sidebar.GroupContent>
		</Sidebar.Group>

		<Sidebar.Group class="mt-6">
			<Sidebar.GroupLabel class="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">
				Lainnya
			</Sidebar.GroupLabel>
			<Sidebar.GroupContent class="mt-2 space-y-1">
				{#each secondaryItems as item}
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={activeTab === item.key} tooltipContent={item.label}>
								{#snippet child({ props })}
									<a href={item.href} use:routeAction {...props}>
										<item.icon />
										<span>{item.label}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</Sidebar.Menu>
				{/each}
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer class="border-t border-stone-200/60 p-3 dark:border-white/10">
		<a
			href="/app/profile"
			use:routeAction
			class={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
				activeTab === "profile"
					? "bg-stone-100 dark:bg-white/10"
					: "hover:bg-stone-100 dark:hover:bg-white/5"
			}`}
		>
			<Avatar.Root class="size-8 rounded-full">
				<Avatar.Fallback
					class="bg-gradient-to-br from-stone-700 to-stone-900 text-sm font-bold text-white dark:from-stone-200 dark:to-stone-400 dark:text-stone-900"
				>
					{user?.name?.slice(0, 1).toUpperCase() ?? "U"}
				</Avatar.Fallback>
			</Avatar.Root>
			<div class="min-w-0 flex-1">
				<div class="truncate text-sm font-semibold">{user?.name ?? "Operator Dashboard"}</div>
				<div class="truncate text-[12px] text-stone-500 dark:text-stone-400">{user?.email ?? "Sesi belum aktif"}</div>
			</div>
			<ChevronUpDownIcon class="size-4 text-stone-400 dark:text-stone-500" />
		</a>
	</Sidebar.Footer>
</Sidebar.Root>
