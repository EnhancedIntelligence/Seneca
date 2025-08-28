/**
 * Unit Tests for App Store Actions
 * Tests auth context, clearing actions, and state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../useAppStore';

// Type definitions for test data
type TestChild = { id: string; name: string; familyId: string };
type TestMemory = { id: string; content: string };

describe('useAppStore', () => {
  // Setup fake timers and reset store before each test
  beforeEach(() => {
    vi.useFakeTimers();
    act(() => {
      useAppStore.getState().clearAll();
      // Ensure tests that expect 'not hydrated' start from a clean baseline
      useAppStore.getState().setHasHydrated(false);
    });
  });

  // Cleanup timers after each test
  afterEach(() => {
    const id = useAppStore.getState().recordingIntervalId;
    if (id) clearInterval(id as any);
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Auth Context Actions', () => {
    it('should set auth context correctly', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setAuthContext({
          currentUserId: 'user-123',
          currentFamilyId: 'family-456',
        });
      });

      expect(result.current.currentUserId).toBe('user-123');
      expect(result.current.currentFamilyId).toBe('family-456');
    });

    it('should handle null values in auth context (solo user)', () => {
      const { result } = renderHook(() => useAppStore());
      
      act(() => {
        result.current.setAuthContext({
          currentUserId: 'user-123',
          currentFamilyId: null, // Solo user without family
        });
      });

      expect(result.current.currentUserId).toBe('user-123');
      expect(result.current.currentFamilyId).toBeNull();
    });
  });

  describe('Clear Actions', () => {
    it('clearAll should reset entire store to initial state', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Set some data
      act(() => {
        result.current.setAuthContext({
          currentUserId: 'user-123',
          currentFamilyId: 'family-456',
        });
        result.current.navigate('memories');
        result.current.setSearchQuery('test search');
      });

      // Clear all
      act(() => {
        result.current.clearAll();
      });

      // Check reset to initial state (except hasHydrated which clearAll preserves as true)
      expect(result.current.currentUserId).toBeNull();
      expect(result.current.currentFamilyId).toBeNull();
      expect(result.current.currentView).toBe('capture'); // Initial view
      expect(result.current.searchQuery).toBe('');
      expect(result.current.children).toEqual([]);
      expect(result.current.memories).toEqual([]);
      expect(result.current.milestones).toEqual([]);
      expect(result.current.hasHydrated).toBe(true); // clearAll preserves this as true
    });

    it('clearFamilyScopedData should only clear family-related data', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Set auth and family data
      act(() => {
        result.current.setAuthContext({
          currentUserId: 'user-123',
          currentFamilyId: 'family-456',
        });
        // Mock adding some children/memories (would normally come from API)
        const state = useAppStore.getState();
        const testChild: TestChild = { id: 'child-1', name: 'Test Child', familyId: 'family-456' };
        const testMemory: TestMemory = { id: 'mem-1', content: 'Test Memory' };
        useAppStore.setState({
          ...state,
          children: [testChild as any],
          memories: [testMemory as any],
          activeChildId: 'child-1',
        });
      });

      // Clear family data only
      act(() => {
        result.current.clearFamilyScopedData();
      });

      // Auth should remain, family data should be cleared
      expect(result.current.currentUserId).toBe('user-123');
      expect(result.current.currentFamilyId).toBe('family-456');
      expect(result.current.children).toEqual([]);
      expect(result.current.memories).toEqual([]);
      expect(result.current.milestones).toEqual([]);
      expect(result.current.activeChildId).toBeNull();
    });

    it('clearAll should stop recording if in progress', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Start recording
      act(() => {
        result.current.startRecording();
      });
      
      expect(result.current.isRecording).toBe(true);
      expect(result.current.recordingIntervalId).not.toBeNull();

      // Clear all should stop recording
      act(() => {
        result.current.clearAll();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.recordingIntervalId).toBeNull();
    });
  });

  describe('Navigation Actions', () => {
    it('should navigate and close both menus', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Open both menus
      act(() => {
        result.current.toggleMenu();
        result.current.toggleProfileMenu();
      });
      
      expect(result.current.isMenuOpen).toBe(true);
      expect(result.current.isProfileMenuOpen).toBe(true);

      // Navigate should close both menus
      act(() => {
        result.current.navigate('memories');
      });

      expect(result.current.currentView).toBe('memories');
      expect(result.current.isMenuOpen).toBe(false);
      expect(result.current.isProfileMenuOpen).toBe(false);
    });
  });

  describe('Memory Actions', () => {
    it('should not allow adding memory without authenticated user', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Try to add memory without auth
      act(() => {
        result.current.addMemory('Test content');
      });

      // Should set error
      expect(result.current.error).toBe('No active child selected');
      expect(result.current.memories).toEqual([]);
    });

    it('should require active child for memory creation', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Set auth but no active child
      act(() => {
        result.current.setAuthContext({
          currentUserId: 'user-123',
          currentFamilyId: 'family-456',
        });
      });

      act(() => {
        result.current.addMemory('Test content');
      });

      expect(result.current.error).toBe('No active child selected');
    });

    it('should add memory successfully when user and active child are present', async () => {
      const { result } = renderHook(() => useAppStore());
      
      // Set up auth and active child
      act(() => {
        result.current.setAuthContext({
          currentUserId: 'user-123',
          currentFamilyId: 'family-456',
        });
        // Add a child and set it as active
        const testChild: TestChild = { 
          id: 'child-1', 
          name: 'Test Child', 
          familyId: 'family-456' 
        };
        useAppStore.setState(state => ({
          ...state,
          children: [testChild as any],
          activeChildId: 'child-1',
        }));
      });

      // Add memory
      await act(async () => {
        await result.current.addMemory('Test memory content');
      });

      // Use fake timers to advance past the simulated API call
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Should successfully add memory
      expect(result.current.error).toBeNull();
      expect(result.current.memories.length).toBe(1);
      expect(result.current.memories[0].content).toBe('Test memory content');
      expect(result.current.memories[0].createdBy).toBe('user-123');
    });
  });

  describe('Filter Actions', () => {
    it('should set and clear filters correctly', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Set filters
      act(() => {
        result.current.setSearchQuery('birthday');
        result.current.toggleTag('milestone');
        result.current.setDateRange('2024-01-01', '2024-12-31');
      });

      expect(result.current.searchQuery).toBe('birthday');
      expect(result.current.selectedTags).toContain('milestone');
      expect(result.current.dateRange.start).toBe('2024-01-01');
      expect(result.current.dateRange.end).toBe('2024-12-31');

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.selectedTags).toEqual([]);
      expect(result.current.dateRange.start).toBeNull();
      expect(result.current.dateRange.end).toBeNull();
    });

    it('should toggle tags correctly', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Add tag
      act(() => {
        result.current.toggleTag('milestone');
      });
      expect(result.current.selectedTags).toContain('milestone');

      // Toggle same tag should remove it
      act(() => {
        result.current.toggleTag('milestone');
      });
      expect(result.current.selectedTags).not.toContain('milestone');

      // Add multiple tags
      act(() => {
        result.current.toggleTag('first-steps');
        result.current.toggleTag('medical');
      });
      expect(result.current.selectedTags).toHaveLength(2);
      expect(result.current.selectedTags).toContain('first-steps');
      expect(result.current.selectedTags).toContain('medical');
    });
  });

  describe('Capture State', () => {
    it('should manage recording state with duration tracking', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.isRecording).toBe(false);
      
      // Start recording
      act(() => {
        result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);
      expect(result.current.recordingDuration).toBe(0);

      // Advance time to simulate recording duration
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      expect(result.current.recordingDuration).toBeGreaterThanOrEqual(1);

      // Stop recording
      act(() => {
        result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.recordingDuration).toBe(0);
      expect(result.current.recordingIntervalId).toBeNull();
    });

    it('should prevent double-start of recording', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Start recording
      act(() => {
        result.current.startRecording();
      });
      
      const firstIntervalId = result.current.recordingIntervalId;
      
      // Try to start again
      act(() => {
        result.current.startRecording();
      });
      
      // Should not create new interval
      expect(result.current.recordingIntervalId).toBe(firstIntervalId);
    });

    it('should change capture modes', () => {
      const { result } = renderHook(() => useAppStore());
      
      expect(result.current.captureMode).toBe('voice');
      
      act(() => {
        result.current.setCaptureMode('text');
      });
      expect(result.current.captureMode).toBe('text');
      
      act(() => {
        result.current.setCaptureMode('manual');
      });
      expect(result.current.captureMode).toBe('manual');
    });
  });

  describe('Hydration', () => {
    it('should track hydration state', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Initially not hydrated (we reset this in beforeEach)
      expect(result.current.hasHydrated).toBe(false);
      
      // Set hydrated
      act(() => {
        result.current.setHasHydrated(true);
      });
      
      expect(result.current.hasHydrated).toBe(true);
    });

    it('clearAll preserves hydration state as true', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Set hydrated
      act(() => {
        result.current.setHasHydrated(true);
      });
      
      // Clear all
      act(() => {
        result.current.clearAll();
      });
      
      // Hydration should remain true after clearAll
      expect(result.current.hasHydrated).toBe(true);
    });
  });

  describe('Family Actions', () => {
    it('should switch active child', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Add children
      const children: TestChild[] = [
        { id: 'child-1', name: 'Child 1', familyId: 'family-1' },
        { id: 'child-2', name: 'Child 2', familyId: 'family-1' },
      ];
      
      act(() => {
        useAppStore.setState({
          children: children as any,
          activeChildId: 'child-1',
        });
      });

      // Switch child
      act(() => {
        result.current.switchChild('child-2');
      });
      
      expect(result.current.activeChildId).toBe('child-2');
    });

    it('should not switch to non-existent child', () => {
      const { result } = renderHook(() => useAppStore());
      
      // Add a child
      const child: TestChild = { id: 'child-1', name: 'Child 1', familyId: 'family-1' };
      
      act(() => {
        useAppStore.setState({
          children: [child as any],
          activeChildId: 'child-1',
        });
      });

      // Try to switch to non-existent child
      act(() => {
        result.current.switchChild('non-existent');
      });
      
      // Should remain on current child
      expect(result.current.activeChildId).toBe('child-1');
    });
  });
});