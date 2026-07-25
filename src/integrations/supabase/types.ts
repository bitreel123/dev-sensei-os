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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      code_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          file_id: string
          id: string
          repo_id: string
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          file_id: string
          id?: string
          repo_id: string
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          file_id?: string
          id?: string
          repo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_chunks_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "code_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_chunks_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "code_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      code_edges: {
        Row: {
          created_at: string
          dst_external: string | null
          dst_file_id: string | null
          dst_symbol: string | null
          id: string
          kind: string
          repo_id: string
          src_file_id: string | null
          src_symbol: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dst_external?: string | null
          dst_file_id?: string | null
          dst_symbol?: string | null
          id?: string
          kind: string
          repo_id: string
          src_file_id?: string | null
          src_symbol?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          dst_external?: string | null
          dst_file_id?: string | null
          dst_symbol?: string | null
          id?: string
          kind?: string
          repo_id?: string
          src_file_id?: string | null
          src_symbol?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_edges_dst_file_id_fkey"
            columns: ["dst_file_id"]
            isOneToOne: false
            referencedRelation: "code_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_edges_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "code_repos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_edges_src_file_id_fkey"
            columns: ["src_file_id"]
            isOneToOne: false
            referencedRelation: "code_files"
            referencedColumns: ["id"]
          },
        ]
      }
      code_files: {
        Row: {
          created_at: string
          embedding: string | null
          id: string
          language: string | null
          path: string
          repo_id: string
          sha: string | null
          size: number | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: string
          language?: string | null
          path: string
          repo_id: string
          sha?: string | null
          size?: number | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: string
          language?: string | null
          path?: string
          repo_id?: string
          sha?: string | null
          size?: number | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_files_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "code_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      code_repos: {
        Row: {
          created_at: string
          default_branch: string
          edge_count: number
          file_count: number
          full_name: string
          id: string
          last_scanned_at: string | null
          last_scanned_sha: string | null
          symbol_count: number
          updated_at: string
          user_id: string
          webhook_id: number | null
          webhook_secret: string | null
        }
        Insert: {
          created_at?: string
          default_branch?: string
          edge_count?: number
          file_count?: number
          full_name: string
          id?: string
          last_scanned_at?: string | null
          last_scanned_sha?: string | null
          symbol_count?: number
          updated_at?: string
          user_id: string
          webhook_id?: number | null
          webhook_secret?: string | null
        }
        Update: {
          created_at?: string
          default_branch?: string
          edge_count?: number
          file_count?: number
          full_name?: string
          id?: string
          last_scanned_at?: string | null
          last_scanned_sha?: string | null
          symbol_count?: number
          updated_at?: string
          user_id?: string
          webhook_id?: number | null
          webhook_secret?: string | null
        }
        Relationships: []
      }
      code_scans: {
        Row: {
          error: string | null
          files_done: number
          files_total: number
          finished_at: string | null
          id: string
          phase: string | null
          repo_id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          error?: string | null
          files_done?: number
          files_total?: number
          finished_at?: string | null
          id?: string
          phase?: string | null
          repo_id: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          error?: string | null
          files_done?: number
          files_total?: number
          finished_at?: string | null
          id?: string
          phase?: string | null
          repo_id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_scans_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "code_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      code_snapshots: {
        Row: {
          edge_count: number
          file_count: number
          id: string
          repo_id: string
          sha: string
          symbol_count: number
          taken_at: string
          user_id: string
        }
        Insert: {
          edge_count?: number
          file_count?: number
          id?: string
          repo_id: string
          sha: string
          symbol_count?: number
          taken_at?: string
          user_id: string
        }
        Update: {
          edge_count?: number
          file_count?: number
          id?: string
          repo_id?: string
          sha?: string
          symbol_count?: number
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_snapshots_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "code_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      code_symbols: {
        Row: {
          created_at: string
          docstring: string | null
          end_line: number | null
          file_id: string
          id: string
          kind: string
          name: string
          repo_id: string
          signature: string | null
          start_line: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          docstring?: string | null
          end_line?: number | null
          file_id: string
          id?: string
          kind: string
          name: string
          repo_id: string
          signature?: string | null
          start_line?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          docstring?: string | null
          end_line?: number | null
          file_id?: string
          id?: string
          kind?: string
          name?: string
          repo_id?: string
          signature?: string | null
          start_line?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "code_symbols_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "code_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "code_symbols_repo_id_fkey"
            columns: ["repo_id"]
            isOneToOne: false
            referencedRelation: "code_repos"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_usage: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          environment: string
          id: string
          mode: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          environment?: string
          id?: string
          mode: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          environment?: string
          id?: string
          mode?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      extension_tokens: {
        Row: {
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      github_connections: {
        Row: {
          access_token: string
          active_repo: string | null
          avatar_url: string | null
          created_at: string
          github_id: number
          login: string
          scopes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          active_repo?: string | null
          avatar_url?: string | null
          created_at?: string
          github_id: number
          login: string
          scopes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          active_repo?: string | null
          avatar_url?: string | null
          created_at?: string
          github_id?: number
          login?: string
          scopes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      intel_memory: {
        Row: {
          created_at: string
          id: string
          mode: string
          payload: Json
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          payload?: Json
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          payload?: Json
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string
          id: string
          message: string
          metadata: Json
          read_at: string | null
          severity: string
          source: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          severity?: string
          source?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          severity?: string
          source?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          environment: string
          monthly_credits: number
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          environment?: string
          monthly_credits?: number
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          environment?: string
          monthly_credits?: number
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credit: {
        Args: {
          p_amount: number
          p_env?: string
          p_mode?: string
          p_session_id?: string
          p_user_id: string
        }
        Returns: {
          balance: number
          ok: boolean
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_canceled_subscriptions: { Args: never; Returns: number }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      match_code_chunks: {
        Args: { p_limit?: number; p_query: string; p_repo_id: string }
        Returns: {
          chunk_id: string
          content: string
          file_id: string
          path: string
          similarity: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
