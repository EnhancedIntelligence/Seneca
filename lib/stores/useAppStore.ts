/**
 * Global App Store using Zustand
 * Manages UI state and mock data operations
 * SSR-safe with persistence and optimized selectors
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { Child, MemoryEntry, Tag, MemoryType } from '@/lib/types';
import type { Milestone } from './mockData';
import {
  mockChildren as rawMockChildren,
  mockMemories as rawMockMemories,
  mockMilestones,
} from './mockData';
import { mockChildToDbChild, mockMemoryToDbMemory } from './mockDataAdapter';

// ===== Type Definitions =====
export type ViewType = 'capture' | 'overview' | 'memories' | 'children' | 'analytics' | 'settings';
export type CaptureMode = 'voice' | 'text' | 'manual';

// ===== Store Interfaces =====
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
  children: Child[]; // Now using DB Child type
  activeChildId: string | null;
  switchChild: (childId: string) => void;
  getActiveChild: () => Child | undefined;
}

interface MemoryState {
  memories: MemoryEntry[]; // Now using DB MemoryEntry type
  milestones: Milestone[];
  pendingMemoryIds: string[];
  error: string | null;
  addMemory: (content: string, type?: MemoryType, tags?: Tag[]) => Promise<void>;
  deleteMemory: (id: string) => void;
  clearError: () => void;
}

interface FilterState {
  searchQuery: string;
  selectedTags: Tag[];
  dateRange: { start: string | null; end: string | null }; // ISO strings for consistency
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: Tag) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  clearFilters: () => void;
}

// ===== Hydration Interface =====
interface HydrationState {
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
}

// ===== Combined Store Interface =====
export interface AppStore extends 
  HydrationState,
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

const withinDateRange = (iso: string, start: string | null, end: string | null): boolean => {
  if (!start && !end) return true;
  const date = new Date(iso).getTime();
  const startTime = start ? new Date(start).getTime() : -Infinity;
  const endTime = end ? new Date(end).getTime() : Infinity;
  return date >= startTime && date <= endTime;
};

// Convert mock data to DB types
const mockChildren = rawMockChildren.map(mockChildToDbChild);
const mockMemories = rawMockMemories.map(mockMemoryToDbMemory);

// ===== Initial State =====
const initialState = {
  // Hydration state - false until persist middleware completes
  hasHydrated: false,
  
  // Navigation
  currentView: 'capture' as ViewType,
  isMenuOpen: false,
  isProfileMenuOpen: false,
  
  // Capture
  isRecording: false,
  recordingDuration: 0,
  recordingIntervalId: null,
  captureMode: 'voice' as CaptureMode,
  isManualPanelOpen: false,
  
  // Family
  children: mockChildren, // Now DB Child[] type
  activeChildId: mockChildren[0]?.id || null,
  
  // Memory
  memories: mockMemories, // Now DB MemoryEntry[] type
  milestones: mockMilestones,
  pendingMemoryIds: [] as string[],
  error: null,
  
  // Filters
  searchQuery: '',
  selectedTags: [] as Tag[],
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
        
        // Navigation Actions
        navigate: (view) => set({ 
          currentView: view, 
          isMenuOpen: false,
          isProfileMenuOpen: false 
        }),
        
        toggleMenu: () => set((state) => ({ 
          isMenuOpen: !state.isMenuOpen,
          isProfileMenuOpen: false 
        })),
        
        toggleProfileMenu: () => set((state) => ({ 
          isProfileMenuOpen: !state.isProfileMenuOpen,
          isMenuOpen: false 
        })),
        
        closeAllMenus: () => set({ 
          isMenuOpen: false, 
          isProfileMenuOpen: false 
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
            recordingIntervalId: null 
          });
          
          // Auto-save voice memory if recording was active
          if (isRecording && recordingDuration > 0) {
            get().addMemory(
              `Voice recording (${recordingDuration}s)`, 
              'voice',
              [] // Voice is a type, not a tag
            );
          }
        },
        
        setCaptureMode: (mode) => set({ captureMode: mode }),
        
        toggleManualPanel: () => set((state) => ({ 
          isManualPanelOpen: !state.isManualPanelOpen 
        })),
        
        // Family Actions (with validation)
        switchChild: (childId) => set((state) => 
          state.children.some(c => c.id === childId) 
            ? { activeChildId: childId }
            : state
        ),
        
        getActiveChild: () => {
          const { activeChildId, children } = get();
          return activeChildId 
            ? children.find(c => c.id === activeChildId) 
            : undefined;
        },
        
        // Memory Actions (optimistic updates)
        addMemory: async (content, type = 'text', tags = []) => {
          const state = get();
          const activeChild = state.getActiveChild();
          
          if (!activeChild) {
            set({ error: 'No active child selected' });
            return;
          }
          
          // Clear previous error
          set({ error: null });
          
          // Create optimistic memory with temp ID
          const tempId = newId('temp');
          const optimisticMemory: MemoryEntry = {
            id: tempId,
            child_id: activeChild.id,
            family_id: 'mock-family-1',
            created_by: 'mock-user-1',
            title: null,
            content,
            memory_date: new Date().toISOString(),
            category: null,
            tags,
            processing_status: 'queued',
            classification_confidence: null,
            milestone_detected: tags.includes('milestone'),
            milestone_type: null,
            milestone_confidence: null,
            image_urls: null,
            video_urls: null,
            error_message: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            processing_priority: null,
            retry_count: null,
            location_lat: null,
            location_lng: null,
            location_name: null,
            app_context: null,
            needs_review: null
          };
          
          // Optimistically add memory
          set((state) => ({
            memories: [optimisticMemory, ...state.memories],
            pendingMemoryIds: [...state.pendingMemoryIds, tempId],
          }));
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Replace temp ID with real ID
          const realId = newId('mem');
          set((state) => ({
            memories: state.memories.map(m => 
              m.id === tempId ? { ...m, id: realId, processing_status: 'completed' } : m
            ),
            pendingMemoryIds: state.pendingMemoryIds.filter(id => id !== tempId),
          }));
          
          // Check for milestone (mock AI detection)
          if (tags.includes('milestone')) {
            const newMilestone: Milestone = {
              id: newId('milestone'),
              childId: activeChild.id,
              title: 'New Achievement',
              description: content,
              achievedAt: new Date().toISOString(),
              category: 'physical',
              verifiedBy: 'ai',
            };
            
            set((state) => ({
              milestones: [newMilestone, ...state.milestones],
            }));
          }
        },
        
        deleteMemory: (id) => set((state) => ({
          memories: state.memories.filter(m => m.id !== id),
          pendingMemoryIds: state.pendingMemoryIds.filter(pid => pid !== id),
        })),
        
        clearError: () => set({ error: null }),
        
        // Filter Actions
        setSearchQuery: (query) => set({ searchQuery: query }),
        
        toggleTag: (tag) => set((state) => ({
          selectedTags: state.selectedTags.includes(tag)
            ? state.selectedTags.filter(t => t !== tag)
            : [...state.selectedTags, tag]
        })),
        
        setDateRange: (start, end) => set({ 
          dateRange: { start, end } 
        }),
        
        clearFilters: () => set({
          searchQuery: '',
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
        name: 'seneca-app-store',
        storage: createJSONStorage(() => {
          // SSR-safe storage
          if (typeof window === 'undefined') {
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
      }
    ),
    {
      name: 'seneca-app-store-devtools',
    }
  )
);

// ===== Hydration Selector =====
// Tiny selector for hydration status
export const useHasHydrated = (): boolean => useAppStore((state) => state.hasHydrated);

// ===== Optimized Selectors =====
// Using useShallow to cache object references and prevent infinite loops

export const useNavigation = () => useAppStore(
  useShallow((state) => ({
    currentView: state.currentView,
    isMenuOpen: state.isMenuOpen,
    isProfileMenuOpen: state.isProfileMenuOpen,
    navigate: state.navigate,
    toggleMenu: state.toggleMenu,
    toggleProfileMenu: state.toggleProfileMenu,
    closeAllMenus: state.closeAllMenus,
  }))
);

export const useCapture = () => useAppStore(
  useShallow((state) => ({
    isRecording: state.isRecording,
    recordingDuration: state.recordingDuration,
    captureMode: state.captureMode,
    isManualPanelOpen: state.isManualPanelOpen,
    startRecording: state.startRecording,
    stopRecording: state.stopRecording,
    setCaptureMode: state.setCaptureMode,
    toggleManualPanel: state.toggleManualPanel,
  }))
);

export const useFamily = () => useAppStore(
  useShallow((state) => ({
    children: state.children,
    activeChildId: state.activeChildId,
    switchChild: state.switchChild,
  }))
);

// Raw data selectors - filter in component with useMemo
export const useMemoryData = () => useAppStore(
  useShallow((state) => ({
    memories: state.memories,
    milestones: state.milestones,
    activeChildId: state.activeChildId,
    pendingMemoryIds: state.pendingMemoryIds,
    error: state.error,
    addMemory: state.addMemory,
    deleteMemory: state.deleteMemory,
    clearError: state.clearError,
  }))
);

export const useFilters = () => useAppStore(
  useShallow((state) => ({
    searchQuery: state.searchQuery,
    selectedTags: state.selectedTags,
    dateRange: state.dateRange,
    setSearchQuery: state.setSearchQuery,
    toggleTag: state.toggleTag,
    setDateRange: state.setDateRange,
    clearFilters: state.clearFilters,
  }))
);

// ===== Utility Hooks =====
// These compose the selectors with filtering logic

import { useMemo } from 'react';

export const useFilteredMemories = () => {
  const { memories, activeChildId } = useMemoryData();
  const { searchQuery, selectedTags, dateRange } = useFilters();
  
  return useMemo(() => {
    let filtered = memories;
    
    // Filter by active child
    if (activeChildId) {
      filtered = filtered.filter(m => m.childId === activeChildId);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.content.toLowerCase().includes(query)
      );
    }
    
    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(m => 
        selectedTags.some(tag => m.tags.includes(tag))
      );
    }
    
    // Filter by date range
    if (dateRange.start || dateRange.end) {
      filtered = filtered.filter(m => 
        withinDateRange(m.timestamp, dateRange.start, dateRange.end)
      );
    }
    
    return filtered;
  }, [memories, activeChildId, searchQuery, selectedTags, dateRange]);
};

export const useActiveChild = () => {
  const { children, activeChildId } = useFamily();
  return useMemo(() => 
    children.find(c => c.id === activeChildId),
    [children, activeChildId]
  );
};