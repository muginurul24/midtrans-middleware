import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
  {
    variants: {
      variant: {
        default: 'bg-stone-950 text-white hover:bg-stone-800 dark:bg-white dark:text-stone-950 dark:hover:bg-stone-100',
        secondary:
          'bg-white/85 text-stone-900 ring-1 ring-stone-200/70 hover:bg-white dark:bg-white/10 dark:text-stone-100 dark:ring-white/10 dark:hover:bg-white/15',
        ghost:
          'text-stone-700 hover:bg-stone-950/5 dark:text-stone-300 dark:hover:bg-white/10',
        outline:
          'bg-transparent text-stone-900 ring-1 ring-stone-300/80 hover:bg-stone-950/5 dark:text-stone-100 dark:ring-white/15 dark:hover:bg-white/10',
        destructive:
          'bg-red-600 text-white hover:bg-red-500 dark:bg-red-500 dark:text-white dark:hover:bg-red-400',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 px-6 text-sm',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
