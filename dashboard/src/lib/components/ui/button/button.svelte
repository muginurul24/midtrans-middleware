<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const buttonVariants = tv({
		base: "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-4xl border bg-clip-padding text-sm font-semibold focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px aria-invalid:ring-3 [&_svg:not([class*='size-'])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap shadow-sm transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				default: "border-primary/70 bg-primary text-primary-foreground shadow-[0_18px_36px_-22px_color-mix(in_oklab,var(--primary)_76%,transparent)] hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_24px_46px_-24px_color-mix(in_oklab,var(--primary)_80%,transparent)]",
				outline: "border-border/80 bg-background/94 text-foreground hover:-translate-y-0.5 hover:border-foreground/12 hover:bg-muted/80 hover:text-foreground dark:bg-background/40 dark:hover:bg-input/30 aria-expanded:bg-muted aria-expanded:text-foreground",
				secondary: "border-secondary/80 bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/85 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
				ghost: "border-transparent bg-transparent shadow-none hover:bg-muted/85 hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
				destructive: "border-destructive/70 bg-destructive text-destructive-foreground shadow-[0_18px_36px_-22px_color-mix(in_oklab,var(--destructive)_70%,transparent)] hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-[0_24px_46px_-24px_color-mix(in_oklab,var(--destructive)_78%,transparent)] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
				link: "border-transparent bg-transparent text-primary shadow-none underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
				xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
