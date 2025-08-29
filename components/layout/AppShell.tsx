"use client";

import React, { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  useHasHydrated,
  useNavigation,
  useAppStore,
} from "@/lib/stores/useAppStore";
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

  // Handle navigation with actual routing
  const handleNavigate = (view: string) => {
    navigate(view as any);

    // Map views to routes
    const routes: Record<string, string> = {
      capture: "/capture",
      overview: "/overview",
      memories: "/memories",
      children: "/children",
      milestones: "/milestones",
      analytics: "/analytics",
      insights: "/insights",
      settings: "/settings",
      profile: "/profile",
      help: "/help",
    };

    const route = routes[view];
    if (route) {
      router.push(route);
    }

    closeAllMenus();
  };

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
          currentView={currentView as any}
          onNavigate={(view) => handleNavigate(view as string)}
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
