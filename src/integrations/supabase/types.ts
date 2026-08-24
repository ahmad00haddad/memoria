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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      booking_disputes: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          raised_by: string
          raised_by_role: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          raised_by: string
          raised_by_role: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          raised_by?: string
          raised_by_role?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          addons: Json | null
          base_price: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_email: string
          client_name: string
          client_notes: string | null
          client_phone: string | null
          client_received_at: string | null
          client_tracking_token: string | null
          client_user_id: string | null
          contract_agreed: boolean
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          delivery_link: string | null
          delivery_days_promised: number | null
          delivery_due_at: string | null
          deposit_amount: number
          deposit_checkout_session_id: string | null
          deposit_confirmed_at: string | null
          deposit_payment_intent_id: string | null
          deposit_payment_provider: string | null
          deposit_proof_url: string | null
          deposit_sent_at: string | null
          edited_photos_count: number | null
          editing_completed_at: string | null
          editing_started_at: string | null
          end_time: string
          event_date: string
          final_paid_amount: number | null
          final_paid_at: string | null
          id: string
          overtime_fee_per_hour: number | null
          photographer_can_publish: boolean
          photographer_id: string
          photographer_notes: string | null
          photos_promised: number | null
          privacy_level: string
          production_stage: string
          refund_amount: number | null
          refund_status: string | null
          selection_link: string | null
          service: Database["public"]["Enums"]["service_type"]
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          token_expires_at: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_email: string
          client_name: string
          client_notes?: string | null
          client_phone?: string | null
          client_received_at?: string | null
          client_tracking_token?: string | null
          client_user_id?: string | null
          contract_agreed?: boolean
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_link?: string | null
          delivery_days_promised?: number | null
          delivery_due_at?: string | null
          deposit_amount?: number
          deposit_checkout_session_id?: string | null
          deposit_confirmed_at?: string | null
          deposit_payment_intent_id?: string | null
          deposit_payment_provider?: string | null
          deposit_proof_url?: string | null
          deposit_sent_at?: string | null
          edited_photos_count?: number | null
          editing_completed_at?: string | null
          editing_started_at?: string | null
          end_time: string
          event_date: string
          final_paid_amount?: number | null
          final_paid_at?: string | null
          id?: string
          overtime_fee_per_hour?: number | null
          photographer_can_publish?: boolean
          photographer_id: string
          photographer_notes?: string | null
          photos_promised?: number | null
          privacy_level?: string
          production_stage?: string
          refund_amount?: number | null
          refund_status?: string | null
          selection_link?: string | null
          service: Database["public"]["Enums"]["service_type"]
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          token_expires_at?: string | null
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
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_email?: string
          client_name?: string
          client_notes?: string | null
          client_phone?: string | null
          client_received_at?: string | null
          client_tracking_token?: string | null
          client_user_id?: string | null
          contract_agreed?: boolean
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_link?: string | null
          delivery_days_promised?: number | null
          delivery_due_at?: string | null
          deposit_amount?: number
          deposit_checkout_session_id?: string | null
          deposit_confirmed_at?: string | null
          deposit_payment_intent_id?: string | null
          deposit_payment_provider?: string | null
          deposit_proof_url?: string | null
          deposit_sent_at?: string | null
          edited_photos_count?: number | null
          editing_completed_at?: string | null
          editing_started_at?: string | null
          end_time?: string
          event_date?: string
          final_paid_amount?: number | null
          final_paid_at?: string | null
          id?: string
          overtime_fee_per_hour?: number | null
          photographer_can_publish?: boolean
          photographer_id?: string
          photographer_notes?: string | null
          photos_promised?: number | null
          privacy_level?: string
          production_stage?: string
          refund_amount?: number | null
          refund_status?: string | null
          selection_link?: string | null
          service?: Database["public"]["Enums"]["service_type"]
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          token_expires_at?: string | null
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
      contract_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          photographer_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          photographer_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          photographer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          body: string
          booking_id: string
          client_name: string
          client_signature: string | null
          created_at: string
          deleted_at: string | null
          id: string
          photographer_id: string
          sign_token: string
          signed_at: string | null
          signed_ip: string | null
          status: string
          updated_at: string
        }
        Insert: {
          body: string
          booking_id: string
          client_name: string
          client_signature?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          photographer_id: string
          sign_token?: string
          signed_at?: string | null
          signed_ip?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          booking_id?: string
          client_name?: string
          client_signature?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          photographer_id?: string
          sign_token?: string
          signed_at?: string | null
          signed_ip?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_galleries: {
        Row: {
          allow_downloads: boolean
          booking_id: string
          cover_path: string | null
          created_at: string
          expires_at: string | null
          id: string
          photographer_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          allow_downloads?: boolean
          booking_id: string
          cover_path?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          photographer_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          allow_downloads?: boolean
          booking_id?: string
          cover_path?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          photographer_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_galleries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_photos: {
        Row: {
          caption: string | null
          created_at: string
          gallery_id: string
          id: string
          position: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          gallery_id: string
          id?: string
          position?: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          gallery_id?: string
          id?: string
          position?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_photos_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "delivery_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          provider_id: string | null
          recipient: string
          related_booking_id: string | null
          related_user_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          recipient: string
          related_booking_id?: string | null
          related_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          provider_id?: string | null
          recipient?: string
          related_booking_id?: string | null
          related_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          booking_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string | null
          sender_name: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          booking_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          processed_at: string
          provider: string
          related_booking_id: string | null
          related_user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id: string
          processed_at?: string
          provider: string
          related_booking_id?: string | null
          related_user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          processed_at?: string
          provider?: string
          related_booking_id?: string | null
          related_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_related_booking_id_fkey"
            columns: ["related_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_private: {
        Row: {
          bank_info: string | null
          cliq_alias: string | null
          created_at: string
          external_ical_auto_sync: boolean
          external_ical_synced_at: string | null
          external_ical_url: string | null
          ical_token: string | null
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          bank_info?: string | null
          cliq_alias?: string | null
          created_at?: string
          external_ical_auto_sync?: boolean
          external_ical_synced_at?: string | null
          external_ical_url?: string | null
          ical_token?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          bank_info?: string | null
          cliq_alias?: string | null
          created_at?: string
          external_ical_auto_sync?: boolean
          external_ical_synced_at?: string | null
          external_ical_url?: string | null
          ical_token?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photographer_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photographer_unavailability: {
        Row: {
          created_at: string
          date: string
          id: string
          photographer_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          photographer_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          photographer_id?: string
          reason?: string | null
        }
        Relationships: []
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
          booking_notes: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          deleted_at: string | null
          deposit_percent: number
          deposit_refund_percent: number | null
          deposit_refund_policy: string
          display_name: string
          equipment: string | null
          fixed_deposit: number | null
          free_km: number
          id: string
          instagram: string | null
          is_featured: boolean
          is_published: boolean
          min_session_minutes: number
          onboarding_completed_at: string | null
          onboarding_step: number
          portfolio_urls: string[]
          quickstart_dismissed_at: string | null
          referral_code: string | null
          referred_by: string | null
          tagline: string | null
          travel_fee_per_km: number
          updated_at: string
          username: string
          verification_status: string
        }
        Insert: {
          avatar_url?: string | null
          base_location?: string | null
          bio?: string | null
          booking_notes?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_percent?: number
          deposit_refund_percent?: number | null
          deposit_refund_policy?: string
          display_name: string
          equipment?: string | null
          fixed_deposit?: number | null
          free_km?: number
          id: string
          instagram?: string | null
          is_featured?: boolean
          is_published?: boolean
          min_session_minutes?: number
          onboarding_completed_at?: string | null
          onboarding_step?: number
          portfolio_urls?: string[]
          quickstart_dismissed_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          tagline?: string | null
          travel_fee_per_km?: number
          updated_at?: string
          username: string
          verification_status?: string
        }
        Update: {
          avatar_url?: string | null
          base_location?: string | null
          bio?: string | null
          booking_notes?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          deleted_at?: string | null
          deposit_percent?: number
          deposit_refund_percent?: number | null
          deposit_refund_policy?: string
          display_name?: string
          equipment?: string | null
          fixed_deposit?: number | null
          free_km?: number
          id?: string
          instagram?: string | null
          is_featured?: boolean
          is_published?: boolean
          min_session_minutes?: number
          onboarding_completed_at?: string | null
          onboarding_step?: number
          portfolio_urls?: string[]
          quickstart_dismissed_at?: string | null
          referral_code?: string | null
          referred_by?: string | null
          tagline?: string | null
          travel_fee_per_km?: number
          updated_at?: string
          username?: string
          verification_status?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          reward_granted: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          reward_granted?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_granted?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          client_name: string
          client_user_id: string | null
          comment: string | null
          created_at: string
          id: string
          is_published: boolean
          photographer_id: string
          rating: number
        }
        Insert: {
          booking_id: string
          client_name: string
          client_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          photographer_id: string
          rating: number
        }
        Update: {
          booking_id?: string
          client_name?: string
          client_user_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          photographer_id?: string
          rating?: number
        }
        Relationships: []
      }
      shot_list_items: {
        Row: {
          booking_id: string
          created_at: string
          description: string | null
          done_at: string | null
          id: string
          photographer_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description?: string | null
          done_at?: string | null
          id?: string
          photographer_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string | null
          done_at?: string | null
          id?: string
          photographer_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shot_list_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          cliq_reference: string | null
          created_at: string
          currency: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          period_months: number
          photographer_id: string
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount?: number
          cliq_reference?: string | null
          created_at?: string
          currency?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          period_months?: number
          photographer_id: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          cliq_reference?: string | null
          created_at?: string
          currency?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          period_months?: number
          photographer_id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          photographer_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          photographer_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          photographer_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
          updated_at?: string
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
      whatsapp_templates: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          photographer_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          photographer_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          photographer_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_renew_subscription: {
        Args: { _months: number; _photographer_id: string }
        Returns: undefined
      }
      admin_set_published: {
        Args: { _photographer_id: string; _published: boolean }
        Returns: undefined
      }
      approve_review: { Args: { _review_id: string }; Returns: undefined }
      booking_token_exists: { Args: { _token: string }; Returns: boolean }
      cancel_booking: {
        Args: { _booking_id: string; _reason: string }
        Returns: Json
      }
      client_add_note: {
        Args: { _note: string; _token: string }
        Returns: undefined
      }
      client_cancel_booking: {
        Args: { _reason: string; _token: string }
        Returns: Json
      }
      client_mark_deposit_sent: {
        Args: {
          _note: string
          _proof_path: string
          _reference: string
          _token: string
        }
        Returns: undefined
      }
      client_mark_received: { Args: { _token: string }; Returns: undefined }
      confirm_booking_deposit_paid: {
        Args: {
          _booking_id: string
          _intent?: string
          _provider: string
          _session?: string
        }
        Returns: Json
      }
      create_booking_guarded: { Args: { _payload: Json }; Returns: Json }
      delete_photographer_cascade: {
        Args: { _photographer_id: string }
        Returns: undefined
      }
      get_booking_by_token: { Args: { _token: string }; Returns: Json }
      get_photographer_busy_dates: { Args: { _pid: string }; Returns: string[] }
      get_public_profile_data: { Args: { p_id: string }; Returns: Json }
      get_referrer_id: { Args: { _code: string }; Returns: string }
      has_booking_conflict: {
        Args: {
          _date: string
          _end: string
          _exclude?: string
          _pid: string
          _start: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_photographer_busy: {
        Args: { _date: string; _pid: string }
        Returns: boolean
      }
      is_subscription_active: {
        Args: { _photographer_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _after?: Json
          _before?: Json
          _entity_id: string
          _entity_type: string
        }
        Returns: undefined
      }
      refresh_featured_photographers: { Args: never; Returns: undefined }
      regenerate_booking_token: {
        Args: { _booking_id: string }
        Returns: string
      }
      reject_review: { Args: { _review_id: string }; Returns: undefined }
      renew_subscription_paid: {
        Args: {
          _amount: number
          _months: number
          _photographer_id: string
          _provider: string
          _ref: string
        }
        Returns: undefined
      }
      restore_photographer: {
        Args: { _photographer_id: string }
        Returns: undefined
      }
      search_photographers: {
        Args: {
          _available_date?: string
          _city?: string
          _limit?: number
          _max_price?: number
          _min_price?: number
          _query?: string
          _sort?: string
        }
        Returns: {
          avatar_url: string
          avg_rating: number
          bio: string
          city: string
          cover_url: string
          display_name: string
          is_featured: boolean
          min_price: number
          review_count: number
          tagline: string
          username: string
          verification_status: string
        }[]
      }
      seed_default_shot_list: {
        Args: { _booking_id: string; _service: string }
        Returns: undefined
      }
      seed_default_whatsapp_templates: {
        Args: { _photographer_id: string }
        Returns: undefined
      }
      soft_delete_booking: { Args: { _booking_id: string }; Returns: undefined }
      soft_delete_photographer: {
        Args: { _photographer_id: string }
        Returns: undefined
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
      payment_method: "cliq" | "stripe"
      payment_status: "pending" | "approved" | "rejected"
      service_type: "photography" | "cinematic_video"
      subscription_plan: "starter"
      subscription_status:
        | "trial"
        | "active"
        | "pending_review"
        | "expired"
        | "canceled"
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
      payment_method: ["cliq", "stripe"],
      payment_status: ["pending", "approved", "rejected"],
      service_type: ["photography", "cinematic_video"],
      subscription_plan: ["starter"],
      subscription_status: [
        "trial",
        "active",
        "pending_review",
        "expired",
        "canceled",
      ],
    },
  },
} as const
