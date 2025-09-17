/**
 * Memory API Contracts
 *
 * TypeScript definitions for the Memory domain API.
 * Aligned with database schema in 20250915_memories_domain_model.sql
 */

// Database enums (match exactly)
export type MemoryKind = 'text' | 'audio' | 'image' | 'video';
export type MemoryStatus = 'draft' | 'ready' | 'processing' | 'error';
export type AIJobKind = 'embed' | 'enrich' | 'milestone';
export type AIJobStatus = 'queued' | 'processing' | 'done' | 'error';

// Client-updatable status subset (server controls processing/error)
export type ClientUpdatableStatus = Extract<MemoryStatus, 'draft' | 'ready'>;

// Core domain types (match database schema)
export interface Memory {
  id: string;
  user_id: string;
  child_id: string | null;
  kind: MemoryKind;
  title: string | null;
  content: string | null;
  status: MemoryStatus;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface MediaAsset {
  id: string;
  memory_id: string;
  storage_path: string;
  mime_type: string;
  // NOTE: BIGINT in Postgres is commonly serialized as string over the wire (PostgREST)
  size_bytes: string;
  width: number | null;
  height: number | null;
  duration: number | null; // seconds for audio/video
  created_at: string;
  updated_at: string;
}

// Convenience shape for responses that include ephemeral links
export interface MediaAssetWithUrl extends MediaAsset {
  signed_url?: string; // short-lived, server-generated
  public_url?: string; // if bucket is public
}

export interface AIJob {
  id: string;
  memory_id: string;
  kind: AIJobKind;
  status: AIJobStatus;
  cost_cents: number;
  attempts: number;
  error_message: string | null;
  result: Record<string, any> | null; // JSONB - will be typed per kind in future
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// API request/response types

// Discriminated create: invalid states become unrepresentable
export type CreateMemoryRequest =
  | {
      kind: 'text';
      child_id?: string | null;
      title?: string | null;
      content: string; // required for text
    }
  | {
      kind: 'audio' | 'image' | 'video';
      child_id?: string | null;
      title?: string | null;
      content?: string | null; // optional caption/notes
    };

export interface UpdateMemoryRequest {
  child_id?: string | null;
  title?: string | null;
  content?: string | null;
  status?: ClientUpdatableStatus; // server rejects processing/error transitions
}

export interface FinalizeMemoryRequest {
  media_assets?: Array<{
    storage_path: string;
    mime_type: string;
    // For requests, a number from the browser is OK; server will persist as BIGINT
    size_bytes: number;
    width?: number | null;
    height?: number | null;
    duration?: number | null;
  }>;
  mark_ready?: boolean; // if true, set status to 'ready'
}

// API response types
export interface MemoryResponse {
  memory: Memory;
  media_assets?: MediaAssetWithUrl[]; // include URLs when relevant
  ai_jobs?: AIJob[];
}

// Cursor-friendly pagination (page/per_page still supported)
export interface MemoriesListResponse {
  memories: Memory[];
  pagination: {
    total?: number; // optional if using cursor-only
    page?: number;
    per_page?: number;
    has_next?: boolean;
    has_prev?: boolean;
    next_cursor?: string | null;
    prev_cursor?: string | null;
  };
}

// Query parameters for GET /api/memories
export interface MemoriesListParams {
  // Pagination
  page?: number;
  per_page?: number; // max 100
  cursor?: string; // opaque cursor; prefer this OR page/per_page, not both

  // Filtering
  child_id?: string;
  kind?: MemoryKind;
  status?: MemoryStatus;
  search?: string; // search in title/content
  from_date?: string; // ISO date
  to_date?: string; // ISO date

  // Sorting
  order_by?: 'created_at' | 'updated_at'; // default 'created_at'
  order?: 'asc' | 'desc'; // default 'desc'

  // Expansion control
  include?: {
    media?: boolean;      // include media_assets
    ai_jobs?: boolean;    // include ai_jobs
    signed_urls?: boolean; // generate signed URLs for media
  };
}

// Standard API error envelope (discriminated union below)
export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  request_id?: string;
}

// Rate limit headers
export interface RateLimitHeaders {
  // Legacy/GitHub-style
  'X-RateLimit-Limit': string; // requests per window
  'X-RateLimit-Remaining': string; // requests left in window
  'X-RateLimit-Reset': string; // unix timestamp when window resets
  'X-RateLimit-Policy': string; // "ip" or "user"
  // Standardized (optional) https://www.rfc-editor.org/rfc/rfc9239
  'RateLimit-Limit'?: string;
  'RateLimit-Remaining'?: string;
  'RateLimit-Reset'?: string;
}

// Utility types for API handlers

export type APIResponse<T> =
  | { ok: true; data: T; request_id: string }
  | { ok: false; error: APIError['error']; request_id?: string };

export type APIHandler<TResponse, TRequest = void> = (
  request: TRequest
) => Promise<APIResponse<TResponse>>;

// Type guards

export function isAPIError<T>(
  response: APIResponse<T>
): response is Extract<APIResponse<T>, { ok: false }> {
  return (response as any)?.ok === false;
}

export function isMemory(obj: any): obj is Memory {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.kind === 'string' &&
    MemoryKindValues.includes(obj.kind as MemoryKind) &&
    typeof obj.status === 'string' &&
    MemoryStatusValues.includes(obj.status as MemoryStatus) &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

export function isMediaAsset(obj: any): obj is MediaAsset {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.memory_id === 'string' &&
    typeof obj.storage_path === 'string' &&
    typeof obj.mime_type === 'string' &&
    // BIGINT-as-string contract
    typeof obj.size_bytes === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.updated_at === 'string'
  );
}

export function isMediaAssetWithUrl(obj: any): obj is MediaAssetWithUrl {
  return isMediaAsset(obj) && (
    !('signed_url' in obj) || typeof obj.signed_url === 'string'
  ) && (
    !('public_url' in obj) || typeof obj.public_url === 'string'
  );
}

// Validation helpers (locked with as const to prevent widening)
export const MemoryKindValues = ['text', 'audio', 'image', 'video'] as const;
export const MemoryStatusValues = ['draft', 'ready', 'processing', 'error'] as const;
export const AIJobKindValues = ['embed', 'enrich', 'milestone'] as const;
export const AIJobStatusValues = ['queued', 'processing', 'done', 'error'] as const;

// Constants
export const MAX_MEMORIES_PER_PAGE = 100;
export const DEFAULT_MEMORIES_PER_PAGE = 20;
export const MAX_CONTENT_LENGTH = 10_000; // characters
export const MAX_TITLE_LENGTH = 200; // characters

// Safe numeric parser for BIGINT strings
export const toSizeNumber = (s: string): number | undefined => {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

// Helper to format bytes for display
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};