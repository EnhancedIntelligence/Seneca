/**
 * Bidirectional Memory Adapters
 * Converts between UI camelCase types and DB snake_case types
 */

import type { MemoryEntry, ProcessingStatus, Tag, MemoryType } from '@/lib/types';

// UI-friendly memory type with camelCase
export type UIMemory = {
  id: string;
  childId: string;
  familyId: string | null;
  content: string;
  memoryType: MemoryType | null;
  memoryDate: string | null;
  category: string | null;
  tags: Tag[] | null;
  processingStatus: ProcessingStatus;
  milestoneDetected: boolean | null;
  imageUrls: string[] | null;
  videoUrls: string[] | null;
  locationName: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Convert DB MemoryEntry to UI-friendly format
 */
export function dbToUiMemory(db: MemoryEntry): UIMemory {
  return {
    id: db.id,
    childId: db.child_id,
    familyId: db.family_id,
    content: db.content,
    memoryType: null, // Add when DB has memory_type field
    memoryDate: db.memory_date,
    category: db.category,
    tags: db.tags as Tag[] | null,
    processingStatus: db.processing_status,
    milestoneDetected: db.milestone_detected,
    imageUrls: db.image_urls,
    videoUrls: db.video_urls,
    locationName: db.location_name,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Convert UI memory draft to DB MemoryEntry for creation
 */
export function uiToDbMemory(input: {
  childId: string;
  content: string;
  memoryType?: MemoryType;
  tags?: Tag[];
  familyId?: string;
}): MemoryEntry {
  const now = new Date().toISOString();
  return {
    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    child_id: input.childId,
    family_id: input.familyId || 'mock-family-1',
    created_by: 'mock-user-1',
    title: null,
    content: input.content,
    memory_date: now,
    category: null,
    tags: input.tags || null,
    processing_status: 'queued',
    classification_confidence: null,
    milestone_detected: input.tags?.includes('milestone') || null,
    milestone_type: null,
    milestone_confidence: null,
    image_urls: null,
    video_urls: null,
    error_message: null,
    created_at: now,
    updated_at: now,
    processing_priority: null,
    retry_count: null,
    location_lat: null,
    location_lng: null,
    location_name: null,
    app_context: null,
    needs_review: null,
  };
}

/**
 * Convert partial UI updates to DB update format
 */
export function uiUpdateToDb(updates: Partial<UIMemory>): Partial<MemoryEntry> {
  const dbUpdate: Partial<MemoryEntry> = {};
  
  if (updates.content !== undefined) dbUpdate.content = updates.content;
  if (updates.tags !== undefined) dbUpdate.tags = updates.tags;
  if (updates.category !== undefined) dbUpdate.category = updates.category;
  if (updates.processingStatus !== undefined) dbUpdate.processing_status = updates.processingStatus;
  if (updates.milestoneDetected !== undefined) dbUpdate.milestone_detected = updates.milestoneDetected;
  if (updates.locationName !== undefined) dbUpdate.location_name = updates.locationName;
  
  dbUpdate.updated_at = new Date().toISOString();
  
  return dbUpdate;
}