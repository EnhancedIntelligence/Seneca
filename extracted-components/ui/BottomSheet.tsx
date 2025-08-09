'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * BottomSheet Component
 * 
 * A reusable bottom sheet component with gesture support and smooth animations.
 * Can be used for forms, menus, or any content that slides up from the bottom.
 * 
 * @component
 * @example
 * ```tsx
 * <BottomSheet
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Settings"
 *   height="half"
 * >
 *   <SettingsContent />
 * </BottomSheet>
 * ```
 */

export interface BottomSheetProps {
  /** Whether the sheet is open */
  isOpen: boolean
  /** Callback fired when sheet is closed */
  onClose: () => void
  /** Optional title for the sheet */
  title?: string
  /** Content to display in the sheet */
  children: React.ReactNode
  /** Height preset or custom height */
  height?: 'auto' | 'half' | 'full' | string
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Whether to show the drag handle */
  showDragHandle?: boolean
  /** Whether to close on overlay click */
  closeOnOverlayClick?: boolean
  /** Whether to close on escape key */
  closeOnEscape?: boolean
  /** Additional CSS classes for the sheet */
  className?: string
  /** Additional CSS classes for the overlay */
  overlayClassName?: string
  /** Whether the sheet is dismissible */
  dismissible?: boolean
  /** Custom header content */
  header?: React.ReactNode
  /** Custom footer content */
  footer?: React.ReactNode
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showCloseButton = true,
  showDragHandle = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  overlayClassName,
  dismissible = true,
  header,
  footer
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const isDragging = useRef<boolean>(false)

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape, dismissible])

  // Handle touch/mouse drag
  useEffect(() => {
    if (!showDragHandle || !isOpen || !dismissible) return

    const sheet = sheetRef.current
    const handle = dragHandleRef.current
    if (!sheet || !handle) return

    const handleStart = (e: TouchEvent | MouseEvent) => {
      isDragging.current = true
      startY.current = 'touches' in e ? e.touches[0].clientY : e.clientY
      currentY.current = 0
      sheet.style.transition = 'none'
    }

    const handleMove = (e: TouchEvent | MouseEvent) => {
      if (!isDragging.current) return
      
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY
      currentY.current = Math.max(0, y - startY.current)
      sheet.style.transform = `translateY(${currentY.current}px)`
    }

    const handleEnd = () => {
      if (!isDragging.current) return
      
      isDragging.current = false
      sheet.style.transition = ''
      
      // Close if dragged more than 100px down
      if (currentY.current > 100) {
        onClose()
      } else {
        sheet.style.transform = 'translateY(0)'
      }
    }

    // Touch events
    handle.addEventListener('touchstart', handleStart)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)
    
    // Mouse events
    handle.addEventListener('mousedown', handleStart)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)

    return () => {
      handle.removeEventListener('touchstart', handleStart)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      handle.removeEventListener('mousedown', handleStart)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
    }
  }, [isOpen, onClose, showDragHandle, dismissible])

  const getHeightClass = () => {
    switch (height) {
      case 'half':
        return 'max-h-[50vh]'
      case 'full':
        return 'max-h-[90vh]'
      case 'auto':
        return 'max-h-[85vh]'
      default:
        return height
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/70 backdrop-blur-sm z-40',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
          overlayClassName
        )}
        onClick={closeOnOverlayClick && dismissible ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-zinc-900/98 backdrop-blur-xl',
          'rounded-t-3xl shadow-2xl',
          'transition-transform duration-300 ease-out',
          getHeightClass(),
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
      >
        {/* Drag Handle */}
        {showDragHandle && (
          <div
            ref={dragHandleRef}
            className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <div className="w-12 h-1 bg-white/20 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || header || showCloseButton) && (
          <div className="sticky top-0 z-10 bg-zinc-900/98 backdrop-blur rounded-t-3xl border-b border-white/10">
            {header || (
              <div className="flex items-center justify-between p-5 pt-8">
                {title && (
                  <h2 id="bottom-sheet-title" className="text-lg font-semibold text-white">
                    {title}
                  </h2>
                )}
                {showCloseButton && dismissible && (
                  <button
                    onClick={onClose}
                    className="ml-auto w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain">
          <div className="p-5">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 bg-zinc-900/98 backdrop-blur border-t border-white/10 p-5">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}