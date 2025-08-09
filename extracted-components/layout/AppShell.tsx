'use client'

import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * AppShell Component
 * 
 * Main application wrapper that provides the base layout structure.
 * Manages navigation state and provides a consistent shell for all views.
 * 
 * @component
 * @example
 * ```tsx
 * <AppShell
 *   topBar={<TopBar />}
 *   sideMenu={<SideMenu />}
 *   bottomNav={<QuickEntry />}
 * >
 *   <MainContent />
 * </AppShell>
 * ```
 */

export interface AppShellProps {
  /** Content to render in the main area */
  children: ReactNode
  /** Top navigation bar component */
  topBar?: ReactNode
  /** Side menu component */
  sideMenu?: ReactNode
  /** Bottom navigation or input component */
  bottomNav?: ReactNode
  /** Whether the side menu is open */
  isSideMenuOpen?: boolean
  /** Callback when overlay is clicked */
  onOverlayClick?: () => void
  /** Additional CSS classes for the container */
  className?: string
  /** Background gradient or color */
  backgroundVariant?: 'default' | 'capture' | 'dashboard'
}

export function AppShell({
  children,
  topBar,
  sideMenu,
  bottomNav,
  isSideMenuOpen = false,
  onOverlayClick,
  className,
  backgroundVariant = 'default'
}: AppShellProps) {
  const backgroundClasses = {
    default: 'bg-gradient-to-br from-zinc-900 to-black',
    capture: 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800',
    dashboard: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900'
  }

  return (
    <div
      className={cn(
        'relative h-screen w-full overflow-hidden',
        backgroundClasses[backgroundVariant],
        className
      )}
    >
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 pointer-events-none" />
      
      {/* Gradient Orbs for Visual Interest */}
      <div className="absolute top-0 -left-40 w-80 h-80 bg-violet-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
      <div className="absolute top-0 -right-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 left-20 w-80 h-80 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />

      {/* Main Content Container */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Top Bar */}
        {topBar && (
          <div className="relative z-30">
            {topBar}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <div className="h-full overflow-y-auto">
            {children}
          </div>
        </div>

        {/* Bottom Navigation */}
        {bottomNav && (
          <div className="relative z-20">
            {bottomNav}
          </div>
        )}
      </div>

      {/* Side Menu Overlay */}
      {isSideMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Side Menu */}
      {sideMenu && (
        <div
          className={cn(
            'fixed top-0 left-0 h-full z-50',
            'transition-transform duration-300 ease-out',
            isSideMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sideMenu}
        </div>
      )}
    </div>
  )
}