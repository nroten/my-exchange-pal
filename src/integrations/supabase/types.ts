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
      daily_targets: {
        Row: {
          created_at: string
          dairy: number
          fats: number
          fruits: number
          id: string
          proteins: number
          starches: number
          updated_at: string
          user_id: string
          vegetables: number
        }
        Insert: {
          created_at?: string
          dairy?: number
          fats?: number
          fruits?: number
          id?: string
          proteins?: number
          starches?: number
          updated_at?: string
          user_id: string
          vegetables?: number
        }
        Update: {
          created_at?: string
          dairy?: number
          fats?: number
          fruits?: number
          id?: string
          proteins?: number
          starches?: number
          updated_at?: string
          user_id?: string
          vegetables?: number
        }
        Relationships: []
      }
      encouragement_messages: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          is_dismissed: boolean
          message: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          is_dismissed?: boolean
          message: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          is_dismissed?: boolean
          message?: string
          to_user_id?: string
        }
        Relationships: []
      }
      macro_foods: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          emoji: string
          fats: number
          id: string
          kind: string
          meal_slot: string
          name: string
          parent_id: string | null
          protein: number
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          emoji?: string
          fats?: number
          id?: string
          kind?: string
          meal_slot?: string
          name: string
          parent_id?: string | null
          protein?: number
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          emoji?: string
          fats?: number
          id?: string
          kind?: string
          meal_slot?: string
          name?: string
          parent_id?: string | null
          protein?: number
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "macro_foods_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "macro_foods"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_logs: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          emoji: string
          fats: number
          food_id: string | null
          food_name: string
          id: string
          is_planned: boolean
          log_date: string
          meal_slot: string
          protein: number
          quantity: number
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          emoji?: string
          fats?: number
          food_id?: string | null
          food_name: string
          id?: string
          is_planned?: boolean
          log_date?: string
          meal_slot?: string
          protein?: number
          quantity?: number
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          emoji?: string
          fats?: number
          food_id?: string | null
          food_name?: string
          id?: string
          is_planned?: boolean
          log_date?: string
          meal_slot?: string
          protein?: number
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      macro_targets: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fats: number
          id: string
          protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          fats?: number
          id?: string
          protein?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fats?: number
          id?: string
          protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          created_at: string
          food_items: Json
          id: string
          log_date: string
          meal_label: string
          total_dairy: number
          total_fats: number
          total_fruits: number
          total_proteins: number
          total_starches: number
          total_vegetables: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_items?: Json
          id?: string
          log_date?: string
          meal_label: string
          total_dairy?: number
          total_fats?: number
          total_fruits?: number
          total_proteins?: number
          total_starches?: number
          total_vegetables?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_items?: Json
          id?: string
          log_date?: string
          meal_label?: string
          total_dairy?: number
          total_fats?: number
          total_fruits?: number
          total_proteins?: number
          total_starches?: number
          total_vegetables?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_connections: {
        Row: {
          created_at: string
          daughter_user_id: string
          id: string
          parent_user_id: string | null
          pin_code: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daughter_user_id: string
          id?: string
          parent_user_id?: string | null
          pin_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daughter_user_id?: string
          id?: string
          parent_user_id?: string | null
          pin_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
          setup_complete: boolean
          tracking_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          setup_complete?: boolean
          tracking_mode?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          setup_complete?: boolean
          tracking_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_meals: {
        Row: {
          created_at: string
          default_meal_label: string | null
          food_items: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_meal_label?: string | null
          food_items?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_meal_label?: string | null
          food_items?: Json
          id?: string
          name?: string
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
