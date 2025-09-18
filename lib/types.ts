// Import the generated Database type instead of defining it manually
import type { Database, Json } from "./database.generated";

// Re-export for convenience
export type { Database, Json };

// The Database interface is now imported from database.generated.ts
// All table types below will use the generated definitions

// Convenience type exports
export type Family = Database["public"]["Tables"]["families"]["Row"];
export type Child = Database["public"]["Tables"]["children"]["Row"];
export type Memory = Database["public"]["Tables"]["memories"]["Row"];
export type MemoryEntry = Memory; // Legacy alias for compatibility
export type FamilyMembership =
  Database["public"]["Tables"]["family_memberships"]["Row"];
export type EmbeddingsIndex =
  Database["public"]["Tables"]["embeddings_index"]["Row"];
export type FamilyInvitation =
  Database["public"]["Tables"]["family_invitations"]["Row"];
export type MemoryProcessingAnalytics =
  Database["public"]["Tables"]["memory_processing_analytics"]["Row"];
export type ProcessingAnalytics =
  Database["public"]["Tables"]["processing_analytics"]["Row"];
export type Member = Database["public"]["Tables"]["members"]["Row"];
export type MemberHistory =
  Database["public"]["Tables"]["members_history"]["Row"];
// export type User = Database['public']['Tables']['users']['Row'] // users table doesn't exist
export type QueueJob = Database["public"]["Tables"]["queue_jobs"]["Row"];

// Enum type exports
export type ProcessingStatus =
  Database["public"]["Enums"]["processing_status_enum"];
export type FamilyRole = Database["public"]["Enums"]["family_role_enum"];
export type MemoryKind = Database["public"]["Enums"]["memory_kind"];
export type MemoryStatus = Database["public"]["Enums"]["memory_status"];

// UI-specific types (will be mapped to DB types)
export type MemoryType = "voice" | "text" | "manual";
export type MilestoneCategory =
  | "physical"
  | "cognitive"
  | "social"
  | "language"
  | "emotional";
export type TagLabel =
  | "milestone"
  | "language"
  | "cognitive"
  | "social"
  | "physical"
  | "emotional"
  | "creative"
  | "eating"
  | "sleep"
  | "play";
export type AgeUnit = "months" | "years";
export type Weather = "sunny" | "cloudy" | "rainy" | "snowy" | "partly-cloudy";
export type Mood = "happy" | "tired" | "upset" | "excited" | "calm";

// Legacy compatibility types for existing code
export type LegacyProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// Insert/Update types for common operations
export type MemoryInsert =
  Database["public"]["Tables"]["memories"]["Insert"];
export type MemoryUpdate =
  Database["public"]["Tables"]["memories"]["Update"];
// Legacy aliases for compatibility
export type MemoryEntryInsert = MemoryInsert;
export type MemoryEntryUpdate = MemoryUpdate;
export type FamilyInsert = Database["public"]["Tables"]["families"]["Insert"];
export type ChildInsert = Database["public"]["Tables"]["children"]["Insert"];
export type ChildUpdate = Database["public"]["Tables"]["children"]["Update"];
export type FamilyMembershipInsert =
  Database["public"]["Tables"]["family_memberships"]["Insert"];
export type QueueJobInsert =
  Database["public"]["Tables"]["queue_jobs"]["Insert"];
export type QueueJobUpdate =
  Database["public"]["Tables"]["queue_jobs"]["Update"];

// ==== DB shapes (snake_case, nullable where source is nullable) ====
export type DbMemory = MemoryEntry; // Alias for clarity
export type DbChild = Child; // Alias for clarity

// ==== UI shapes (camelCase, total/non-null where possible) ====
export type UITag = { id: string; label: string };
// Back-compat alias for existing imports
export type Tag = UITag;
export type UIMemoryType = "text" | "voice" | "photo" | "video" | "event";

export type UIMemory = {
  id: string;
  childId: string | null;
  familyId: string | null;
  createdBy: string;
  title: string | null;
  content: string;
  timestamp: string; // memory_date ?? created_at
  type: UIMemoryType; // derived from category/media
  tags: UITag[]; // never null, always array
  category: string | null; // optional passthrough
  needsReview: boolean;
  processingStatus: ProcessingStatus;
  // Required media fields with empty array defaults
  imageUrls: string[];
  videoUrls: string[];
  // Truly optional fields - only present when data exists
  locationName?: string;
  locationLat?: number;
  locationLng?: number;
  milestoneDetected?: boolean;
  milestoneType?: string;
  milestoneConfidence?: number;
  memoryDate?: string;
};

export type UIChild = {
  id: string;
  familyId: string | null;
  name: string;
  avatarUrl: string | null;
  birthDate: string | null;
  age: { years: number; months: number } | null; // computed
  initials: string; // computed
  emoji: string; // computed (fallback)
  gradient: string; // computed
  createdAt: string;
  updatedAt: string;
};
