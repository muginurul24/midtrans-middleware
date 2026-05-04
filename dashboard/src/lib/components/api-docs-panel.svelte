<script lang="ts">
	import CopyIcon from "@lucide/svelte/icons/copy";
	import FileJsonIcon from "@lucide/svelte/icons/file-json";
	import GlobeIcon from "@lucide/svelte/icons/globe";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import { toast } from "svelte-sonner";

	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Separator from "$lib/components/ui/separator";
	import * as Tabs from "$lib/components/ui/tabs";
	import {
		apiDocSections,
		type ApiDocLanguage,
		type ApiDocMethod,
	} from "$lib/content/paygate-api";

	let activeSection = apiDocSections[0]?.id ?? "";
	const responseEnvelopeExample = `{
  "success": true,
  "data": {
    "..."
  }
}`;

	function methodClass(method: ApiDocMethod) {
		switch (method) {
			case "GET":
				return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300";
			case "POST":
				return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300";
			case "PATCH":
				return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300";
			case "DELETE":
				return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300";
		}
	}

	async function copyCode(code: string, label: string) {
		try {
			await navigator.clipboard.writeText(code);
			toast.success(`${label} berhasil disalin.`);
		} catch {
			toast.error(`Gagal menyalin ${label}.`);
		}
	}

	function formatPayload(value: unknown) {
		if (value === null || value === undefined) return "";
		return JSON.stringify(value, null, 2);
	}

	function defaultLanguage(examples: { language: ApiDocLanguage }[]) {
		return examples.some((item) => item.language === "javascript") ? "javascript" : examples[0]?.language;
	}
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
		<div class="rounded-[24px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
			<div class="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
				<GlobeIcon class="size-4" />
				Base URL
			</div>
			<code class="mt-3 block rounded-2xl bg-stone-950 px-4 py-3 font-mono text-[13px] text-stone-100">
				https://paygate.digixsolution.net
			</code>
			<p class="mt-3 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
				Pakai domain ini untuk integrasi production. Untuk local dev, ganti ke host backend Anda sendiri.
			</p>
		</div>

		<div class="rounded-[24px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
			<div class="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
				<ShieldCheckIcon class="size-4" />
				Model Auth
			</div>
			<ul class="mt-3 space-y-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
				<li><span class="font-semibold">Store API token</span> untuk charge dan status transaksi merchant.</li>
				<li><span class="font-semibold">Dashboard Bearer token</span> untuk semua endpoint operator dashboard.</li>
				<li><span class="font-semibold">Signature Midtrans</span> hanya untuk inbound webhook dari Midtrans.</li>
			</ul>
		</div>

		<div class="rounded-[24px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
			<div class="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
				<FileJsonIcon class="size-4" />
				Response Envelope
			</div>
			<pre class="mt-3 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-[12px] text-emerald-300">{responseEnvelopeExample}</pre>
			<p class="mt-3 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
				Hampir semua endpoint JSON mengembalikan struktur `success + data`. Endpoint `204 No Content` memang tidak punya body.
			</p>
		</div>
	</div>

	<Tabs.Root bind:value={activeSection} class="gap-4">
		<Tabs.List variant="line" class="h-auto flex-wrap rounded-2xl bg-white/70 p-1.5 dark:bg-white/5">
			{#each apiDocSections as section}
				<Tabs.Trigger value={section.id} class="rounded-xl px-4 py-2 text-[13px] font-semibold">
					{section.label}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>

		{#each apiDocSections as section}
			<Tabs.Content value={section.id} class="space-y-4">
				<div class="rounded-[24px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
					<h2 class="text-[18px] font-bold tracking-tight">{section.label}</h2>
					<p class="mt-1 text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">
						{section.description}
					</p>
				</div>

				{#each section.routes as route}
					<Card.Root class="panel-card border-none shadow-none">
						<Card.Header class="gap-3">
							<div class="flex flex-wrap items-center gap-2">
								<Badge variant="outline" class="rounded-full uppercase tracking-wider">Route</Badge>
								<code class="rounded-full bg-stone-950 px-3 py-1 font-mono text-[12px] text-stone-100">
									{route.path}
								</code>
							</div>
							<Card.Description class="text-[13px] leading-relaxed">
								{route.description}
							</Card.Description>
						</Card.Header>

						<Card.Content class="space-y-5">
							{#each route.operations as operation, index}
								{#if index > 0}
									<Separator.Root />
								{/if}

								<section class="space-y-4">
									<div class="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
										<div class="space-y-2">
											<div class="flex flex-wrap items-center gap-2">
												<span class={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${methodClass(operation.method)}`}>
													{operation.method}
												</span>
												<Badge variant="secondary" class="rounded-full">
													{operation.audience}
												</Badge>
												<Badge variant="outline" class="rounded-full">
													{operation.authLabel}
												</Badge>
											</div>
											<div>
												<h3 class="text-[16px] font-semibold tracking-tight">{operation.summary}</h3>
												<p class="mt-1 text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
													{operation.description}
												</p>
											</div>
										</div>

										<div class="rounded-2xl border border-stone-200/60 bg-white/80 px-4 py-3 text-[12px] text-stone-500 dark:border-white/10 dark:bg-black/20 dark:text-stone-400 xl:max-w-[280px]">
											<div class="font-semibold text-stone-700 dark:text-stone-200">Response sukses</div>
											<div class="mt-1">{operation.successStatus}</div>
										</div>
									</div>

									<div class="grid gap-3 xl:grid-cols-2">
										<div class="rounded-2xl border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
											<div class="text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
												Headers
											</div>
											<ul class="mt-3 space-y-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
												{#each operation.requestHeaders as header}
													<li><code class="font-mono text-[12px]">{header}</code></li>
												{/each}
											</ul>
										</div>

										{#if operation.bodyFields?.length}
											<div class="rounded-2xl border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
												<div class="text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
													Body Fields
												</div>
												<ul class="mt-3 space-y-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
													{#each operation.bodyFields as field}
														<li>{field}</li>
													{/each}
												</ul>
											</div>
										{:else if operation.queryParams?.length}
											<div class="rounded-2xl border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
												<div class="text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
													Query Params
												</div>
												<ul class="mt-3 space-y-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
													{#each operation.queryParams as query}
														<li>{query}</li>
													{/each}
												</ul>
											</div>
										{/if}

										{#if operation.pathParams?.length}
											<div class="rounded-2xl border border-stone-200/60 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
												<div class="text-[12px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
													Path Params
												</div>
												<ul class="mt-3 space-y-2 text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
													{#each operation.pathParams as param}
														<li>{param}</li>
													{/each}
												</ul>
											</div>
										{/if}

										{#if operation.notes?.length}
											<div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
												<div class="text-[12px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
													Catatan Implementasi
												</div>
												<ul class="mt-3 space-y-2 text-[13px] leading-relaxed text-amber-800 dark:text-amber-300">
													{#each operation.notes as note}
														<li>{note}</li>
													{/each}
												</ul>
											</div>
										{/if}
									</div>

									<Tabs.Root value={defaultLanguage(operation.examples)} class="gap-3">
										<Tabs.List variant="line" class="h-auto flex-wrap rounded-2xl bg-stone-100/90 p-1.5 dark:bg-white/5">
											{#each operation.examples as example}
												<Tabs.Trigger value={example.language} class="rounded-xl px-3 py-1.5 text-[12px] font-semibold">
													{example.label}
												</Tabs.Trigger>
											{/each}
										</Tabs.List>

										{#each operation.examples as example}
											<Tabs.Content value={example.language}>
												<div class="overflow-hidden rounded-2xl border border-stone-200/60 bg-stone-950 dark:border-white/10">
													<div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
														<div>
															<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
																Request Example
															</div>
															<div class="mt-1 text-[13px] font-medium text-stone-100">{example.label}</div>
														</div>
														<Button
															type="button"
															variant="outline"
															size="xs"
															class="rounded-full border-white/10 bg-white/5 text-stone-100 hover:bg-white/10"
															onclick={() => void copyCode(example.code, `${operation.summary} (${example.label})`)}
														>
															<CopyIcon class="size-3.5" />
															Copy
														</Button>
													</div>
													<pre class="overflow-x-auto p-4 text-[12px] leading-6 text-stone-200">{example.code}</pre>
												</div>
											</Tabs.Content>
										{/each}
									</Tabs.Root>

									<div class="overflow-hidden rounded-2xl border border-stone-200/60 bg-stone-950 dark:border-white/10">
										<div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
											<div>
												<div class="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
													Response
												</div>
												<div class="mt-1 text-[13px] font-medium text-stone-100">
													{operation.successStatus} · {operation.responseDescription}
												</div>
											</div>
											{#if operation.responseBody !== null && operation.responseBody !== undefined}
												<Button
													type="button"
													variant="outline"
													size="xs"
													class="rounded-full border-white/10 bg-white/5 text-stone-100 hover:bg-white/10"
													onclick={() => void copyCode(formatPayload(operation.responseBody), `${operation.summary} response`)}
												>
													<CopyIcon class="size-3.5" />
													Copy
												</Button>
											{/if}
										</div>

										{#if operation.responseBody === null || operation.responseBody === undefined}
											<div class="px-4 py-4 text-[13px] leading-relaxed text-stone-300">
												Endpoint ini mengembalikan <span class="font-semibold">No Content</span>. Frontend cukup menangkap status HTTP dan menyesuaikan state lokal.
											</div>
										{:else}
											<pre class="overflow-x-auto p-4 text-[12px] leading-6 text-emerald-300">{formatPayload(operation.responseBody)}</pre>
										{/if}
									</div>
								</section>
							{/each}
						</Card.Content>
					</Card.Root>
				{/each}
			</Tabs.Content>
		{/each}
	</Tabs.Root>
</div>
