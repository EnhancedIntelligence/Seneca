// Auto-generated database types for Seneca Protocol  
// DO NOT EDIT MANUALLY - regenerated in CI
// Source: Production Supabase schema
// Last updated: 2025-01-01 12:00:00 UTC

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      children: {
        Row: {
          birth_date: string
          created_at: string
          created_by: string
          family_id: string | null
          gender: string | null
          id: string
          name: string
          notes: string | null
          profile_image_url: string | null
          updated_at: string
        }
        Insert: {
          birth_date: string
          created_at?: string
          created_by: string
          family_id?: string | null
          gender?: string | null
          id?: string
          name: string
          notes?: string | null
          profile_image_url?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string
          created_at?: string
          created_by?: string
          family_id?: string | null
          gender?: string | null
          id?: string
          name?: string
          notes?: string | null
          profile_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_memberships: {
        Row: {
          created_at: string
          created_by: string
          family_id: string | null
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["family_role_enum"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          family_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["family_role_enum"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string | null
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["family_role_enum"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_memberships_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_entries: {
        Row: {
          app_context: Json | null
          category: string | null
          child_id: string | null
          classification_confidence: number | null
          content: string
          created_at: string
          created_by: string
          error_message: string | null
          family_id: string | null
          id: string
          image_urls: string[] | null
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          memory_date: string | null
          milestone_confidence: number | null
          milestone_detected: boolean | null
          milestone_type: string | null
          needs_review: boolean | null
          processing_priority: number | null
          processing_status: Database["public"]["Enums"]["processing_status_enum"] | null
          retry_count: number | null
          tags: string[] | null
          title: string | null
          updated_at: string
          video_urls: string[] | null
        }
        Insert: {
          app_context?: Json | null
          category?: string | null
          child_id?: string | null
          classification_confidence?: number | null
          content: string
          created_at?: string
          created_by: string
          error_message?: string | null
          family_id?: string | null
          id?: string
          image_urls?: string[] | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          memory_date?: string | null
          milestone_confidence?: number | null
          milestone_detected?: boolean | null
          milestone_type?: string | null
          needs_review?: boolean | null
          processing_priority?: number | null
          processing_status?: Database["public"]["Enums"]["processing_status_enum"] | null
          retry_count?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          video_urls?: string[] | null
        }
        Update: {
          app_context?: Json | null
          category?: string | null
          child_id?: string | null
          classification_confidence?: number | null
          content?: string
          created_at?: string
          created_by?: string
          error_message?: string | null
          family_id?: string | null
          id?: string
          image_urls?: string[] | null
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          memory_date?: string | null
          milestone_confidence?: number | null
          milestone_detected?: boolean | null
          milestone_type?: string | null
          needs_review?: boolean | null
          processing_priority?: number | null
          processing_status?: Database["public"]["Enums"]["processing_status_enum"] | null
          retry_count?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_entries_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_entries_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_analytics: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          memory_id: string | null
          metadata: Json | null
          model_version: string | null
          stage: string
          status: string
          tokens_used: number | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          memory_id?: string | null
          metadata?: Json | null
          model_version?: string | null
          stage: string
          status: string
          tokens_used?: number | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          memory_id?: string | null
          metadata?: Json | null
          model_version?: string | null
          stage?: string
          status?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_analytics_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memory_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_jobs: {
        Row: {
          id: string
          type: string
          payload: Json
          status: Database["public"]["Enums"]["processing_status_enum"]
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
          status?: Database["public"]["Enums"]["processing_status_enum"]
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
          status?: Database["public"]["Enums"]["processing_status_enum"]
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
        Relationships: []
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
          user_role: Database["public"]["Enums"]["family_role_enum"]
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
    }
    Enums: {
      family_role_enum: "admin" | "parent" | "guardian" | "viewer"
      processing_status_enum:
        | "queued"
        | "processing_classification"
        | "categorized"
        | "processing_embedding"
        | "embedded"
        | "failed"
        | "processing"
        | "completed"
        | "error"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never