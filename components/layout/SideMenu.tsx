"use client";

import React from "react";
import {
  Mic,
  LayoutDashboard,
  BookOpen,
  Baby,
  Target,
  BarChart3,
  Brain,
  Settings,
  HelpCircle,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SideMenu Component
 *
 * Navigation drawer with organized menu sections for app navigation.
 * Includes sections for Main, Family, Intelligence, and Settings.
 *
 * @component
 * @example
 * ```tsx
 * <SideMenu
 *   currentView="capture"
 *   onNavigate={(view) => setCurrentView(view)}
 *   isOpen={isSideMenuOpen}
 *   onClose={() => setSideMenuOpen(false)}
 * />
 * ```
 */

export type NavigationView =
  | "capture"
  | "overview"
  | "memories"
  | "children"
  | "milestones"
  | "analytics"
  | "insights"
  | "settings"
  | "help";

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  id: NavigationView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface SideMenuProps {
  /** Current active view */
  currentView: NavigationView;
  /** Callback fired when a menu item is clicked */
  onNavigate: (view: NavigationView) => void;
  /** Whether the menu is open */
  isOpen?: boolean;
  /** Callback fired when close button is clicked */
  onClose?: () => void;
  /** User information to display in header */
  user?: {
    name: string;
    email?: string;
    avatarUrl?: string;
  };
  /** Additional CSS classes */
  className?: string;
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Main",
    items: [
      { id: "capture", label: "Capture", icon: Mic },
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "memories", label: "Memories", icon: BookOpen },
    ],
  },
  {
    title: "Family",
    items: [
      { id: "children", label: "Children", icon: Baby },
      { id: "milestones", label: "Milestones", icon: Target },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "insights", label: "AI Insights", icon: Brain },
    ],
  },
  {
    title: "Settings",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "help", label: "Help & Support", icon: HelpCircle },
    ],
  },
];

export function SideMenu({
  currentView,
  onNavigate,
  isOpen: _isOpen = false,
  onClose,
  user,
  className,
}: SideMenuProps) {
  void _isOpen; // Prop interface requirement - may be used in future
  const handleNavigate = (view: NavigationView) => {
    onNavigate(view);
    onClose?.();
  };

  return (
    <div
      className={cn(
        "w-80 h-full bg-zinc-900/98  z-50 backdrop-blur-xl",
        "shadow-2xl border-r border-white/10",
        "flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="relative bg-gradient-to-br from-violet-600 to-blue-600 p-6">
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        <div>
          <h2 className="text-2xl font-bold text-white mb-1">MemoryVault AI</h2>
          <p className="text-white/80 text-sm">Enhanced Intelligence</p>
        </div>

        {user && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-white font-medium">{user.name}</p>
            {user.email && (
              <p className="text-white/60 text-sm">{user.email}</p>
            )}
          </div>
        )}
      </div>

      {/* Menu Sections */}
      <div className="flex-1 overflow-y-auto py-4">
        {MENU_SECTIONS.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="px-6 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              {section.title}
            </h3>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "w-full px-6 py-3",
                      "flex items-center gap-3",
                      "text-left transition-all duration-200",
                      "hover:bg-white/5",
                      "focus:outline-none focus-visible:bg-white/5",
                      isActive &&
                        "bg-violet-600/10 border-l-3 border-violet-600",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        isActive ? "text-violet-400" : "text-white/60",
                      )}
                    />
                    <span
                      className={cn(
                        "flex-1 font-medium",
                        isActive ? "text-violet-400" : "text-white/90",
                      )}
                    >
                      {item.label}
                    </span>

                    {item.badge && (
                      <span className="px-2 py-0.5 bg-violet-600/20 text-violet-400 text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-violet-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-center text-xs text-white/40">
          <p>MemoryVault AI v1.0.0</p>
          <p className="mt-1">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
