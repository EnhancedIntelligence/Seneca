'use client'

import React, { createContext, useContext, useMemo, useRef, useState } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

interface DropdownContextValue {
  isOpen: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const DropdownMenuContext = createContext<DropdownContextValue | null>(null)

export function DropdownMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  const [isOpen, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const value = useMemo(() => ({ isOpen, setOpen, triggerRef }), [isOpen])

  return (
    <DropdownMenuContext.Provider value={value}>
      <div className={cn('relative inline-block', className)}>{children}</div>
    </DropdownMenuContext.Provider>
  )
}

function useDropdownMenu() {
  const ctx = useContext(DropdownMenuContext)
  if (!ctx) throw new Error('DropdownMenu components must be used within <DropdownMenu>')
  return ctx
}

export function DropdownMenuTrigger({
  asChild = false,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { isOpen, setOpen, triggerRef } = useDropdownMenu()
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={triggerRef as any}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      onClick={(e: any) => {
        props.onClick?.(e)
        setOpen(!isOpen)
      }}
      className={className}
      {...(asChild ? {} : (props as any))}
    >
      {children}
    </Comp>
  )
}

export function DropdownMenuContent({
  children,
  className,
  align = 'start',
  onMouseLeave,
}: {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'end'
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>
}) {
  const { isOpen, setOpen } = useDropdownMenu()

  if (!isOpen) return null

  return (
    <div
      role="menu"
      className={cn(
        'absolute z-50 mt-2 min-w-[12rem] rounded-md border p-1 shadow-lg outline-none',
        'bg-zinc-900 border-white/10 text-white',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}
      onMouseLeave={(e) => {
        onMouseLeave?.(e)
        // Close when cursor leaves the content area (simple UX)
        setOpen(false)
      }}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const { setOpen } = useDropdownMenu()
  return (
    <button
      role="menuitem"
      className={cn(
        'w-full text-left px-3 py-2 rounded-md outline-none',
        'hover:bg-white/10 focus:bg-white/10',
        className
      )}
      onClick={() => {
        onClick?.()
        setOpen(false)
      }}
    >
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-3 py-2 text-xs uppercase tracking-wider text-white/60', className)}>{children}</div>
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('my-1 h-px bg-white/10', className)} />
}

export function DropdownMenuCheckboxItem({
  children,
  checked = false,
  onCheckedChange,
  className,
}: {
  children: React.ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}) {
  return (
    <button
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cn(
        'w-full text-left px-3 py-2 rounded-md outline-none',
        'flex items-center gap-2',
        'hover:bg-white/10 focus:bg-white/10',
        className
      )}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span
        aria-hidden
        className={cn(
          'inline-flex size-4 items-center justify-center rounded-[3px] border',
          checked ? 'bg-violet-600 border-violet-600' : 'border-white/30'
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-white">
            <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </button>
  )
}


