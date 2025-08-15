/**
 * Mock Data Adapter
 * Converts mock data types to match database types
 * All dates are ISO strings as per domain convention
 */

import type { MemoryEntry, Child, ProcessingStatus } from '@/lib/types'
import type { Memory as MockMemory, Child as MockChild, Milestone } from './mockData'
import { toLabels, hasTagLabel } from '@/lib/utils/tags'

// Convert mock memory to database MemoryEntry type
export function mockMemoryToDbMemory(mock: MockMemory): MemoryEntry {
  // Map old processing status values to new enum
  const processingStatusMap: Record<string, ProcessingStatus> = {
    'pending': 'queued',
    'processing': 'processing',
    'completed': 'completed',
    'failed': 'failed'
  }

  return {
    id: mock.id,
    child_id: mock.childId,
    family_id: 'mock-family-1', // Required field - using sensible default
    created_by: 'mock-user-1', // Required field - using sensible default
    title: null,
    content: mock.content,
    memory_date: mock.timestamp, // Already ISO string
    category: null, // Don't derive from tags - keep separate
    tags: mock.tags ? toLabels(mock.tags) : null,
    processing_status: (processingStatusMap[mock.processingStatus || ''] || 'queued') as ProcessingStatus,
    classification_confidence: null,
    milestone_detected: mock.tags ? hasTagLabel(mock.tags, 'milestone') : null,
    milestone_type: null,
    milestone_confidence: null,
    image_urls: null,
    video_urls: null,
    error_message: null,
    created_at: mock.timestamp, // Already ISO string
    updated_at: mock.timestamp, // Already ISO string
    processing_priority: null,
    retry_count: null,
    location_lat: null,
    location_lng: null,
    location_name: mock.location || null,
    app_context: null,
    needs_review: null
  }
}

// Convert mock child to database Child type
export function mockChildToDbChild(mock: MockChild): Child {
  // Calculate birth date from age - for mock purposes only
  // Note: This is approximate and only for UI development
  const birthDate = new Date()
  if (mock.ageUnit === 'years') {
    birthDate.setFullYear(birthDate.getFullYear() - mock.age)
  } else {
    // Months calculation - approximate for mocks
    birthDate.setMonth(birthDate.getMonth() - mock.age)
  }

  return {
    id: mock.id,
    family_id: 'mock-family-1', // Required field - using sensible default
    name: mock.name,
    birth_date: birthDate.toISOString(), // Domain convention: ISO strings
    gender: null,
    notes: null,
    profile_image_url: null,
    created_by: 'mock-user-1', // Required field - using sensible default
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

// Analytics data type for consistency
export interface AnalyticsData {
  totalMemories: number
  totalMilestones: number
  activeChildren: number
  processingHealth: number
  lastWeekGrowth: {
    memories: number
    milestones: number
  }
  monthlyUsage: {
    cost: number
    tokens: number
    processingTime: number
    errorRate: number
  }
}

// Insight data type matching InsightCard expectations
export interface InsightData {
  id: string
  type: 'milestone' | 'pattern' | 'suggestion'
  severity: 'info' | 'success' | 'warning' | 'error'
  title: string
  content: string // Matches InsightCard prop name
  childId: string | null
  timestamp: string // ISO string
}

// Milestone data for UI components
export interface MilestoneData {
  id: string
  childId: string
  title: string
  description: string
  achievedAt: string // ISO string
  category: 'physical' | 'cognitive' | 'social' | 'language' | 'emotional'
  verifiedBy?: 'ai' | 'parent' | 'both'
}

// Helper to check if a value is an ISO date string
export function isISODateString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime()) && date.toISOString() === value
}

// Helper to safely convert to milliseconds
export function toMillis(iso?: string | null): number {
  if (!iso) return 0
  const date = new Date(iso)
  return isNaN(date.getTime()) ? 0 : date.getTime()
}