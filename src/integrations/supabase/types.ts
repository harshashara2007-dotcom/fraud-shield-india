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
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string | null
          admin_id: string | null
          created_at: string
          id: string
          meta: Json | null
          target: string | null
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          activated_at: string | null
          api_key: string
          created_at: string
          email: string
          id: string
          plan: string
          status: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          api_key: string
          created_at?: string
          email: string
          id?: string
          plan: string
          status?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          api_key?: string
          created_at?: string
          email?: string
          id?: string
          plan?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_by: string | null
          created_at: string
          email: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          created_at?: string
          email: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_by?: string | null
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      deepfakes: {
        Row: {
          city: string | null
          confidence: number
          created_at: string
          file_type: string
          id: string
          report_count: number
          verdict: string
        }
        Insert: {
          city?: string | null
          confidence?: number
          created_at?: string
          file_type: string
          id?: string
          report_count?: number
          verdict: string
        }
        Update: {
          city?: string | null
          confidence?: number
          created_at?: string
          file_type?: string
          id?: string
          report_count?: number
          verdict?: string
        }
        Relationships: []
      }
      phone_blacklist: {
        Row: {
          id: string
          last_reported: string | null
          location: string | null
          number: string
          operator: string | null
          reports: number | null
          scam_type: string | null
        }
        Insert: {
          id?: string
          last_reported?: string | null
          location?: string | null
          number: string
          operator?: string | null
          reports?: number | null
          scam_type?: string | null
        }
        Update: {
          id?: string
          last_reported?: string | null
          location?: string | null
          number?: string
          operator?: string | null
          reports?: number | null
          scam_type?: string | null
        }
        Relationships: []
      }
      safe_numbers: {
        Row: {
          category: string
          company_name: string
          created_at: string
          helpline_number: string
          id: string
          verified: boolean
        }
        Insert: {
          category: string
          company_name: string
          created_at?: string
          helpline_number: string
          id?: string
          verified?: boolean
        }
        Update: {
          category?: string
          company_name?: string
          created_at?: string
          helpline_number?: string
          id?: string
          verified?: boolean
        }
        Relationships: []
      }
      safe_sender_ids: {
        Row: {
          company_name: string
          created_at: string
          id: string
          is_official: boolean
          sender_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          id?: string
          is_official?: boolean
          sender_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          id?: string
          is_official?: boolean
          sender_id?: string
        }
        Relationships: []
      }
      scam_report_events: {
        Row: {
          amount_lost: number | null
          city: string | null
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          report_id: string | null
          state: string | null
          type: string
        }
        Insert: {
          amount_lost?: number | null
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          report_id?: string | null
          state?: string | null
          type: string
        }
        Update: {
          amount_lost?: number | null
          city?: string | null
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          report_id?: string | null
          state?: string | null
          type?: string
        }
        Relationships: []
      }
      scam_reports: {
        Row: {
          amount_lost: number | null
          bank: string | null
          city: string | null
          created_at: string | null
          dedupe_key: string | null
          description: string | null
          duplicate_of: string | null
          fingerprint_hash: string | null
          flagged: boolean
          id: string
          ip_hash: string | null
          lat: number | null
          link: string | null
          lng: number | null
          phone: string | null
          report_count: number
          reporter_contact: string | null
          reporter_id: string | null
          review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          state: string | null
          status: string
          type: string
          upi_id: string | null
          votes: number | null
        }
        Insert: {
          amount_lost?: number | null
          bank?: string | null
          city?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          description?: string | null
          duplicate_of?: string | null
          fingerprint_hash?: string | null
          flagged?: boolean
          id?: string
          ip_hash?: string | null
          lat?: number | null
          link?: string | null
          lng?: number | null
          phone?: string | null
          report_count?: number
          reporter_contact?: string | null
          reporter_id?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          state?: string | null
          status?: string
          type: string
          upi_id?: string | null
          votes?: number | null
        }
        Update: {
          amount_lost?: number | null
          bank?: string | null
          city?: string | null
          created_at?: string | null
          dedupe_key?: string | null
          description?: string | null
          duplicate_of?: string | null
          fingerprint_hash?: string | null
          flagged?: boolean
          id?: string
          ip_hash?: string | null
          lat?: number | null
          link?: string | null
          lng?: number | null
          phone?: string | null
          report_count?: number
          reporter_contact?: string | null
          reporter_id?: string | null
          review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          state?: string | null
          status?: string
          type?: string
          upi_id?: string | null
          votes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scam_reports_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "scam_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_blacklist: {
        Row: {
          id: string
          last_reported: string | null
          reports: number | null
          scam_type: string | null
          upi_id: string
        }
        Insert: {
          id?: string
          last_reported?: string | null
          reports?: number | null
          scam_type?: string | null
          upi_id: string
        }
        Update: {
          id?: string
          last_reported?: string | null
          reports?: number | null
          scam_type?: string | null
          upi_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          monthly_reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          monthly_reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          monthly_reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_scans: {
        Row: {
          created_at: string | null
          id: string
          input_data: string | null
          scan_type: string | null
          user_id: string | null
          verdict: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          input_data?: string | null
          scan_type?: string | null
          user_id?: string | null
          verdict?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          input_data?: string | null
          scan_type?: string | null
          user_id?: string | null
          verdict?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: { _amount: number; _reason: string }
        Returns: number
      }
      admin_ban_by_email: {
        Args: { _email: string; _reason?: string }
        Returns: undefined
      }
      admin_delete_report: { Args: { _id: string }; Returns: undefined }
      admin_demote: { Args: { _user_id: string }; Returns: undefined }
      admin_list_api_keys: {
        Args: { _limit?: number }
        Returns: {
          activated_at: string
          api_key: string
          created_at: string
          email: string
          id: string
          plan: string
          status: string
        }[]
      }
      admin_list_audit: {
        Args: { _limit?: number }
        Returns: {
          action: string
          admin_email: string
          created_at: string
          id: string
          meta: Json
          target: string
        }[]
      }
      admin_list_reports: {
        Args: { _limit?: number; _status?: string }
        Returns: {
          amount_lost: number
          bank: string
          city: string
          created_at: string
          description: string
          flagged: boolean
          id: string
          link: string
          phone: string
          report_count: number
          reporter_contact: string
          review_reason: string
          state: string
          status: string
          type: string
          upi_id: string
        }[]
      }
      admin_list_users: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          email: string
          is_admin: boolean
          is_banned: boolean
          last_sign_in_at: string
          user_id: string
        }[]
      }
      admin_moderate_report: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: undefined
      }
      admin_promote_by_email: {
        Args: { _email: string }
        Returns: {
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      admin_unban: { Args: { _user_id: string }; Returns: undefined }
      get_admin_stats: {
        Args: never
        Returns: {
          approved_reports: number
          flagged_reports: number
          pending_reports: number
          reports_24h: number
          total_deepfakes: number
          total_phone_blacklist: number
          total_reports: number
          total_upi_blacklist: number
          total_users: number
        }[]
      }
      get_or_init_credits: {
        Args: never
        Returns: {
          balance: number
          monthly_reset_at: string
        }[]
      }
      get_reports_by_phone: {
        Args: { _limit?: number; _phone: string }
        Returns: {
          created_at: string
          description: string
          type: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_phone_report: {
        Args: {
          _location?: string
          _number: string
          _operator?: string
          _scam_type?: string
        }
        Returns: undefined
      }
      increment_upi_report: {
        Args: { _scam_type?: string; _upi_id: string }
        Returns: undefined
      }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: { _action: string; _meta?: Json; _target?: string }
        Returns: undefined
      }
      submit_scam_report: {
        Args: {
          _amount_lost?: number
          _bank?: string
          _city: string
          _description: string
          _fingerprint_hash?: string
          _ip_hash?: string
          _lat: number
          _link?: string
          _lng: number
          _phone?: string
          _screenshot_url?: string
          _state: string
          _type: string
          _upi_id?: string
        }
        Returns: {
          duplicate: boolean
          flagged: boolean
          id: string
          report_count: number
          status: string
        }[]
      }
      use_credits: {
        Args: { _amount: number; _reason: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
