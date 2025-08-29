"use client";

import React, { ReactNode, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useHasHydrated,
  useNavigation,
  useAppStore,
} from "@/lib/stores/useAppStore";
import { route, isStoreView, type RouteKey, type StoreView } from "@/lib/navigation";
import { TopBar } from "./TopBar";
import { SideMenu } from "./SideMenu";

export interface AppShellProps {
  children: ReactNode;
  className?: string;
  backgroundVariant?: "default" | "capture" | "dashboard";
}

export function AppShell(props: AppShellProps) {
  const hasHydrated = useHasHydrated();

  // Trigger rehydration once on mount (since we use skipHydration: true)
  useEffect(() => {
    const rehydrate = async () => {
      await useAppStore.persist?.rehydrate();
    };
    void rehydrate();
  }, []); // Run once on mount

  // Gate: do NOT read from the store yet
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-black text-white">{props.children}</div>
    );
  }

  return <HydratedShell {...props} />;
}

function HydratedShell({ children, className }: AppShellProps) {
  const router = useRouter();

  // Safe to read from Zustand now
  const { isMenuOpen, toggleMenu, closeAllMenus, currentView, navigate } =
    useNavigation();

  // Type-safe navigation handler with proper memoization
  const handleNavigate = useCallback(
    (view: RouteKey) => {
      // Update store only for store-managed views (type guard narrows automatically)
      if (isStoreView(view)) {
        navigate(view); // No cast needed - TypeScript knows view is StoreView here
      }

      // Always sync URL
      router.push(route(view));
      closeAllMenus();
    },
    [navigate, router, closeAllMenus]
  );

  // Ensure currentView is always a valid StoreView (with fallback)
  const safeCurrentView: StoreView = isStoreView(currentView) 
    ? currentView 
    : 'overview';

  return (
    <div
      className={`min-h-screen bg-black text-white relative ${className || ""}`}
    >
      <TopBar
        isMenuOpen={isMenuOpen}
        onMenuClick={toggleMenu}
        onProfileClick={() => handleNavigate("profile")}
      />

      {/* Side Menu Drawer */}
      <div
        className={`fixed top-0 left-0 h-full z-40 transform transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SideMenu
          isOpen={isMenuOpen}
          currentView={safeCurrentView}
          onNavigate={handleNavigate}
          onClose={closeAllMenus}
        />
      </div>

      {/* Overlay when menu is open */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={closeAllMenus}
        />
      )}

      <main className="pt-16">{children}</main>
    </div>
  );
}

export default AppShell;
