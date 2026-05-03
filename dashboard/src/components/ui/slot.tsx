import * as React from "react"

import { cn } from "@/lib/utils"

type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode
}

function composeEventHandlers<E>(
  slotHandler?: (event: E) => void,
  childHandler?: (event: E) => void,
) {
  return (event: E) => {
    childHandler?.(event)
    slotHandler?.(event)
  }
}

function mergeProps(
  slotProps: Record<string, unknown>,
  childProps: Record<string, unknown>,
) {
  const merged: Record<string, unknown> = {
    ...slotProps,
    ...childProps,
  }

  if (slotProps.className || childProps.className) {
    merged.className = cn(slotProps.className as string | undefined, childProps.className as string | undefined)
  }

  if (slotProps.style || childProps.style) {
    merged.style = {
      ...(slotProps.style as React.CSSProperties | undefined),
      ...(childProps.style as React.CSSProperties | undefined),
    }
  }

  for (const key of Object.keys(slotProps)) {
    if (!key.startsWith("on")) {
      continue
    }

    const slotHandler = slotProps[key]
    const childHandler = childProps[key]

    if (typeof slotHandler === "function" || typeof childHandler === "function") {
      merged[key] = composeEventHandlers(slotHandler as (event: unknown) => void, childHandler as (event: unknown) => void)
    }
  }

  return merged
}

export function Slot({ children, ...props }: SlotProps) {
  if (!React.isValidElement(children)) {
    return null
  }

  return React.cloneElement(
    children,
    mergeProps(props as Record<string, unknown>, children.props as Record<string, unknown>),
  )
}
