<script lang="ts">
	import type { DashboardMetric } from "$lib/content/paygate";

	export let volumeData: Array<{ day: string; total: number; success: number }> = [];
	export let paymentMix: Array<{ name: string; value: number; color: string }> = [];

	const maxValue = Math.max(...volumeData.map((item) => item.total), 1);

	let donutStyle = "";

	$: {
		let current = 0;
		const segments = paymentMix.map((item) => {
			const start = current;
			current += item.value;
			return `${item.color} ${start}% ${current}%`;
		});
		donutStyle = `background: conic-gradient(${segments.join(", ")});`;
	}
</script>

<div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
	<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5 lg:col-span-2">
		<div class="mb-6 flex items-center justify-between gap-4">
			<div>
				<h3 class="text-[15px] font-semibold">Volume Transaksi</h3>
				<p class="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">Jumlah transaksi per hari</p>
			</div>
			<div class="flex items-center gap-4 text-[12px] font-medium">
				<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-stone-900 dark:bg-white"></span>Transaksi</span>
				<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>Berhasil</span>
			</div>
		</div>

		<div class="grid h-[280px] grid-cols-7 items-end gap-4 rounded-[18px] bg-stone-50/80 px-3 py-4 dark:bg-black/20">
			{#each volumeData as item, index}
				<div class="animate-fade-in-up flex flex-col items-center justify-end gap-3" style={`animation-delay:${index * 60}ms;`}>
					<div class="flex h-full items-end gap-1.5">
						<div
							class="w-5 rounded-t-md bg-stone-900 shadow-sm dark:bg-white"
							style={`height:${(item.total / maxValue) * 190}px;`}
						></div>
						<div
							class="w-5 rounded-t-md bg-emerald-500 shadow-sm"
							style={`height:${(item.success / maxValue) * 190}px;`}
						></div>
					</div>
					<div class="text-[12px] font-medium text-stone-500 dark:text-stone-400">{item.day}</div>
				</div>
			{/each}
		</div>
	</div>

	<div class="rounded-[20px] border border-stone-200/60 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
		<div class="mb-6">
			<h3 class="text-[15px] font-semibold">Metode Pembayaran</h3>
			<p class="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">Distribusi 7 hari terakhir</p>
		</div>

		<div class="flex items-center justify-center pb-4">
			<div class="relative h-44 w-44 rounded-full" style={donutStyle}>
				<div class="absolute inset-[22px] rounded-full bg-[var(--card)] shadow-inner"></div>
				<div class="absolute inset-0 flex flex-col items-center justify-center text-center">
					<span class="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 dark:text-stone-500">Dominan</span>
					<span class="mt-1 text-[15px] font-bold">{paymentMix[0]?.name}</span>
				</div>
			</div>
		</div>

		<div class="space-y-2.5">
			{#each paymentMix as item}
				<div class="flex items-center justify-between text-[13px]">
					<span class="flex items-center gap-2">
						<span class="h-2.5 w-2.5 rounded-full" style={`background:${item.color};`}></span>
						{item.name}
					</span>
					<span class="font-semibold">{item.value}%</span>
				</div>
			{/each}
		</div>
	</div>
</div>
