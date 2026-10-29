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
      access_code_redemptions: {
        Row: {
          code_id: string
          environment: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          environment?: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          environment?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      access_codes: {
        Row: {
          active: boolean
          allowed_email: string | null
          code: string
          created_at: string
          duration_days: number | null
          expires_at: string | null
          id: string
          max_uses: number
          note: string | null
          plan: Database["public"]["Enums"]["plan_tier"]
          used_count: number
        }
        Insert: {
          active?: boolean
          allowed_email?: string | null
          code: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          used_count?: number
        }
        Update: {
          active?: boolean
          allowed_email?: string | null
          code?: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          note?: string | null
          plan?: Database["public"]["Enums"]["plan_tier"]
          used_count?: number
        }
        Relationships: []
      }
      data_quality_log: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          provider: string | null
          symbol: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          provider?: string | null
          symbol: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          provider?: string | null
          symbol?: string
        }
        Relationships: []
      }
      data_sync_jobs: {
        Row: {
          error: string | null
          finished_at: string | null
          id: string
          provider: string
          rows_written: number
          started_at: string
          status: string
          symbol: string
        }
        Insert: {
          error?: string | null
          finished_at?: string | null
          id?: string
          provider: string
          rows_written?: number
          started_at?: string
          status?: string
          symbol: string
        }
        Update: {
          error?: string | null
          finished_at?: string | null
          id?: string
          provider?: string
          rows_written?: number
          started_at?: string
          status?: string
          symbol?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          consent_at: string | null
          created_at: string
          newsletter: boolean
          newsletter_frequency: string
          transactional: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_at?: string | null
          created_at?: string
          newsletter?: boolean
          newsletter_frequency?: string
          transactional?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_at?: string | null
          created_at?: string
          newsletter?: boolean
          newsletter_frequency?: string
          transactional?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          base: string
          created_at: string
          provider: string
          quote: string
          rate: number
          rate_date: string
        }
        Insert: {
          base: string
          created_at?: string
          provider?: string
          quote: string
          rate: number
          rate_date: string
        }
        Update: {
          base?: string
          created_at?: string
          provider?: string
          quote?: string
          rate?: number
          rate_date?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string
          created_at: string
          current_amount: number
          id: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_amount?: number
          id?: string
          name: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_amount?: number
          id?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_assets: {
        Row: {
          asset_class: string | null
          benchmark: string | null
          country: string | null
          created_at: string
          currency: string
          data_status: string
          exchange: string | null
          inception_date: string | null
          industry: string | null
          isin: string | null
          kind: string
          last_price: number | null
          last_price_date: string | null
          last_updated_at: string | null
          manager: string | null
          market_cap: number | null
          mic_code: string | null
          name: string
          next_update_at: string | null
          provider: string
          provider_id: string | null
          sector: string | null
          short_name: string | null
          symbol: string
          updated_at: string
        }
        Insert: {
          asset_class?: string | null
          benchmark?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          data_status?: string
          exchange?: string | null
          inception_date?: string | null
          industry?: string | null
          isin?: string | null
          kind?: string
          last_price?: number | null
          last_price_date?: string | null
          last_updated_at?: string | null
          manager?: string | null
          market_cap?: number | null
          mic_code?: string | null
          name: string
          next_update_at?: string | null
          provider?: string
          provider_id?: string | null
          sector?: string | null
          short_name?: string | null
          symbol: string
          updated_at?: string
        }
        Update: {
          asset_class?: string | null
          benchmark?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          data_status?: string
          exchange?: string | null
          inception_date?: string | null
          industry?: string | null
          isin?: string | null
          kind?: string
          last_price?: number | null
          last_price_date?: string | null
          last_updated_at?: string | null
          manager?: string | null
          market_cap?: number | null
          mic_code?: string | null
          name?: string
          next_update_at?: string | null
          provider?: string
          provider_id?: string | null
          sector?: string | null
          short_name?: string | null
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_series: {
        Row: {
          adjusted: boolean
          created_at: string
          currency: string | null
          dividends: Json
          fetched_at: string
          first_date: string | null
          frequency: string
          interval: string
          last_date: string | null
          point_count: number
          points: Json
          provider: string
          splits: Json
          status: string
          symbol: string
          updated_at: string
        }
        Insert: {
          adjusted?: boolean
          created_at?: string
          currency?: string | null
          dividends?: Json
          fetched_at?: string
          first_date?: string | null
          frequency?: string
          interval?: string
          last_date?: string | null
          point_count?: number
          points?: Json
          provider?: string
          splits?: Json
          status?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          adjusted?: boolean
          created_at?: string
          currency?: string | null
          dividends?: Json
          fetched_at?: string
          first_date?: string | null
          frequency?: string
          interval?: string
          last_date?: string | null
          point_count?: number
          points?: Json
          provider?: string
          splits?: Json
          status?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      mortgages: {
        Row: {
          annual_rate: number
          created_at: string
          extra_monthly: number
          id: string
          name: string
          outstanding: number | null
          principal: number
          start_date: string
          term_years: number
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_rate?: number
          created_at?: string
          extra_monthly?: number
          id?: string
          name?: string
          outstanding?: number | null
          principal?: number
          start_date?: string
          term_years?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_rate?: number
          created_at?: string
          extra_monthly?: number
          id?: string
          name?: string
          outstanding?: number | null
          principal?: number
          start_date?: string
          term_years?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          environment: string
          id: string
          invoice_url: string | null
          occurred_at: string
          provider_subscription_id: string | null
          provider_transaction_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          invoice_url?: string | null
          occurred_at?: string
          provider_subscription_id?: string | null
          provider_transaction_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          invoice_url?: string | null
          occurred_at?: string
          provider_subscription_id?: string | null
          provider_transaction_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          created_at: string
          holdings: Json
          id: string
          is_active: boolean
          name: string
          origin: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          holdings?: Json
          id?: string
          is_active?: boolean
          name?: string
          origin?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          holdings?: Json
          id?: string
          is_active?: boolean
          name?: string
          origin?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          full_name: string | null
          id: string
          partner_mode: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id: string
          partner_mode?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          full_name?: string | null
          id?: string
          partner_mode?: boolean
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
          plan: Database["public"]["Enums"]["plan_tier"]
          price_id: string | null
          product_id: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
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
          plan?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          product_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
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
          plan?: Database["public"]["Enums"]["plan_tier"]
          price_id?: string | null
          product_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_profile: {
        Row: {
          cash: number
          monthly_contribution: number
          other_assets: number
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          cash?: number
          monthly_contribution?: number
          other_assets?: number
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          cash?: number
          monthly_contribution?: number
          other_assets?: number
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wealth_snapshots: {
        Row: {
          cash: number
          created_at: string
          debt: number
          id: string
          investments: number
          net_worth: number
          snapshot_date: string
          user_id: string
        }
        Insert: {
          cash?: number
          created_at?: string
          debt?: number
          id?: string
          investments?: number
          net_worth?: number
          snapshot_date?: string
          user_id: string
        }
        Update: {
          cash?: number
          created_at?: string
          debt?: number
          id?: string
          investments?: number
          net_worth?: number
          snapshot_date?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          environment: string
          event_id: string
          event_type: string
          received_at: string
        }
        Insert: {
          environment?: string
          event_id: string
          event_type: string
          received_at?: string
        }
        Update: {
          environment?: string
          event_id?: string
          event_type?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_tier: "free" | "premium" | "pro"
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
      plan_tier: ["free", "premium", "pro"],
    },
  },
} as const
