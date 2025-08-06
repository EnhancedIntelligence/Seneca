export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
        Relationships: []
      }
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
      embeddings_index: {
        Row: {
          created_at: string
          embedding_data: string | null
          family_id: string | null
          id: string
          memory_id: string | null
        }
        Insert: {
          created_at?: string
          embedding_data?: string | null
          family_id?: string | null
          id?: string
          memory_id?: string | null
        }
        Update: {
          created_at?: string
          embedding_data?: string | null
          family_id?: string | null
          id?: string
          memory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "embeddings_index_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embeddings_index_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memory_entries"
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
      family_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          family_id: string | null
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["family_role_enum"] | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          family_id?: string | null
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["family_role_enum"] | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          family_id?: string | null
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["family_role_enum"] | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
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
      members: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      members_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          history_id: string
          member_id: string
          new_email: string | null
          new_full_name: string | null
          old_email: string | null
          old_full_name: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          history_id?: string
          member_id: string
          new_email?: string | null
          new_full_name?: string | null
          old_email?: string | null
          old_full_name?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          history_id?: string
          member_id?: string
          new_email?: string | null
          new_full_name?: string | null
          old_email?: string | null
          old_full_name?: string | null
        }
        Relationships: []
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
          processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
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
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
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
          processing_status?:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
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
      memory_processing_analytics: {
        Row: {
          cost_cents: number | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          memory_id: string | null
          processing_step: string
          success: boolean | null
          tokens_used: number | null
        }
        Insert: {
          cost_cents?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          memory_id?: string | null
          processing_step: string
          success?: boolean | null
          tokens_used?: number | null
        }
        Update: {
          cost_cents?: number | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          memory_id?: string | null
          processing_step?: string
          success?: boolean | null
          tokens_used?: number | null
        }
        Relationships: []
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
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      api_add_child: {
        Args: {
          family_uuid: string
          child_name: string
          child_birth_date?: string
          child_profile_photo_url?: string
        }
        Returns: string
      }
      api_create_memory: {
        Args:
          | {
              p_family_id: string
              p_child_id: string
              p_title: string
              p_content: string
            }
          | {
              p_family_id: string
              p_content: string
              p_child_id?: string
              p_title?: string
              p_memory_date?: string
              p_category?: string
              p_tags?: string[]
              p_image_urls?: string[]
              p_video_urls?: string[]
              p_location_lat?: number
              p_location_lng?: number
              p_location_name?: string
              p_app_context?: Json
            }
        Returns: string
      }
      api_create_memory_entry: {
        Args: {
          p_family_id: string
          p_content: string
          p_child_id: string
          p_title: string
          p_memory_date?: string
          p_category?: string
          p_tags?: string[]
          p_image_urls?: string[]
          p_video_urls?: string[]
          p_location_lat?: number
          p_location_lng?: number
          p_location_name?: string
          p_app_context?: Json
        }
        Returns: string
      }
      api_delete_child: {
        Args: { child_uuid: string }
        Returns: boolean
      }
      api_get_children: {
        Args: { family_uuid: string }
        Returns: {
          child_id: string
          name: string
          birth_date: string
          profile_photo_url: string
          created_at: string
          updated_at: string
          created_by_email: string
        }[]
      }
      api_get_memories: {
        Args:
          | { p_family_id: string; p_child_id?: string }
          | {
              p_family_id: string
              p_child_id?: string
              p_limit?: number
              p_offset?: number
            }
        Returns: {
          id: string
          family_id: string
          child_id: string
          title: string
          content: string
          processing_status: string
          created_by: string
          created_at: string
          updated_at: string
        }[]
      }
      api_get_memories_with_content: {
        Args: {
          p_family_id: string
          p_content: string
          p_child_id?: string
          p_title?: string
          p_memory_date?: string
          p_category?: string
          p_tags?: string[]
          p_image_urls?: string[]
          p_video_urls?: string[]
          p_location_lat?: number
          p_location_lng?: number
          p_location_name?: string
          p_app_context?: Json
        }
        Returns: string
      }
      api_get_memory_entries: {
        Args: { p_family_id: string; p_child_id?: string }
        Returns: {
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
          processing_status:
            | Database["public"]["Enums"]["processing_status_enum"]
            | null
          retry_count: number | null
          tags: string[] | null
          title: string | null
          updated_at: string
          video_urls: string[] | null
        }[]
      }
      api_get_memory_entries_table: {
        Args: {
          p_family_id: string
          p_child_id?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          memory_id: string
          child_id: string
          child_name: string
          title: string
          content: string
          memory_date: string
          category: string
          tags: string[]
          processing_status: string
          needs_review: boolean
          created_at: string
          created_by_email: string
        }[]
      }
      api_search_memories: {
        Args: {
          _family_id: string
          _query: string
          _by_user: string
          _limit?: number
          _offset?: number
        }
        Returns: Json
      }
      api_update_child: {
        Args: {
          child_uuid: string
          child_name?: string
          child_birth_date?: string
          child_profile_photo_url?: string
        }
        Returns: boolean
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      get_user_families: {
        Args: Record<PropertyKey, never>
        Returns: {
          family_id: string
          family_name: string
          user_role: string
          joined_at: string
        }[]
      }
      get_user_families_with_children: {
        Args: Record<PropertyKey, never>
        Returns: {
          family_id: string
          family_name: string
          user_role: string
          joined_at: string
          child_count: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_family_admin: {
        Args: { family_uuid: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      suggest_child_for_memory: {
        Args: {
          p_family_id: string
          p_memory_title: string
          p_requestor_id: string
        }
        Returns: Json
      }
      track_processing_stage: {
        Args: {
          p_memory_id: string
          p_stage: string
          p_status: string
          p_duration_ms?: number
          p_error?: string
          p_metadata?: Json
        }
        Returns: undefined
      }
      user_belongs_to_family: {
        Args: { fam: string }
        Returns: boolean
      }
      user_family_role: {
        Args: { fid: string }
        Returns: Database["public"]["Enums"]["family_role_enum"]
      }
      user_in_family: {
        Args: { fid: string }
        Returns: boolean
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      family_role_enum: ["admin", "parent", "guardian", "viewer"],
      processing_status_enum: [
        "queued",
        "processing_classification",
        "categorized",
        "processing_embedding",
        "embedded",
        "failed",
        "processing",
        "completed",
        "error",
      ],
    },
  },
} as const
