export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          rate_limit_rpm: number
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          org_id: string
          rate_limit_rpm?: number
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          rate_limit_rpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          id: string
          latency_ms: number | null
          model: string | null
          org_id: string
          status: number
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          org_id: string
          status: number
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          latency_ms?: number | null
          model?: string | null
          org_id?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          detail: Json
          id: string
          org_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          org_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          detail?: Json
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_execution_jobs: {
        Row: {
          benchmark_suite_id: string
          completed_at: string | null
          completed_prompts: number
          concurrency: number
          created_at: string
          created_by: string | null
          id: string
          model_id: string
          raw_telemetry: Json
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          suite_name: string
          total_prompts: number
        }
        Insert: {
          benchmark_suite_id?: string
          completed_at?: string | null
          completed_prompts?: number
          concurrency?: number
          created_at?: string
          created_by?: string | null
          id?: string
          model_id: string
          raw_telemetry?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          suite_name?: string
          total_prompts?: number
        }
        Update: {
          benchmark_suite_id?: string
          completed_at?: string | null
          completed_prompts?: number
          concurrency?: number
          created_at?: string
          created_by?: string | null
          id?: string
          model_id?: string
          raw_telemetry?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          suite_name?: string
          total_prompts?: number
        }
        Relationships: []
      }
      model_embeddings: {
        Row: {
          capability_vector: string
          content: string
          created_at: string
          id: string
          model_id: string
        }
        Insert: {
          capability_vector: string
          content: string
          created_at?: string
          id?: string
          model_id: string
        }
        Update: {
          capability_vector?: string
          content?: string
          created_at?: string
          id?: string
          model_id?: string
        }
        Relationships: []
      }
      multi_agent_judge_evals: {
        Row: {
          bias_mitigation_meta: Json
          candidate_model_id: string
          candidate_output: string
          consensus_score: number | null
          created_at: string
          created_by: string | null
          id: string
          individual_scores: Json
          judge_committee: Json
          prompt_text: string
        }
        Insert: {
          bias_mitigation_meta?: Json
          candidate_model_id: string
          candidate_output: string
          consensus_score?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          individual_scores?: Json
          judge_committee?: Json
          prompt_text: string
        }
        Update: {
          bias_mitigation_meta?: Json
          candidate_model_id?: string
          candidate_output?: string
          consensus_score?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          individual_scores?: Json
          judge_committee?: Json
          prompt_text?: string
        }
        Relationships: []
      }
      organization_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          monthly_budget_usd: number
          name: string
          plan_tier: Database["public"]["Enums"]["org_plan"]
          slug: string
          stripe_customer_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          monthly_budget_usd?: number
          name: string
          plan_tier?: Database["public"]["Enums"]["org_plan"]
          slug: string
          stripe_customer_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          monthly_budget_usd?: number
          name?: string
          plan_tier?: Database["public"]["Enums"]["org_plan"]
          slug?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_my_invites: { Args: never; Returns: number }
      can_manage_org: {
        Args: { _org: string; _user: string }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string; _user: string }; Returns: boolean }
      match_models: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          model_id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      job_status: "queued" | "running" | "completed" | "failed"
      org_plan: "free" | "pro" | "enterprise"
      org_role: "owner" | "admin" | "evaluator" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      job_status: ["queued", "running", "completed", "failed"],
      org_plan: ["free", "pro", "enterprise"],
      org_role: ["owner", "admin", "evaluator", "viewer"],
    },
  },
} as const
