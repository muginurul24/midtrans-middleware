<script lang="ts" generics="TFilters">
	import BookmarkIcon from "@lucide/svelte/icons/bookmark";
	import BookmarkPlusIcon from "@lucide/svelte/icons/bookmark-plus";
	import CheckIcon from "@lucide/svelte/icons/check";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import XIcon from "@lucide/svelte/icons/x";

	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import type { DashboardSavedView } from "$lib/dashboard/saved-views";

	export let title = "View Tersimpan";
	export let description =
		"Simpan kombinasi filter yang sering dipakai agar investigasi berikutnya tidak perlu mengulang query dari awal.";
	export let views: DashboardSavedView<TFilters>[] = [];
	export let activeViewId = "";
	export let defaultName = "View Baru";
	export let saveDisabled = false;
	export let onSave: (name: string) => void | Promise<void> = () => {};
	export let onApply: (view: DashboardSavedView<TFilters>) => void | Promise<void> = () => {};
	export let onDelete: (view: DashboardSavedView<TFilters>) => void | Promise<void> = () => {};

	let editing = false;
	let draftName = "";

	function startEditing() {
		draftName = defaultName;
		editing = true;
	}

	async function submit() {
		await onSave(draftName.trim() || defaultName);
		editing = false;
		draftName = "";
	}

	function cancel() {
		editing = false;
		draftName = "";
	}
</script>

<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
		<div class="space-y-1">
			<div class="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
				<BookmarkIcon class="size-4" />
				{title}
			</div>
			<p class="text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
				{description}
			</p>
		</div>

		{#if editing}
			<div class="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[340px] sm:flex-row">
				<Input bind:value={draftName} class="rounded-xl" placeholder={defaultName} />
				<Button type="button" class="rounded-xl" disabled={saveDisabled} onclick={() => void submit()}>
					<CheckIcon class="size-4" />
					Simpan
				</Button>
				<Button type="button" variant="outline" class="rounded-xl" onclick={cancel}>
					<XIcon class="size-4" />
					Batal
				</Button>
			</div>
		{:else}
			<Button type="button" variant="outline" class="rounded-xl" disabled={saveDisabled} onclick={startEditing}>
				<BookmarkPlusIcon class="size-4" />
				Simpan View
			</Button>
		{/if}
	</div>

	<div class="mt-4 flex flex-wrap gap-2">
		{#if views.length === 0}
			<Badge variant="outline" class="rounded-full px-3 py-1 text-[12px] font-medium text-stone-500 dark:text-stone-400">
				Belum ada view tersimpan
			</Badge>
		{:else}
			{#each views as view}
				<div class="inline-flex items-center gap-1 rounded-full border border-stone-200/60 bg-white/80 p-1 dark:border-white/10 dark:bg-black/20">
					<Button
						type="button"
						variant={activeViewId === view.id ? "default" : "ghost"}
						size="sm"
						class="rounded-full px-3"
						onclick={() => void onApply(view)}
					>
						{view.name}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						class="rounded-full text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
						onclick={() => void onDelete(view)}
					>
						<Trash2Icon class="size-3.5" />
					</Button>
				</div>
			{/each}
		{/if}
	</div>
</div>
