/**
 * Global App Store using Zustand
 * Manages UI state and mock data operations
 * SSR-safe with persistence and optimized selectors
 */

import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type {
  UIChild,
  UIMemory,
  UITag,
  UIMemoryType,
  DbChild,
  DbMemory,
} from "@/lib/types";
import { dbToUiChild } from "@/lib/adapters/child";
import { dbToUiMemory } from "@/lib/adapters/memory";

// ===== Type Definitions =====
export type ViewType =
  | "capture"
  | "overview"
  | "memories"
  | "children"
  | "analytics"
  | "settings";
export type CaptureMode = "voice" | "text" | "manual";

export interface Milestone {
  id: string;
  childId: string;
  title: string;
  description: string;
  achievedAt: string;
  category: string;
  verifiedBy: string;
}

// ===== Store Interfaces =====
interface AuthState {
  currentUserId: string | null;
  currentFamilyId: string | null;
  setAuthContext: (ctx: {
    currentUserId: string | null;
    currentFamilyId: string | null;
  }) => void;
  clearAll: () => void;
  clearFamilyScopedData: () => void;
}

interface NavigationState {
  currentView: ViewType;
  isMenuOpen: boolean;
  isProfileMenuOpen: boolean;
  navigate: (view: ViewType) => void;
  toggleMenu: () => void;
  toggleProfileMenu: () => void;
  closeAllMenus: () => void;
}

interface CaptureState {
  isRecording: boolean;
  recordingDuration: number;
  recordingIntervalId: number | null;
  captureMode: CaptureMode;
  isManualPanelOpen: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  setCaptureMode: (mode: CaptureMode) => void;
  toggleManualPanel: () => void;
}

interface FamilyState {
  children: UIChild[]; // Using UI Child type
  activeChildId: string | null;
  switchChild: (childId: string) => void;
  getActiveChild: () => UIChild | undefined;
  ingestDbChildren: (children: DbChild[]) => void;
}

interface MemoryState {
  memories: UIMemory[]; // Using UI Memory type
  milestones: Milestone[];
  pendingMemoryIds: string[];
  error: string | null;
  addMemory: (
    content: string,
    type?: UIMemoryType,
    tags?: UITag[],
  ) => Promise<void>;
  addMemoryUI: (memory: UIMemory) => void;
  ingestDbMemories: (memories: DbMemory[]) => void;
  deleteMemory: (id: string) => void;
  clearError: () => void;
}

interface FilterState {
  searchQuery: string;
  selectedTags: string[]; // Tag labels for filtering
  dateRange: { start: string | null; end: string | null }; // ISO strings for consistency
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  clearFilters: () => void;
}

// ===== Hydration Interface =====
interface HydrationState {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
}

// ===== Combined Store Interface =====
export interface AppStore
  extends HydrationState,
    AuthState,
    NavigationState,
    CaptureState,
    FamilyState,
    MemoryState,
    FilterState {
  reset: () => void;
}

// ===== Helper Functions =====
const newId = (prefix: string): string => {
  // Deterministic for tests, unique for production
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
};

const withinDateRange = (
  iso: string,
  start: string | null,
  end: string | null,
): boolean => {
  if (!start && !end) return true;
  const date = new Date(iso).getTime();
  const startTime = start ? new Date(start).getTime() : -Infinity;
  const endTime = end ? new Date(end).getTime() : Infinity;
  return date >= startTime && date <= endTime;
};

// Store will be hydrated from auth/API data, not mock data

// ===== Initial State =====
const initialState = {
  // Hydration state - false until persist middleware completes
  hasHydrated: false,

  // Auth context
  currentUserId: null,
  currentFamilyId: null,

  // Navigation
  currentView: "capture" as ViewType,
  isMenuOpen: false,
  isProfileMenuOpen: false,

  // Capture
  isRecording: false,
  recordingDuration: 0,
  recordingIntervalId: null,
  captureMode: "voice" as CaptureMode,
  isManualPanelOpen: false,

  // Family
  children: [] as UIChild[], // Will be loaded from API
  activeChildId: null,

  // Memory
  memories: [] as UIMemory[], // Will be loaded from API
  milestones: [] as Milestone[],
  pendingMemoryIds: [] as string[],
  error: null,

  // Filters
  searchQuery: "",
  selectedTags: [] as string[],
  dateRange: { start: null, end: null },
};

// ===== Store Implementation =====
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Hydration action
        setHasHydrated: (value: boolean) => set({ hasHydrated: value }),

        // Auth Actions
        setAuthContext: (ctx) =>
          set(() => ({
            currentUserId: ctx.currentUserId,
            currentFamilyId: ctx.currentFamilyId,
          })),

        clearAll: () => {
          const { recordingIntervalId } = get();
          if (recordingIntervalId) {
            clearInterval(recordingIntervalId);
          }
          set(() => ({
            ...initialState,
            hasHydrated: true, // Keep hydration state
          }));
        },

        clearFamilyScopedData: () =>
          set(() => ({
            children: [],
            memories: [],
            milestones: [],
            activeChildId: null,
            pendingMemoryIds: [],
          })),

        // Navigation Actions
        navigate: (view) =>
          set({
            currentView: view,
            isMenuOpen: false,
            isProfileMenuOpen: false,
          }),

        toggleMenu: () =>
          set((state) => ({
            isMenuOpen: !state.isMenuOpen,
            isProfileMenuOpen: false,
          })),

        toggleProfileMenu: () =>
          set((state) => ({
            isProfileMenuOpen: !state.isProfileMenuOpen,
            isMenuOpen: false,
          })),

        closeAllMenus: () =>
          set({
            isMenuOpen: false,
            isProfileMenuOpen: false,
          }),

        // Capture Actions (with interval guard)
        startRecording: () => {
          const { isRecording, recordingIntervalId } = get();

          // Guard against double-start
          if (isRecording || recordingIntervalId) return;

          set({ isRecording: true, recordingDuration: 0 });

          const id = window.setInterval(() => {
            const state = get();
            if (!state.isRecording) {
              clearInterval(id);
              set({ recordingIntervalId: null });
              return;
            }
            set({ recordingDuration: state.recordingDuration + 1 });
          }, 1000);

          set({ recordingIntervalId: id });
        },

        stopRecording: () => {
          const { recordingIntervalId, recordingDuration, isRecording } = get();

          if (recordingIntervalId) {
            clearInterval(recordingIntervalId);
          }

          set({
            isRecording: false,
            recordingDuration: 0,
            recordingIntervalId: null,
          });

          // Auto-save voice memory if recording was active
          if (isRecording && recordingDuration > 0) {
            get().addMemory(
              `Voice recording (${recordingDuration}s)`,
              "voice",
              [], // Voice is a type, not a tag
            );
          }
        },

        setCaptureMode: (mode) => set({ captureMode: mode }),

        toggleManualPanel: () =>
          set((state) => ({
            isManualPanelOpen: !state.isManualPanelOpen,
          })),

        // Family Actions (with validation)
        switchChild: (childId) =>
          set((state) =>
            state.children.some((c) => c.id === childId)
              ? { activeChildId: childId }
              : state,
          ),

        getActiveChild: () => {
          const { activeChildId, children } = get();
          return activeChildId
            ? children.find((c) => c.id === activeChildId)
            : undefined;
        },

        ingestDbChildren: (dbChildren) => {
          const uiChildren = dbChildren.map(dbToUiChild);
          set({ children: uiChildren });
        },

        // Memory Actions (optimistic updates)
        addMemory: async (content, type = "text", tags = []) => {
          const state = get();
          const activeChild = state.getActiveChild();

          if (!activeChild) {
            set({ error: "No active child selected" });
            return;
          }

          if (!state.currentUserId) {
            set({ error: "User not authenticated" });
            return;
          }

          // Clear previous error
          set({ error: null });

          // Create optimistic UI memory with temp ID
          const tempId = newId("temp");
          const timestamp = new Date().toISOString();
          const optimisticMemory: UIMemory = {
            id: tempId,
            childId: activeChild.id,
            familyId: activeChild.familyId, // Use actual family from child
            createdBy: state.currentUserId, // Use current authenticated user
            title: null,
            content,
            timestamp,
            type,
            tags,
            category: null,
            needsReview: false,
            processingStatus: "queued",
            imageUrls: [],
            videoUrls: [],
          };

          // Optimistically add memory
          set((state) => ({
            memories: [optimisticMemory, ...state.memories],
            pendingMemoryIds: [...state.pendingMemoryIds, tempId],
          }));

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Replace temp ID with real ID
          const realId = newId("mem");
          set((state) => ({
            memories: state.memories.map((m) =>
              m.id === tempId
                ? { ...m, id: realId, processingStatus: "completed" }
                : m,
            ),
            pendingMemoryIds: state.pendingMemoryIds.filter(
              (id) => id !== tempId,
            ),
          }));

          // Check for milestone (mock AI detection)
          if (tags.some((t) => t.label === "milestone")) {
            const newMilestone: Milestone = {
              id: newId("milestone"),
              childId: activeChild.id,
              title: "New Achievement",
              description: content,
              achievedAt: timestamp,
              category: "physical",
              verifiedBy: "ai",
            };

            set((state) => ({
              milestones: [newMilestone, ...state.milestones],
            }));
          }
        },

        addMemoryUI: (memory) => {
          set((state) => ({
            memories: [memory, ...state.memories],
          }));
        },

        ingestDbMemories: (dbMemories) => {
          const uiMemories = dbMemories.map(dbToUiMemory);
          set({ memories: uiMemories });
        },

        deleteMemory: (id) =>
          set((state) => ({
            memories: state.memories.filter((m) => m.id !== id),
            pendingMemoryIds: state.pendingMemoryIds.filter(
              (pid) => pid !== id,
            ),
          })),

        clearError: () => set({ error: null }),

        // Filter Actions
        setSearchQuery: (query) => set({ searchQuery: query }),

        toggleTag: (tagLabel) =>
          set((state) => ({
            selectedTags: state.selectedTags.includes(tagLabel)
              ? state.selectedTags.filter((t) => t !== tagLabel)
              : [...state.selectedTags, tagLabel],
          })),

        setDateRange: (start, end) =>
          set({
            dateRange: { start, end },
          }),

        clearFilters: () =>
          set({
            searchQuery: "",
            selectedTags: [],
            dateRange: { start: null, end: null },
            error: null, // Also clear any filter errors
          }),

        // Reset (with cleanup)
        reset: () => {
          const { recordingIntervalId } = get();
          if (recordingIntervalId) {
            clearInterval(recordingIntervalId);
          }
          set(initialState);
        },
      }),
      {
        name: "seneca-app-store",
        storage: createJSONStorage(() => {
          // SSR-safe storage
          if (typeof window === "undefined") {
            return {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            };
          }
          return localStorage;
        }),
        skipHydration: true, // Critical: prevent auto-rehydration during SSR
        partialize: (state) => ({
          // Only persist UI preferences, not mock data
          activeChildId: state.activeChildId,
          captureMode: state.captureMode,
          currentView: state.currentView,
          selectedTags: state.selectedTags,
        }),
        onRehydrateStorage: () => (state) => {
          // Called after state is rehydrated from storage
          // Use the state parameter to set the flag
          state?.setHasHydrated(true);
        },
      },
    ),
    {
      name: "seneca-app-store-devtools",
    },
  ),
);

// ===== Hydration Selector =====
// Tiny selector for hydration status
export const useHasHydrated = (): boolean =>
  useAppStore((state) => state.hasHydrated);

// ===== Optimized Selectors =====
// Using useShallow to cache object references and prevent infinite loops

export const useNavigation = () =>
  useAppStore(
    useShallow((state) => ({
      currentView: state.currentView,
      isMenuOpen: state.isMenuOpen,
      isProfileMenuOpen: state.isProfileMenuOpen,
      navigate: state.navigate,
      toggleMenu: state.toggleMenu,
      toggleProfileMenu: state.toggleProfileMenu,
      closeAllMenus: state.closeAllMenus,
    })),
  );

export const useCapture = () =>
  useAppStore(
    useShallow((state) => ({
      isRecording: state.isRecording,
      recordingDuration: state.recordingDuration,
      captureMode: state.captureMode,
      isManualPanelOpen: state.isManualPanelOpen,
      startRecording: state.startRecording,
      stopRecording: state.stopRecording,
      setCaptureMode: state.setCaptureMode,
      toggleManualPanel: state.toggleManualPanel,
    })),
  );

export const useFamily = () =>
  useAppStore(
    useShallow((state) => ({
      children: state.children,
      activeChildId: state.activeChildId,
      switchChild: state.switchChild,
    })),
  );

// Raw data selectors - filter in component with useMemo
export const useMemoryData = () =>
  useAppStore(
    useShallow((state) => ({
      memories: state.memories,
      milestones: state.milestones,
      activeChildId: state.activeChildId,
      pendingMemoryIds: state.pendingMemoryIds,
      error: state.error,
      addMemory: state.addMemory,
      deleteMemory: state.deleteMemory,
      clearError: state.clearError,
    })),
  );

export const useFilters = () =>
  useAppStore(
    useShallow((state) => ({
      searchQuery: state.searchQuery,
      selectedTags: state.selectedTags,
      dateRange: state.dateRange,
      setSearchQuery: state.setSearchQuery,
      toggleTag: state.toggleTag,
      setDateRange: state.setDateRange,
      clearFilters: state.clearFilters,
    })),
  );

// ===== Utility Hooks =====
// These compose the selectors with filtering logic

import { useMemo } from "react";

export const useFilteredMemories = () => {
  const { memories, activeChildId } = useMemoryData();
  const { searchQuery, selectedTags, dateRange } = useFilters();

  return useMemo(() => {
    // memories is already UIMemory[]
    let filtered = memories;

    // Filter by active child - using UI field childId
    if (activeChildId) {
      filtered = filtered.filter((m) => m.childId === activeChildId);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          (m.title ?? "").toLowerCase().includes(query) ||
          m.content.toLowerCase().includes(query) ||
          m.tags.some((t) => t.label.toLowerCase().includes(query)),
      );
    }

    // Filter by tags - tags are UITag[] in UI types
    if (selectedTags.length > 0) {
      filtered = filtered.filter((m) =>
        selectedTags.some((tagLabel) =>
          m.tags.some((t) => t.label === tagLabel),
        ),
      );
    }

    // Filter by date range - using timestamp from UI type
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter((m) =>
        withinDateRange(m.timestamp, dateRange.start, dateRange.end),
      );
    }

    return filtered;
  }, [memories, activeChildId, searchQuery, selectedTags, dateRange]);
};

export const useActiveChild = () => {
  const { children, activeChildId } = useFamily();
  return useMemo(
    () => children.find((c) => c.id === activeChildId),
    [children, activeChildId],
  );
};
