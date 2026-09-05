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
      gmail_deposits: {
        Row: {
          admin_note: string
          created_at: string
          gmail_address: string
          id: string
          price: number
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          created_at?: string
          gmail_address: string
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          created_at?: string
          gmail_address?: string
          id?: string
          price?: number
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          banned: boolean
          banned_at: string | null
          banned_reason: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          referral_code: string | null
          referral_count: number
          referral_earned: number
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          banned?: boolean
          banned_at?: string | null
          banned_reason?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          referral_code?: string | null
          referral_count?: number
          referral_earned?: number
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          banned?: boolean
          banned_at?: string | null
          banned_reason?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          referral_code?: string | null
          referral_count?: number
          referral_earned?: number
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          announcement: string
          brand_name: string
          deposits_open: boolean
          ewallets: string[]
          general: string
          general_title: string
          id: number
          min_withdraw: number
          payout_auto: boolean
          payout_provider: string
          price_per_account: number
          referral_commission: number
          referral_enabled: boolean
          referral_info: string
          referral_target: number
          rules: string
          rules_images: string[]
          rules_title: string
          tagline: string
          updated_at: string
          whatsapp: string
          whatsapp_channel: string
          whatsapp_group: string
        }
        Insert: {
          announcement?: string
          brand_name?: string
          deposits_open?: boolean
          ewallets?: string[]
          general?: string
          general_title?: string
          id?: number
          min_withdraw?: number
          payout_auto?: boolean
          payout_provider?: string
          price_per_account?: number
          referral_commission?: number
          referral_enabled?: boolean
          referral_info?: string
          referral_target?: number
          rules?: string
          rules_images?: string[]
          rules_title?: string
          tagline?: string
          updated_at?: string
          whatsapp?: string
          whatsapp_channel?: string
          whatsapp_group?: string
        }
        Update: {
          announcement?: string
          brand_name?: string
          deposits_open?: boolean
          ewallets?: string[]
          general?: string
          general_title?: string
          id?: number
          min_withdraw?: number
          payout_auto?: boolean
          payout_provider?: string
          price_per_account?: number
          referral_commission?: number
          referral_enabled?: boolean
          referral_info?: string
          referral_target?: number
          rules?: string
          rules_images?: string[]
          rules_title?: string
          tagline?: string
          updated_at?: string
          whatsapp?: string
          whatsapp_channel?: string
          whatsapp_group?: string
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
      withdrawals: {
        Row: {
          admin_note: string
          amount: number
          created_at: string
          ewallet: string
          ewallet_name: string
          ewallet_number: string
          id: string
          paid_at: string | null
          payout_error: string
          payout_ref: string
          payout_status: string
          status: Database["public"]["Enums"]["item_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string
          amount: number
          created_at?: string
          ewallet: string
          ewallet_name: string
          ewallet_number: string
          id?: string
          paid_at?: string | null
          payout_error?: string
          payout_ref?: string
          payout_status?: string
          status?: Database["public"]["Enums"]["item_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string
          amount?: number
          created_at?: string
          ewallet?: string
          ewallet_name?: string
          ewallet_number?: string
          id?: string
          paid_at?: string | null
          payout_error?: string
          payout_ref?: string
          payout_status?: string
          status?: Database["public"]["Enums"]["item_status"]
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
      gen_referral_code: { Args: never; Returns: string }
      recalc_balance: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      item_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "user"],
      item_status: ["pending", "approved", "rejected"],
    },
  },
} as const
