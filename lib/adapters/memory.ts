/**
 * Bidirectional Memory Adapters
 * Converts between UI camelCase types and DB snake_case types
 * Total functions - no nullable leaks
 */

import type { DbMemory, UIMemory, UIMemoryType, UITag, ProcessingStatus, MemoryEntryInsert, MemoryEntryUpdate } from '@/lib/types';

const deriveType = (m: DbMemory): UIMemoryType => {
  const c = (m.category ?? '').toLowerCase();
  if (['audio', 'voice', 'mic', 'recording'].includes(c)) return 'voice';
  if (['image', 'photo', 'picture', 'pic'].includes(c)) return 'photo';
  if (['video', 'clip'].includes(c)) return 'video';
  if (['event', 'milestone'].includes(c)) return 'event';
  return 'text';
};

const toTags = (arr: string[] | null | undefined): UITag[] =>
  (arr ?? []).map((label) => ({ id: label, label }));

// Helper to check if value is defined (not null or undefined)
const has = <T>(v: T | null | undefined): v is T => v !== null && v !== undefined;

/**
 * Convert DB MemoryEntry to UI-friendly format
 * All nullable fields are handled with safe defaults
 */
export function dbToUiMemory(m: DbMemory): UIMemory {
  return {
    id: m.id,
    childId: m.child_id,
    familyId: m.family_id,
    createdBy: m.created_by,
    title: m.title,
    content: m.content,
    timestamp: m.memory_date ?? m.created_at, // Never null
    type: deriveType(m),
    tags: toTags(m.tags), // Never null, always array
    category: m.category,
    needsReview: m.needs_review ?? false,
    processingStatus: m.processing_status ?? 'queued',
    // Required fields with sensible defaults
    imageUrls: m.image_urls || [],
    videoUrls: m.video_urls || [],
    // Truly optional fields - only include if defined (preserves false/0 values)
    ...(has(m.location_name) ? { locationName: m.location_name } : {}),
    ...(has(m.location_lat) ? { locationLat: m.location_lat } : {}),
    ...(has(m.location_lng) ? { locationLng: m.location_lng } : {}),
    ...(has(m.milestone_detected) ? { milestoneDetected: m.milestone_detected } : {}),
    ...(has(m.milestone_type) ? { milestoneType: m.milestone_type } : {}),
    ...(has(m.milestone_confidence) ? { milestoneConfidence: m.milestone_confidence } : {}),
    ...(has(m.memory_date) ? { memoryDate: m.memory_date } : {}),
  };
}

/**
 * Convert UI memory to DB MemoryEntry Insert format
 */
export function uiToDbMemoryInsert(m: Omit<UIMemory, 'id'>): MemoryEntryInsert {
  return {
    child_id: m.childId,
    family_id: m.familyId,
    created_by: m.createdBy,
    title: m.title,
    content: m.content,
    memory_date: m.timestamp,
    category: m.category ?? m.type, // Pragmatic mapping
    tags: m.tags.map((t) => t.label),
    processing_status: m.processingStatus,
    milestone_detected: m.tags.some(t => t.label === 'milestone'),
    needs_review: m.needsReview,
    // created_at/updated_at are DB defaults
  };
}

/**
 * Convert UI memory to full DB format (for mocking/testing)
 */
export function uiToDbMemory(m: UIMemory): DbMemory {
  const now = new Date().toISOString();
  return {
    id: m.id,
    child_id: m.childId,
    family_id: m.familyId,
    created_by: m.createdBy,
    title: m.title,
    content: m.content,
    memory_date: m.timestamp,
    category: m.category ?? m.type,
    tags: m.tags.map((t) => t.label),
    processing_status: m.processingStatus,
    classification_confidence: null,
    milestone_detected: m.tags.some(t => t.label === 'milestone'),
    milestone_type: null,
    milestone_confidence: null,
    image_urls: null,
    video_urls: null,
    error_message: null,
    created_at: m.timestamp,
    updated_at: now,
    processing_priority: null,
    retry_count: null,
    location_lat: null,
    location_lng: null,
    location_name: null,
    app_context: null,
    needs_review: m.needsReview,
  };
}

/**
 * Convert partial UI updates to DB update format
 */
export function uiUpdateToDb(updates: Partial<UIMemory>): MemoryEntryUpdate {
  const dbUpdate: MemoryEntryUpdate = {};
  
  if (updates.content !== undefined) dbUpdate.content = updates.content;
  if (updates.tags !== undefined) dbUpdate.tags = updates.tags.map(t => t.label);
  if (updates.category !== undefined) dbUpdate.category = updates.category;
  if (updates.processingStatus !== undefined) dbUpdate.processing_status = updates.processingStatus;
  if (updates.needsReview !== undefined) dbUpdate.needs_review = updates.needsReview;
  
  // updated_at handled by DB trigger
  return dbUpdate;
}