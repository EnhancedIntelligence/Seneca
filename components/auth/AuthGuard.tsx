"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { devError } from "@/lib/client-debug";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Sanitizes redirect paths to prevent open redirects
 * Only allows same-origin relative paths
 */
function safeNext(path: string): string {
  try {
    // Only allow same-origin relative paths
    const u = new URL(path, window.location.origin);
    if (u.origin !== window.location.origin) return "/";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/";
  }
}

/**
 * AuthGuard Component
 * Protects dashboard routes by checking if user has valid session
 * Redirects to /login if not authenticated
 * Event-driven with memoized client and safe redirects
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Memoize Supabase client for single instance
  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }, []);

  useEffect(() => {
    // Check if we're already on an auth route to prevent redirect loops
    const isAuthRoute =
      pathname.startsWith("/login") || pathname.startsWith("/auth/");

    // Initial session check
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          // Only redirect if not already on auth route
          if (!isAuthRoute) {
            const next = encodeURIComponent(
              safeNext(
                pathname + (searchParams?.toString() ? `?${searchParams}` : ""),
              ),
            );
            router.replace(`/login?next=${next}`);
          }
          return;
        }

        setUser(session.user);
      } catch (error) {
        devError("Auth check failed:", error);
        if (!isAuthRoute) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Event-driven auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session || event === "SIGNED_OUT") {
          // Only redirect if not already on auth route (prevent loops)
          if (!isAuthRoute) {
            const next = encodeURIComponent(
              safeNext(
                pathname + (searchParams?.toString() ? `?${searchParams}` : ""),
              ),
            );
            router.replace(`/login?next=${next}`);
          }
        } else if (event === "SIGNED_IN" && session) {
          setUser(session.user);
          setLoading(false);
        }
      },
    );

    // Cleanup subscription
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, router, pathname, searchParams]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, don't render (redirect will happen)
  if (!user) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
