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
      bookings: {
        Row: {
          addons: Json | null
          base_price: number
          client_email: string
          client_name: string
          client_notes: string | null
          client_phone: string | null
          client_user_id: string | null
          contract_agreed: boolean
          created_at: string
          deposit_amount: number
          deposit_proof_url: string | null
          edited_photos_count: number | null
          end_time: string
          event_date: string
          id: string
          photographer_id: string
          photographer_notes: string | null
          service: Database["public"]["Enums"]["service_type"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price: number
          travel_fee: number
          updated_at: string
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
          venue_name: string | null
        }
        Insert: {
          addons?: Json | null
          base_price?: number
          client_email: string
          client_name: string
          client_notes?: string | null
          client_phone?: string | null
          client_user_id?: string | null
          contract_agreed?: boolean
          created_at?: string
          deposit_amount?: number
          deposit_proof_url?: string | null
          edited_photos_count?: number | null
          end_time: string
          event_date: string
          id?: string
          photographer_id: string
          photographer_notes?: string | null
          service: Database["public"]["Enums"]["service_type"]
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          travel_fee?: number
          updated_at?: string
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
        }
        Update: {
          addons?: Json | null
          base_price?: number
          client_email?: string
          client_name?: string
          client_notes?: string | null
          client_phone?: string | null
          client_user_id?: string | null
          contract_agreed?: boolean
          created_at?: string
          deposit_amount?: number
          deposit_proof_url?: string | null
          edited_photos_count?: number | null
          end_time?: string
          event_date?: string
          id?: string
          photographer_id?: string
          photographer_notes?: string | null
          service?: Database["public"]["Enums"]["service_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price?: number
          travel_fee?: number
          updated_at?: string
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_name: string
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_name: string
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          package: Database["public"]["Enums"]["package_type"]
          per_photo_price: number | null
          photographer_id: string
          price: number
          service: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          package: Database["public"]["Enums"]["package_type"]
          per_photo_price?: number | null
          photographer_id: string
          price: number
          service: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          package?: Database["public"]["Enums"]["package_type"]
          per_photo_price?: number | null
          photographer_id?: string
          price?: number
          service?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: [
          {
            foreignKeyName: "pricing_rules_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          base_location: string | null
          bio: string | null
          city: string | null
          cliq_alias: string | null
          cover_url: string | null
          created_at: string
          deposit_percent: number
          display_name: string
          equipment: string | null
          id: string
          instagram: string | null
          is_published: boolean
          phone: string | null
          travel_fee_per_km: number
          updated_at: string
          username: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          base_location?: string | null
          bio?: string | null
          city?: string | null
          cliq_alias?: string | null
          cover_url?: string | null
          created_at?: string
          deposit_percent?: number
          display_name: string
          equipment?: string | null
          id: string
          instagram?: string | null
          is_published?: boolean
          phone?: string | null
          travel_fee_per_km?: number
          updated_at?: string
          username: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          base_location?: string | null
          bio?: string | null
          city?: string | null
          cliq_alias?: string | null
          cover_url?: string | null
          created_at?: string
          deposit_percent?: number
          display_name?: string
          equipment?: string | null
          id?: string
          instagram?: string | null
          is_published?: boolean
          phone?: string | null
          travel_fee_per_km?: number
          updated_at?: string
          username?: string
          whatsapp?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "photographer" | "client"
      booking_status:
        | "quote"
        | "pending_deposit"
        | "confirmed"
        | "completed"
        | "cancelled"
      package_type: "hourly" | "full_day" | "addon"
      service_type: "photography" | "cinematic_video"
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
      app_role: ["admin", "photographer", "client"],
      booking_status: [
        "quote",
        "pending_deposit",
        "confirmed",
        "completed",
        "cancelled",
      ],
      package_type: ["hourly", "full_day", "addon"],
      service_type: ["photography", "cinematic_video"],
    },
  },
} as const
