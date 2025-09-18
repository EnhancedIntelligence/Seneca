// Production Database Types
// Auto-generated from Supabase production schema

import type { Database } from "./database.generated";
export type { Database } from "./database.generated";

// Common utility types that work with any database schema
export type DatabaseRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type DatabaseInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type DatabaseUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Specific table types
export type Family = DatabaseRow<"families">;
export type Child = DatabaseRow<"children">;
export type Memory = DatabaseRow<"memories">;
export type FamilyMembership = DatabaseRow<"family_memberships">;
export type QueueJob = DatabaseRow<"queue_jobs">;

export type FamilyInsert = DatabaseInsert<"families">;
export type ChildInsert = DatabaseInsert<"children">;
export type MemoryInsert = DatabaseInsert<"memories">;
export type FamilyMembershipInsert = DatabaseInsert<"family_memberships">;
export type QueueJobInsert = DatabaseInsert<"queue_jobs">;

export type FamilyUpdate = DatabaseUpdate<"families">;
export type ChildUpdate = DatabaseUpdate<"children">;
export type MemoryUpdate = DatabaseUpdate<"memories">;
export type FamilyMembershipUpdate = DatabaseUpdate<"family_memberships">;
export type QueueJobUpdate = DatabaseUpdate<"queue_jobs">;

// Legacy aliases for backward compatibility
export type MemoryEntry = Memory;
export type MemoryEntryInsert = MemoryInsert;
export type MemoryEntryUpdate = MemoryUpdate;

// Enum types from database
export type ProcessingStatus =
  Database["public"]["Enums"]["processing_status_enum"];
export type QueueStatus = Database["public"]["Enums"]["queue_status_enum"];
export type FamilyRole = Database["public"]["Enums"]["family_role_enum"];
export type MemoryKind = Database["public"]["Enums"]["memory_kind"];
export type MemoryStatus = Database["public"]["Enums"]["memory_status"];

// Legacy aliases for backward compatibility
export type JobStatus = QueueStatus;
export type JobType =
  | "process_memory"
  | "ai_processing"
  | "embedding_generation";
export type MembershipRole = FamilyRole;
