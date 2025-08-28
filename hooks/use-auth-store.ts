/**
 * Auth Store Integration Hook
 * Connects authenticated user/family data to the app store
 * Solo-first: familyId may be null for users without families
 */

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/stores/useAppStore';
import type { User } from '@supabase/supabase-js';

interface AuthStoreConfig {
  user: User | null;
  familyId?: string | null;
}

/**
 * Hook to sync auth session with app store.
 * Solo-first: only clear on logout; familyId may be null.
 * Handles user switches and family changes properly.
 */
export function useAuthStore({ user, familyId }: AuthStoreConfig) {
  const setAuthContext = useAppStore((s) => s.setAuthContext);
  const clearAll = useAppStore((s) => s.clearAll);
  const clearFamilyScopedData = useAppStore((s) => s.clearFamilyScopedData);

  // Track previous user and family to detect switches
  const prevUserRef = useRef<string | null>(null);
  const prevFamilyRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;

    // Logout → clear everything
    if (!userId) {
      clearAll();
      prevUserRef.current = null;
      prevFamilyRef.current = undefined;
      return;
    }

    // User switched → hard clear (safer than only clearing family-scoped)
    if (prevUserRef.current && prevUserRef.current !== userId) {
      clearAll();
      prevFamilyRef.current = undefined;
    }
    prevUserRef.current = userId;

    // Logged in; set context
    const nextFamily = familyId ?? null;

    // Family changed → clear family-scoped data
    if (prevFamilyRef.current !== undefined && prevFamilyRef.current !== nextFamily) {
      clearFamilyScopedData();
    }
    prevFamilyRef.current = nextFamily;

    setAuthContext({ currentUserId: userId, currentFamilyId: nextFamily });
  }, [user?.id, familyId, setAuthContext, clearAll, clearFamilyScopedData]);
}

/**
 * Hook to get current auth context from store
 * Returns the authenticated user and family IDs
 */
export function useAuthContext() {
  return useAppStore((s) => ({
    userId: s.currentUserId,
    familyId: s.currentFamilyId,
  }));
}