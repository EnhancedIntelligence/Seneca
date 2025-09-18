"use client";

import React, { useRef, useEffect } from "react";
import {
  User,
  Settings,
  LogOut,
  HelpCircle,
  CreditCard,
  Bell,
  Shield,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ProfileMenu Component
 *
 * A dropdown menu for user profile actions and settings.
 * Appears when the profile button is clicked in the TopBar.
 *
 * @component
 * @example
 * ```tsx
 * <ProfileMenu
 *   isOpen={isProfileMenuOpen}
 *   onClose={() => setProfileMenuOpen(false)}
 *   user={{
 *     name: 'John Doe',
 *     email: 'john@example.com',
 *     avatarUrl: 'https://example.com/avatar.jpg'
 *   }}
 *   onNavigate={(action) => handleProfileAction(action)}
 * />
 * ```
 */

export type ProfileAction =
  | "profile"
  | "settings"
  | "billing"
  | "notifications"
  | "privacy"
  | "help"
  | "logout"
  | "theme";

export interface ProfileMenuProps {
  /** Whether the menu is open */
  isOpen: boolean;
  /** Callback fired when menu should close */
  onClose: () => void;
  /** User information */
  user?: {
    name: string;
    email?: string;
    avatarUrl?: string;
    plan?: "free" | "pro" | "enterprise";
  };
  /** Callback fired when a menu item is clicked */
  onNavigate?: (action: ProfileAction) => void;
  /** Position of the menu */
  position?: "left" | "right";
  /** Current theme */
  theme?: "light" | "dark";
  /** Additional CSS classes */
  className?: string;
  /** Anchor element to position relative to */
  anchorEl?: HTMLElement | null;
  /** Ref for the menu element (for portal-aware outside clicks) */
  menuRef?: React.RefObject<HTMLDivElement>;
}

interface MenuItem {
  id: ProfileAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: string;
  divider?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "profile",
    label: "My Profile",
    icon: User,
    description: "View and edit your profile",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    description: "App preferences",
  },
  {
    id: "billing",
    label: "Billing & Plans",
    icon: CreditCard,
    description: "Manage subscription",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Notification preferences",
  },
  {
    id: "privacy",
    label: "Privacy & Security",
    icon: Shield,
    description: "Privacy settings",
  },
  {
    id: "help",
    label: "Help & Support",
    icon: HelpCircle,
    description: "Get help",
    divider: true,
  },
  { id: "logout", label: "Log Out", icon: LogOut },
];

export function ProfileMenu({
  isOpen,
  onClose,
  user,
  onNavigate,
  position = "right",
  theme = "dark",
  className,
  anchorEl,
  menuRef,
}: ProfileMenuProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const activeRef = menuRef || internalRef;

  // Remove internal event handlers since parent handles them
  // This prevents double handling and conflicts

  const handleItemClick = (action: ProfileAction) => {
    onNavigate?.(action);
    onClose();
  };

  const getPlanBadge = () => {
    if (!user?.plan) return null;

    const planStyles = {
      free: "bg-gray-500/20 text-gray-400",
      pro: "bg-violet-500/20 text-violet-400",
      enterprise:
        "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400",
    };

    return (
      <span
        className={cn(
          "px-2 py-0.5 rounded-full text-xs font-medium",
          planStyles[user.plan],
        )}
      >
        {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
      </span>
    );
  };

  // Calculate position
  const getPosition = () => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      return {
        top: rect.bottom + 8,
        right:
          position === "right" ? window.innerWidth - rect.right : undefined,
        left: position === "left" ? rect.left : undefined,
      };
    }
    return {
      top: 60,
      right: position === "right" ? 16 : undefined,
      left: position === "left" ? 16 : undefined,
    };
  };

  const positionStyle = getPosition();

  return (
    <div
      ref={activeRef}
      id="profile-menu"
      className={cn(
        "fixed z-50 w-80",
        "bg-zinc-900/98 backdrop-blur-xl",
        "rounded-xl shadow-2xl border border-white/10",
        "transition-all duration-200 origin-top",
        isOpen
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 -translate-y-2 pointer-events-none",
        className,
      )}
      style={positionStyle}
      role="menu"
      aria-labelledby="avatar-button"
      aria-expanded={isOpen}
      data-testid="profile-menu"
    >
      {/* User Info Header */}
      {user && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-semibold">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </span>
              )}
            </div>

            {/* Name and Email */}
            <div className="flex-1">
              <p className="font-medium text-white">{user.name}</p>
              {user.email && (
                <p className="text-sm text-white/60">{user.email}</p>
              )}
            </div>

            {/* Plan Badge */}
            {getPlanBadge()}
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="py-2">
        {MENU_ITEMS.map((item, index) => {
          const Icon = item.icon;
          const showDivider = item.divider && index < MENU_ITEMS.length - 1;

          return (
            <React.Fragment key={item.id}>
              <button
                onClick={() => handleItemClick(item.id)}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3",
                  "text-left transition-colors duration-200",
                  "hover:bg-white/5 focus:bg-white/5 focus:outline-none",
                  item.id === "logout" && "text-red-400 hover:bg-red-500/10",
                )}
                role="menuitem"
                data-action={item.id}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    item.id === "logout" ? "text-red-400" : "text-white/60",
                  )}
                />

                <div className="flex-1">
                  <p
                    className={cn(
                      "font-medium",
                      item.id === "logout" ? "text-red-400" : "text-white/90",
                    )}
                  >
                    {item.label}
                  </p>
                  {item.description && (
                    <p className="text-xs text-white/40 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {item.badge && (
                  <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">
                    {item.badge}
                  </span>
                )}

                {item.id !== "logout" && (
                  <ChevronRight className="w-4 h-4 text-white/30" />
                )}
              </button>

              {showDivider && (
                <div className="my-2 mx-4 border-t border-white/10" />
              )}
            </React.Fragment>
          );
        })}

        {/* Theme Toggle */}
        <div className="mx-4 mt-2 pt-2 border-t border-white/10">
          <button
            onClick={() => handleItemClick("theme")}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="text-sm text-white/60">Theme</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full">
              {theme === "dark" ? (
                <>
                  <Moon className="w-4 h-4 text-white" />
                  <span className="text-xs text-white">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-white" />
                  <span className="text-xs text-white">Light</span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-center">
        <p className="text-xs text-white/40">
          Version 1.0.0 •{" "}
          <a href="#" className="hover:text-white/60 transition-colors">
            Terms
          </a>{" "}
          •{" "}
          <a href="#" className="hover:text-white/60 transition-colors">
            Privacy
          </a>
        </p>
      </div>
    </div>
  );
}
