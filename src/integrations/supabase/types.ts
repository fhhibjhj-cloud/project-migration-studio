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
      admin_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      central_state: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data: Json
          id?: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      live_chat: {
        Row: {
          created_at: string | null
          id: number
          text: string
          time: string | null
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          text: string
          time?: string | null
          user_name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          text?: string
          time?: string | null
          user_name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: number
          sender: string
          text: string
          ticket_id: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          sender: string
          text: string
          ticket_id?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          sender?: string
          text?: string
          ticket_id?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          combinations_count: number | null
          created_at: string | null
          data: Json | null
          id: string
          payout_tomans: number | null
          replacement_selections: Json | null
          selections: Json
          status: string | null
          submitted_at: string
          total_cost_tomans: number
          user_id: string
          user_name: string
          week_id: string
        }
        Insert: {
          combinations_count?: number | null
          created_at?: string | null
          data?: Json | null
          id: string
          payout_tomans?: number | null
          replacement_selections?: Json | null
          selections?: Json
          status?: string | null
          submitted_at: string
          total_cost_tomans: number
          user_id: string
          user_name: string
          week_id: string
        }
        Update: {
          combinations_count?: number | null
          created_at?: string | null
          data?: Json | null
          id?: string
          payout_tomans?: number | null
          replacement_selections?: Json | null
          selections?: Json
          status?: string | null
          submitted_at?: string
          total_cost_tomans?: number
          user_id?: string
          user_name?: string
          week_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          messages: Json | null
          status: string | null
          subject: string | null
          summary: string | null
          updated_at: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          id: string
          messages?: Json | null
          status?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          messages?: Json | null
          status?: string | null
          subject?: string | null
          summary?: string | null
          updated_at?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_tomans: number
          approved_amount_tomans: number | null
          card_number: string | null
          created_at: string | null
          date: string
          iban: string | null
          id: string
          status: string | null
          tracking_code: string
          type: string
          user_id: string
          user_name: string
          user_numeric_id: number | null
        }
        Insert: {
          amount_tomans: number
          approved_amount_tomans?: number | null
          card_number?: string | null
          created_at?: string | null
          date: string
          iban?: string | null
          id: string
          status?: string | null
          tracking_code: string
          type: string
          user_id: string
          user_name: string
          user_numeric_id?: number | null
        }
        Update: {
          amount_tomans?: number
          approved_amount_tomans?: number | null
          card_number?: string | null
          created_at?: string | null
          date?: string
          iban?: string | null
          id?: string
          status?: string | null
          tracking_code?: string
          type?: string
          user_id?: string
          user_name?: string
          user_numeric_id?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          balance_tomans: number | null
          card_number: string | null
          created_at: string | null
          data: Json | null
          full_name: string
          iban: string | null
          id: string
          is_banned: boolean | null
          is_full_name_locked: boolean | null
          numeric_id: number | null
          password_hash: string | null
          phone: string | null
          role: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          balance_tomans?: number | null
          card_number?: string | null
          created_at?: string | null
          data?: Json | null
          full_name: string
          iban?: string | null
          id: string
          is_banned?: boolean | null
          is_full_name_locked?: boolean | null
          numeric_id?: number | null
          password_hash?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          balance_tomans?: number | null
          card_number?: string | null
          created_at?: string | null
          data?: Json | null
          full_name?: string
          iban?: string | null
          id?: string
          is_banned?: boolean | null
          is_full_name_locked?: boolean | null
          numeric_id?: number | null
          password_hash?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string
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
    Enums: {},
  },
} as const
