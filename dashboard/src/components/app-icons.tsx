import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

type IconProps = ComponentProps<'svg'>

function BaseIcon({ children, className, viewBox = '0 0 24 24', ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn('size-4 shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox={viewBox}
      {...props}
    >
      {children}
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 12.5 9.2 16.7 19 7.5" />
    </BaseIcon>
  )
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4.25 20 19H4L12 4.25Z" />
      <path d="M12 9.25v4.5" />
      <path d="M12 16.75h.01" />
    </BaseIcon>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </BaseIcon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect height="12" rx="2.5" width="10" x="9" y="7" />
      <path d="M7 15H6a2 2 0 0 1-2-2V6.5A2.5 2.5 0 0 1 6.5 4H13a2 2 0 0 1 2 2v1" />
    </BaseIcon>
  )
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3" />
    </BaseIcon>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m4 11.5 8-6.5 8 6.5" />
      <path d="M6.5 10.5V19h11v-8.5" />
    </BaseIcon>
  )
}

export function LaptopIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect height="11" rx="2" width="14" x="5" y="4" />
      <path d="M3 18h18" />
      <path d="M9 18h6" />
    </BaseIcon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15.4 4.6a7.8 7.8 0 1 0 4 14.8A8.6 8.6 0 0 1 15.4 4.6Z" />
    </BaseIcon>
  )
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3 5.5 5.6v5.7c0 4.2 2.8 8 6.5 9.7 3.7-1.7 6.5-5.5 6.5-9.7V5.6L12 3Z" />
      <path d="m9.6 12.4 1.8 1.8 3.4-3.7" />
    </BaseIcon>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M20 7.5V4h-3.5" />
      <path d="M4 16.5V20h3.5" />
      <path d="M6.8 8.2A7 7 0 0 1 18.5 6" />
      <path d="M17.2 15.8A7 7 0 0 1 5.5 18" />
    </BaseIcon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.75v2.1M12 19.15v2.1M4.85 4.85l1.5 1.5M17.65 17.65l1.5 1.5M2.75 12h2.1M19.15 12h2.1M4.85 19.15l1.5-1.5M17.65 6.35l1.5-1.5" />
    </BaseIcon>
  )
}

export function WorkflowIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="6" cy="7" r="2.25" />
      <circle cx="18" cy="7" r="2.25" />
      <circle cx="12" cy="17" r="2.25" />
      <path d="M8 8.4 10.6 14M16 8.4 13.4 14M8.2 7h7.6" />
    </BaseIcon>
  )
}
