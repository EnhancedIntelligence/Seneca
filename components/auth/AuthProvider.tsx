"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  apiFetch: async () => new Response(null, { status: 500 }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);

      // Redirect to login if no session
      if (!session) {
        router.replace("/login");
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      // Redirect to login on sign out
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Helper to add auth headers to API requests
  const apiFetch: AuthContextValue["apiFetch"] = async (input, init) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const headers = new Headers(init?.headers ?? {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(input, { ...init, headers });
  };

  const value = useMemo(
    () => ({ user, loading, signOut, apiFetch }),
    [user, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">
            Loading…
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
