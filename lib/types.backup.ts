// Json type for Supabase compatibility
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      children: {
        Row: {
          id: string
          family_id: string | null
          name: string
          birth_date: string
          gender: string | null
          notes: string | null
          profile_image_url: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id?: string | null
          name: string
          birth_date: string
          gender?: string | null
          notes?: string | null
          profile_image_url?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string | null
          name?: string
          birth_date?: string
          gender?: string | null
          notes?: string | null
          profile_image_url?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      memory_entries: {
        Row: {
          id: string
          child_id: string | null
          family_id: string | null
          created_by: string
          title: string | null
          content: string
          memory_date: string | null
          category: string | null
          tags: string[] | null
          processing_status: Database['public']['Enums']['processing_status_enum']
          classification_confidence: number | null
          milestone_detected: boolean | null
          milestone_type: string | null
          milestone_confidence: number | null
          image_urls: string[] | null
          video_urls: string[] | null
          error_message: string | null
          created_at: string
          updated_at: string
          processing_priority: number | null
          retry_count: number | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          app_context: Json | null
          needs_review: boolean | null
        }
        Insert: {
          id?: string
          child_id?: string | null
          family_id?: string | null
          created_by: string
          title?: string | null
          content: string
          memory_date?: string | null
          category?: string | null
          tags?: string[] | null
          processing_status?: Database['public']['Enums']['processing_status_enum']
          classification_confidence?: number | null
          milestone_detected?: boolean | null
          milestone_type?: string | null
          milestone_confidence?: number | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
          processing_priority?: number | null
          retry_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          app_context?: Json | null
          needs_review?: boolean | null
        }
        Update: {
          id?: string
          child_id?: string | null
          family_id?: string | null
          created_by?: string
          title?: string | null
          content?: string
          memory_date?: string | null
          category?: string | null
          tags?: string[] | null
          processing_status?: Database['public']['Enums']['processing_status_enum']
          classification_confidence?: number | null
          milestone_detected?: boolean | null
          milestone_type?: string | null
          milestone_confidence?: number | null
          image_urls?: string[] | null
          video_urls?: string[] | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
          processing_priority?: number | null
          retry_count?: number | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          app_context?: Json | null
          needs_review?: boolean | null
        }
      }
      queue_jobs: {
        Row: {
          id: string
          type: string
          payload: Json
          status: Database['public']['Enums']['processing_status_enum']
          created_at: string
          updated_at: string
          scheduled_for: string | null
          attempts: number
          max_attempts: number
          error_message: string | null
          completed_at: string | null
          priority: number | null
          locked_at: string | null
          locked_by: string | null
        }
        Insert: {
          id?: string
          type: string
          payload: Json
          status?: Database['public']['Enums']['processing_status_enum']
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
          attempts?: number
          max_attempts?: number
          error_message?: string | null
          completed_at?: string | null
          priority?: number | null
          locked_at?: string | null
          locked_by?: string | null
        }
        Update: {
          id?: string
          type?: string
          payload?: Json
          status?: Database['public']['Enums']['processing_status_enum']
          created_at?: string
          updated_at?: string
          scheduled_for?: string | null
          attempts?: number
          max_attempts?: number
          error_message?: string | null
          completed_at?: string | null
          priority?: number | null
          locked_at?: string | null
          locked_by?: string | null
        }
      }
      family_memberships: {
        Row: {
          id: string
          family_id: string | null
          user_id: string | null
          role: Database['public']['Enums']['family_role_enum']
          invited_by: string | null
          joined_at: string
          created_at: string
          created_by: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id?: string | null
          user_id?: string | null
          role?: Database['public']['Enums']['family_role_enum']
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          created_by?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string | null
          user_id?: string | null
          role?: Database['public']['Enums']['family_role_enum']
          invited_by?: string | null
          joined_at?: string
          created_at?: string
          created_by?: string
          updated_at?: string
        }
      }
      embeddings_index: {
        Row: {
          id: string
          memory_id: string | null
          embedding_data: string | null
          family_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          memory_id?: string | null
          embedding_data?: string | null
          family_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          memory_id?: string | null
          embedding_data?: string | null
          family_id?: string | null
          created_at?: string
        }
      }
      family_invitations: {
        Row: {
          id: string
          family_id: string | null
          email: string
          role: Database['public']['Enums']['family_role_enum']
          invited_by: string
          status: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          family_id?: string | null
          email: string
          role?: Database['public']['Enums']['family_role_enum']
          invited_by: string
          status?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          family_id?: string | null
          email?: string
          role?: Database['public']['Enums']['family_role_enum']
          invited_by?: string
          status?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      memory_processing_analytics: {
        Row: {
          id: string
          memory_id: string | null
          processing_step: string
          duration_ms: number | null
          tokens_used: number | null
          cost_cents: number | null
          success: boolean | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          memory_id?: string | null
          processing_step: string
          duration_ms?: number | null
          tokens_used?: number | null
          cost_cents?: number | null
          success?: boolean | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          memory_id?: string | null
          processing_step?: string
          duration_ms?: number | null
          tokens_used?: number | null
          cost_cents?: number | null
          success?: boolean | null
          error_message?: string | null
          created_at?: string | null
        }
      }
      processing_analytics: {
        Row: {
          id: string
          memory_id: string | null
          stage: string
          status: string
          duration_ms: number | null
          tokens_used: number | null
          model_version: string | null
          error_message: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          memory_id?: string | null
          stage: string
          status: string
          duration_ms?: number | null
          tokens_used?: number | null
          model_version?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          memory_id?: string | null
          stage?: string
          status?: string
          duration_ms?: number | null
          tokens_used?: number | null
          model_version?: string | null
          error_message?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
      members: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      members_history: {
        Row: {
          history_id: string
          member_id: string
          old_email: string | null
          old_full_name: string | null
          new_email: string | null
          new_full_name: string | null
          changed_at: string | null
          changed_by: string | null
        }
        Insert: {
          history_id?: string
          member_id: string
          old_email?: string | null
          old_full_name?: string | null
          new_email?: string | null
          new_full_name?: string | null
          changed_at?: string | null
          changed_by?: string | null
        }
        Update: {
          history_id?: string
          member_id?: string
          old_email?: string | null
          old_full_name?: string | null
          new_email?: string | null
          new_full_name?: string | null
          changed_at?: string | null
          changed_by?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      _log: {
        Row: {
          key: string
          val: string | null
        }
        Insert: {
          key: string
          val?: string | null
        }
        Update: {
          key?: string
          val?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_family_metrics: {
        Args: { family_id: string }
        Returns: {
          total_memories: number
          total_children: number
          total_members: number
          pending_ai_jobs: number
          completed_ai_jobs: number
          failed_ai_jobs: number
        }[]
      }
      get_user_families_with_counts: {
        Args: { user_id: string }
        Returns: {
          family_id: string
          family_name: string
          user_role: Database['public']['Enums']['family_role_enum']
          member_count: number
          child_count: number
        }[]
      }
      get_job_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_jobs: number
          pending_jobs: number
          processing_jobs: number
          completed_jobs: number
          failed_jobs: number
          avg_processing_time: string
        }[]
      }
      handle_job_failure: {
        Args: { job_id: string; error_message: string }
        Returns: void
      }
      get_failed_jobs: {
        Args: { limit_count: number }
        Returns: Database['public']['Tables']['queue_jobs']['Row'][]
      }
      cleanup_stuck_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_family_with_counts: {
        Args: { family_id: string }
        Returns: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
          member_count: number
          child_count: number
          memory_count: number
        }[]
      }
      search_memories_semantic: {
        Args: { family_id: string; query_text: string; result_limit: number }
        Returns: Database['public']['Tables']['memory_entries']['Row'][]
      }
    }
    Enums: {
      processing_status_enum: 'queued' | 'processing_classification' | 'categorized' | 'processing_embedding' | 'embedded' | 'failed' | 'processing' | 'completed' | 'error'
      family_role_enum: 'parent' | 'guardian' | 'admin'
    }
  }
}

// Convenience type exports
export type Family = Database['public']['Tables']['families']['Row']
export type Child = Database['public']['Tables']['children']['Row']
export type MemoryEntry = Database['public']['Tables']['memory_entries']['Row']
export type FamilyMembership = Database['public']['Tables']['family_memberships']['Row']
export type EmbeddingsIndex = Database['public']['Tables']['embeddings_index']['Row']
export type FamilyInvitation = Database['public']['Tables']['family_invitations']['Row']
export type MemoryProcessingAnalytics = Database['public']['Tables']['memory_processing_analytics']['Row']
export type ProcessingAnalytics = Database['public']['Tables']['processing_analytics']['Row']
export type Member = Database['public']['Tables']['members']['Row']
export type MemberHistory = Database['public']['Tables']['members_history']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type QueueJob = Database['public']['Tables']['queue_jobs']['Row']

// Enum type exports
export type ProcessingStatus = Database['public']['Enums']['processing_status_enum']
export type FamilyRole = Database['public']['Enums']['family_role_enum']

// UI-specific types (will be mapped to DB types)
export type MemoryType = 'voice' | 'text' | 'manual';
export type MilestoneCategory = 'physical' | 'cognitive' | 'social' | 'language' | 'emotional';
export type TagLabel =
  | 'milestone' | 'language' | 'cognitive' | 'social'
  | 'physical' | 'emotional' | 'creative' | 'eating' | 'sleep' | 'play';
export type AgeUnit = 'months' | 'years';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'partly-cloudy';
export type Mood = 'happy' | 'tired' | 'upset' | 'excited' | 'calm';

// Legacy compatibility types for existing code
export type LegacyProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Insert/Update types for common operations
export type MemoryEntryInsert = Database['public']['Tables']['memory_entries']['Insert']
export type MemoryEntryUpdate = Database['public']['Tables']['memory_entries']['Update']
export type FamilyInsert = Database['public']['Tables']['families']['Insert']
export type ChildInsert = Database['public']['Tables']['children']['Insert']
export type ChildUpdate = Database['public']['Tables']['children']['Update']
export type FamilyMembershipInsert = Database['public']['Tables']['family_memberships']['Insert']
export type QueueJobInsert = Database['public']['Tables']['queue_jobs']['Insert']
export type QueueJobUpdate = Database['public']['Tables']['queue_jobs']['Update']

// ==== DB shapes (snake_case, nullable where source is nullable) ====
export type DbMemory = MemoryEntry; // Alias for clarity
export type DbChild = Child; // Alias for clarity

// ==== UI shapes (camelCase, total/non-null where possible) ====
export type UITag = { id: string; label: string };
// Back-compat alias for existing imports
export type Tag = UITag;
export type UIMemoryType = 'text' | 'voice' | 'photo' | 'video' | 'event';

export type UIMemory = {
  id: string;
  childId: string | null;
  familyId: string | null;
  createdBy: string;
  title: string | null;
  content: string;
  timestamp: string;           // memory_date ?? created_at
  type: UIMemoryType;          // derived from category/media
  tags: UITag[];               // never null, always array
  category: string | null;     // optional passthrough
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
  initials: string;            // computed
  emoji: string;               // computed (fallback)
  gradient: string;            // computed
  createdAt: string;
  updatedAt: string;
};