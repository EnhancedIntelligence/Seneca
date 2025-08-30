"use client";

import React from "react";
import { Menu, User, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TopBar Component
 *
 * Header navigation bar with menu toggle and profile/action buttons.
 * Provides consistent top navigation across all app views.
 *
 * @component
 * @example
 * ```tsx
 * <TopBar
 *   onMenuClick={() => toggleSideMenu()}
 *   onProfileClick={() => openProfile()}
 *   title="Memory Vault"
 *   showNotificationBadge={true}
 * />
 * ```
 */

export interface TopBarProps {
  /** Callback fired when menu button is clicked */
  onMenuClick?: () => void;
  /** Callback fired when profile button is clicked */
  onProfileClick?: () => void;
  /** Callback fired when notification button is clicked */
  onNotificationClick?: () => void;
  /** Callback fired when settings button is clicked */
  onSettingsClick?: () => void;
  /** Optional title to display in the center */
  title?: string;
  /** Whether to show notification badge */
  showNotificationBadge?: boolean;
  /** Number to display in notification badge */
  notificationCount?: number;
  /** Whether the menu button is in open state */
  isMenuOpen?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use transparent background */
  transparent?: boolean;
}

export function TopBar({
  onMenuClick,
  onProfileClick,
  onNotificationClick,
  onSettingsClick,
  title,
  showNotificationBadge = false,
  notificationCount,
  isMenuOpen = false,
  className,
  transparent = false,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-20",
        "px-4 py-4",
        "flex items-center justify-between",
        !transparent && "bg-black/80 backdrop-blur-xl border-b border-white/10",
        className,
      )}
    >
      {/* Left Section - Menu Button */}
      <button
        onClick={onMenuClick}
        className={cn(
          "relative w-10 h-10 rounded-full",
          "bg-white/10 border border-white/20",
          "flex items-center justify-center",
          "transition-all duration-200",
          "hover:bg-white/20 hover:scale-105",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          "active:scale-95",
        )}
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Center Section - Title */}
      {title && (
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-white">
          {title}
        </h1>
      )}

      {/* Right Section - Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Notifications Button */}
        {onNotificationClick && (
          <button
            onClick={onNotificationClick}
            className={cn(
              "relative w-10 h-10 rounded-full",
              "bg-white/10 border border-white/20",
              "flex items-center justify-center",
              "transition-all duration-200",
              "hover:bg-white/20 hover:scale-105",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              "active:scale-95",
            )}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-white" />
            {showNotificationBadge && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500">
                  {notificationCount && notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </span>
              </span>
            )}
          </button>
        )}

        {/* Settings Button */}
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className={cn(
              "relative w-10 h-10 rounded-full",
              "bg-white/10 border border-white/20",
              "flex items-center justify-center",
              "transition-all duration-200",
              "hover:bg-white/20 hover:scale-105",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
              "active:scale-95",
            )}
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Profile Button */}
        <button
          onClick={onProfileClick}
          className={cn(
            "relative w-10 h-10 rounded-full",
            "bg-gradient-to-br from-violet-600 to-blue-600",
            "border-2 border-white/30",
            "flex items-center justify-center",
            "transition-all duration-200",
            "hover:scale-105 hover:shadow-lg hover:shadow-violet-500/30",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            "active:scale-95",
          )}
          aria-label="Profile menu"
        >
          <User className="w-5 h-5 text-white" />
        </button>
      </div>
    </header>
  );
}
