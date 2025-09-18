"use client";

import React, { ReactNode, useEffect, useCallback, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useHasHydrated,
  useNavigation,
  useAppStore,
} from "@/lib/stores/useAppStore";
import {
  route,
  isStoreView,
  type RouteKey,
  type StoreView,
} from "@/lib/navigation";
import { TopBar } from "./TopBar";
import { SideMenu } from "./SideMenu";
import { ProfileMenu } from "./ProfileMenu";
import { useDashboardAuth } from "@/components/auth/DashboardAuthProviderV2";

// Type for profile menu actions
type ProfileAction = "profile" | "settings" | "billing" | "notifications" | "privacy" | "help" | "logout" | "theme";

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
  const pathname = usePathname();
  const { user } = useDashboardAuth();
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      setIsProfileMenuOpen(false); // Close profile menu on navigation
    },
    [navigate, router, closeAllMenus],
  );

  // Handle profile menu actions with type safety
  const handleProfileAction = useCallback(async (action: ProfileAction) => {
    if (isLoggingOut && action === "logout") return; // Prevent double logout

    setIsProfileMenuOpen(false);
    profileButtonRef.current?.focus(); // Return focus to trigger

    switch (action) {
      case "logout":
        setIsLoggingOut(true);
        try {
          const res = await fetch("/api/auth/signout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          if (res.ok) {
            router.replace("/login"); // Use replace to prevent back navigation
          } else {
            console.error("Logout failed");
          }
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          setIsLoggingOut(false);
        }
        break;
      case "profile":
        handleNavigate("profile");
        break;
      case "settings":
        handleNavigate("settings");
        break;
      case "billing":
        router.push("/billing");
        break;
      case "help":
      case "privacy":
      case "notifications":
      case "theme":
        console.log("Profile action:", action);
        break;
    }
  }, [router, handleNavigate, isLoggingOut]);

  // Close profile menu on route change
  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Close profile menu on Escape key and outside clicks
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsProfileMenuOpen(false);
        profileButtonRef.current?.focus(); // Return focus to trigger
      }
    };

    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node;
      // Check both the menu itself and the trigger button
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(target) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(target)
      ) {
        setIsProfileMenuOpen(false);
        profileButtonRef.current?.focus(); // Return focus to trigger
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Focus first menu item when menu opens
  useEffect(() => {
    if (!isProfileMenuOpen) return;

    // Defer to next frame for portal/layout
    const id = requestAnimationFrame(() => {
      const firstMenuItem = profileMenuRef.current?.querySelector<HTMLElement>(
        '[role="menuitem"]:not([disabled])'
      );
      firstMenuItem?.focus();
    });

    return () => cancelAnimationFrame(id);
  }, [isProfileMenuOpen]);

  // Toggle profile menu with functional update to avoid stale state
  const toggleProfileMenu = useCallback(() => {
    setIsProfileMenuOpen(prev => {
      const next = !prev;
      if (next) closeAllMenus(); // Only close side menu when opening profile
      return next;
    });
  }, [closeAllMenus]);

  // Prefetch common routes for better performance
  useEffect(() => {
    router.prefetch("/billing");
    router.prefetch("/settings");
    router.prefetch("/profile");
  }, [router]);

  // Ensure currentView is always a valid StoreView (with fallback)
  const safeCurrentView: StoreView = isStoreView(currentView)
    ? currentView
    : "overview";

  return (
    <div
      className={`min-h-screen bg-black text-white relative ${className || ""}`}
    >
      <TopBar
        isMenuOpen={isMenuOpen}
        onMenuClick={toggleMenu}
        onProfileClick={toggleProfileMenu}
        isProfileMenuOpen={isProfileMenuOpen}
        profileButtonRef={profileButtonRef}
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

      {/* Profile Menu Dropdown - Portal aware */}
      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        user={user ? {
          name: user.email?.split('@')[0] || 'User',
          email: user.email || undefined,
          // Don't hardcode plan - let ProfileMenu handle defaults
        } : undefined}
        onNavigate={handleProfileAction}
        anchorEl={profileButtonRef.current}
        position="right"
        menuRef={profileMenuRef}
      />

      <main className="pt-16">{children}</main>
    </div>
  );
}

export default AppShell;
