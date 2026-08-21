/**
 * GENERADO — no editar a mano.
 *
 * Fuente: el esquema de supabase/migrations/. Regenerar con:
 *   npm run db:types
 *
 * Estos tipos son el contrato con Postgres. Los tipos de dominio escritos a
 * mano viven en ../types/core.ts, y database.types.test.ts verifica que los dos
 * coincidan — una discrepancia es un bug en alguno de los dos, y se resuelve en
 * el momento. Ver .claude/workflows/database-change.md §5.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          app_version: string | null
          id: string
          name: string
          occurred_at: string
          platform: string | null
          props: Json
          session_id: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          id?: string
          name: string
          occurred_at?: string
          platform?: string | null
          props?: Json
          session_id: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          id?: string
          name?: string
          occurred_at?: string
          platform?: string | null
          props?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          conversation_id: string | null
          created_at: string
          ends_at: string
          id: string
          note: string | null
          professional_id: string
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          conversation_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          note?: string | null
          professional_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          conversation_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          note?: string | null
          professional_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          category_id: string
          created_at: string
          id: string
          last_turn_at: string | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          last_turn_at?: string | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          last_turn_at?: string | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_threads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_turns: {
        Row: {
          body: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["assistant_role"]
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["assistant_role"]
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["assistant_role"]
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_turns_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          occurred_at: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
        }
        Relationships: []
      }
      availability_exceptions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_open: boolean
          on_date: string
          professional_id: string
          starts_at: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_open: boolean
          on_date: string
          professional_id: string
          starts_at?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_open?: boolean
          on_date?: string
          professional_id?: string
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          professional_id: string
          starts_at: string
          weekday: number
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          professional_id: string
          starts_at: string
          weekday: number
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          professional_id?: string
          starts_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_professional_id: string | null
          blocked_user_id: string | null
          blocker_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_professional_id?: string | null
          blocked_user_id?: string | null
          blocker_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_professional_id?: string | null
          blocked_user_id?: string | null
          blocker_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_professional_id_fkey"
            columns: ["blocked_professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_user_id_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_key: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_key: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_key?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          professional_id: string
          professional_read_at: string | null
          user_id: string
          user_read_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          professional_id: string
          professional_read_at?: string | null
          user_id: string
          user_read_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          professional_id?: string
          professional_read_at?: string | null
          user_id?: string
          user_read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          created_at: string
          id: string
          is_saved: boolean
          portfolio_item_id: string
          source: Database["public"]["Enums"]["interaction_source"]
          updated_at: string
          user_id: string
          verdict: Database["public"]["Enums"]["interaction_verdict"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_saved?: boolean
          portfolio_item_id: string
          source: Database["public"]["Enums"]["interaction_source"]
          updated_at?: string
          user_id: string
          verdict: Database["public"]["Enums"]["interaction_verdict"]
        }
        Update: {
          created_at?: string
          id?: string
          is_saved?: boolean
          portfolio_item_id?: string
          source?: Database["public"]["Enums"]["interaction_source"]
          updated_at?: string
          user_id?: string
          verdict?: Database["public"]["Enums"]["interaction_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          admin_area: string | null
          city: string
          country_code: string
          created_at: string
          group_key: string | null
          id: string
          kind: string
          lat: number | null
          lng: number | null
          metro_key: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          admin_area?: string | null
          city: string
          country_code: string
          created_at?: string
          group_key?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          metro_key: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          admin_area?: string | null
          city?: string
          country_code?: string
          created_at?: string
          group_key?: string | null
          id?: string
          kind?: string
          lat?: number | null
          lng?: number | null
          metro_key?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          band: Database["public"]["Enums"]["match_band"]
          components: Json
          computed_at: string
          created_at: string
          id: string
          matching_version: string
          professional_id: string
          project_id: string | null
          project_key: string
          reasons: Json
          score: number
          taste_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          band: Database["public"]["Enums"]["match_band"]
          components?: Json
          computed_at?: string
          created_at?: string
          id?: string
          matching_version: string
          professional_id: string
          project_id?: string | null
          project_key?: string
          reasons?: Json
          score: number
          taste_version: string
          updated_at?: string
          user_id: string
        }
        Update: {
          band?: Database["public"]["Enums"]["match_band"]
          components?: Json
          computed_at?: string
          created_at?: string
          id?: string
          matching_version?: string
          professional_id?: string
          project_id?: string | null
          project_key?: string
          reasons?: Json
          score?: number
          taste_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          blurhash: string | null
          bucket: string
          byte_size: number | null
          checksum: string | null
          created_at: string
          height: number | null
          id: string
          mime_type: string
          owner_user_id: string | null
          path: string
          width: number | null
        }
        Insert: {
          blurhash?: string | null
          bucket: string
          byte_size?: number | null
          checksum?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          owner_user_id?: string | null
          path: string
          width?: number | null
        }
        Update: {
          blurhash?: string | null
          bucket?: string
          byte_size?: number | null
          checksum?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          owner_user_id?: string | null
          path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_user_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_user_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          outcome: Database["public"]["Enums"]["report_status"] | null
          read_at: string | null
          report_id: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          outcome?: Database["public"]["Enums"]["report_status"] | null
          read_at?: string | null
          report_id?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          outcome?: Database["public"]["Enums"]["report_status"] | null
          read_at?: string | null
          report_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_item_styles: {
        Row: {
          portfolio_item_id: string
          style_id: string
          weight: number
        }
        Insert: {
          portfolio_item_id: string
          style_id: string
          weight: number
        }
        Update: {
          portfolio_item_id?: string
          style_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_item_styles_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_item_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_featured: boolean
          is_fixture: boolean
          media_id: string
          professional_id: string
          sort_order: number
          year: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_fixture?: boolean
          media_id: string
          professional_id: string
          sort_order?: number
          year?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          is_fixture?: boolean
          media_id?: string
          professional_id?: string
          sort_order?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: true
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_claims: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          code: string
          created_at: string
          professional_id: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          code: string
          created_at?: string
          professional_id: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          code?: string
          created_at?: string
          professional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_claims_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_claims_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: true
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_styles: {
        Row: {
          is_primary: boolean
          professional_id: string
          proficiency: number
          style_id: string
        }
        Insert: {
          is_primary?: boolean
          professional_id: string
          proficiency: number
          style_id: string
        }
        Update: {
          is_primary?: boolean
          professional_id?: string
          proficiency?: number
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_styles_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          availability_status:
            | Database["public"]["Enums"]["availability_status"]
            | null
          availability_updated_at: string | null
          avatar_media_id: string | null
          bio: string | null
          category_id: string
          claimed_at: string | null
          created_at: string
          display_name: string
          hero_media_id: string | null
          id: string
          instagram_handle: string | null
          is_fixture: boolean
          is_published: boolean
          location_id: string | null
          owner_user_id: string | null
          price_currency: string | null
          price_max_cents: number | null
          price_min_cents: number | null
          priced_at: string | null
          slug: string
          studio_lat: number | null
          studio_lng: number | null
          travels: boolean
          updated_at: string
          whatsapp_e164: string | null
        }
        Insert: {
          availability_status?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          availability_updated_at?: string | null
          avatar_media_id?: string | null
          bio?: string | null
          category_id: string
          claimed_at?: string | null
          created_at?: string
          display_name: string
          hero_media_id?: string | null
          id?: string
          instagram_handle?: string | null
          is_fixture?: boolean
          is_published?: boolean
          location_id?: string | null
          owner_user_id?: string | null
          price_currency?: string | null
          price_max_cents?: number | null
          price_min_cents?: number | null
          priced_at?: string | null
          slug: string
          studio_lat?: number | null
          studio_lng?: number | null
          travels?: boolean
          updated_at?: string
          whatsapp_e164?: string | null
        }
        Update: {
          availability_status?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          availability_updated_at?: string | null
          avatar_media_id?: string | null
          bio?: string | null
          category_id?: string
          claimed_at?: string | null
          created_at?: string
          display_name?: string
          hero_media_id?: string | null
          id?: string
          instagram_handle?: string | null
          is_fixture?: boolean
          is_published?: boolean
          location_id?: string | null
          owner_user_id?: string | null
          price_currency?: string | null
          price_max_cents?: number | null
          price_min_cents?: number | null
          priced_at?: string | null
          slug?: string
          studio_lat?: number | null
          studio_lng?: number | null
          travels?: boolean
          updated_at?: string
          whatsapp_e164?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_avatar_media_id_fkey"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_hero_media_id_fkey"
            columns: ["hero_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adult_confirmed_at: string | null
          analytics_opt_in: boolean
          avatar_media_id: string | null
          city_location_id: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          notifications_opt_in: boolean
          onboarding_intent:
            | Database["public"]["Enums"]["onboarding_intent"]
            | null
          saves_seen_at: string | null
          updated_at: string
        }
        Insert: {
          adult_confirmed_at?: string | null
          analytics_opt_in?: boolean
          avatar_media_id?: string | null
          city_location_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          notifications_opt_in?: boolean
          onboarding_intent?:
            | Database["public"]["Enums"]["onboarding_intent"]
            | null
          saves_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          adult_confirmed_at?: string | null
          analytics_opt_in?: boolean
          avatar_media_id?: string | null
          city_location_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          notifications_opt_in?: boolean
          onboarding_intent?:
            | Database["public"]["Enums"]["onboarding_intent"]
            | null
          saves_seen_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_media_id_fkey"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_city_location_id_fkey"
            columns: ["city_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_interests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          price_currency: string | null
          price_max_cents: number | null
          price_min_cents: number | null
          professional_id: string
          project_id: string
          sessions: number | null
          verdict: Database["public"]["Enums"]["professional_verdict"]
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          price_currency?: string | null
          price_max_cents?: number | null
          price_min_cents?: number | null
          professional_id: string
          project_id: string
          sessions?: number | null
          verdict: Database["public"]["Enums"]["professional_verdict"]
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          price_currency?: string | null
          price_max_cents?: number | null
          price_min_cents?: number | null
          professional_id?: string
          project_id?: string
          sessions?: number | null
          verdict?: Database["public"]["Enums"]["professional_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "project_interests_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_interests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_references: {
        Row: {
          created_at: string
          media_id: string
          project_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          media_id: string
          project_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          media_id?: string
          project_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_references_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_styles: {
        Row: {
          project_id: string
          style_id: string
          weight: number
        }
        Insert: {
          project_id: string
          style_id: string
          weight: number
        }
        Update: {
          project_id?: string
          style_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_styles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_traits: {
        Row: {
          project_id: string
          trait_id: string
        }
        Insert: {
          project_id: string
          trait_id: string
        }
        Update: {
          project_id?: string
          trait_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_traits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_traits_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "traits"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_currency: string | null
          budget_max_cents: number | null
          budget_min_cents: number | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_open_to_professionals: boolean
          location_id: string | null
          size_note: string | null
          status: Database["public"]["Enums"]["project_status"]
          timing: Database["public"]["Enums"]["project_timing"] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_currency?: string | null
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_open_to_professionals?: boolean
          location_id?: string | null
          size_note?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          timing?: Database["public"]["Enums"]["project_timing"] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_currency?: string | null
          budget_max_cents?: number | null
          budget_min_cents?: number | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_open_to_professionals?: boolean
          location_id?: string | null
          size_note?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          timing?: Database["public"]["Enums"]["project_timing"] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          assistant_turn_id: string | null
          created_at: string
          id: string
          message_id: string | null
          note: string | null
          portfolio_item_id: string | null
          professional_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          review_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_kind: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          assistant_turn_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          note?: string | null
          portfolio_item_id?: string | null
          professional_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          review_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_kind: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          assistant_turn_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          note?: string | null
          portfolio_item_id?: string | null
          professional_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_user_id?: string
          review_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_kind?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_assistant_turn_id_fkey"
            columns: ["assistant_turn_id"]
            isOneToOne: false
            referencedRelation: "assistant_turns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string
          body: string | null
          created_at: string
          id: string
          media_id: string | null
          professional_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          appointment_id: string
          body?: string | null
          created_at?: string
          id?: string
          media_id?: string | null
          professional_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string
          body?: string | null
          created_at?: string
          id?: string
          media_id?: string | null
          professional_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          portfolio_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          portfolio_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          portfolio_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_portfolio_item_id_fkey"
            columns: ["portfolio_item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
        ]
      }
      styles: {
        Row: {
          aliases: string[]
          category_id: string
          created_at: string
          description_key: string
          id: string
          is_active: boolean
          name_key: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          category_id: string
          created_at?: string
          description_key: string
          id?: string
          is_active?: boolean
          name_key: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          category_id?: string
          created_at?: string
          description_key?: string
          id?: string
          is_active?: boolean
          name_key?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "styles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      taste_profiles: {
        Row: {
          algo_version: string
          aversion: Json
          category_id: string
          computed_at: string
          created_at: string
          decisive_count: number
          is_ready: boolean
          updated_at: string
          user_id: string
          vector: Json
        }
        Insert: {
          algo_version: string
          aversion?: Json
          category_id: string
          computed_at?: string
          created_at?: string
          decisive_count?: number
          is_ready?: boolean
          updated_at?: string
          user_id: string
          vector?: Json
        }
        Update: {
          algo_version?: string
          aversion?: Json
          category_id?: string
          computed_at?: string
          created_at?: string
          decisive_count?: number
          is_ready?: boolean
          updated_at?: string
          user_id?: string
          vector?: Json
        }
        Relationships: [
          {
            foreignKeyName: "taste_profiles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taste_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      traits: {
        Row: {
          category_id: string
          created_at: string
          dimension: Database["public"]["Enums"]["trait_dimension"]
          id: string
          is_active: boolean
          name_key: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          dimension: Database["public"]["Enums"]["trait_dimension"]
          id?: string
          is_active?: boolean
          name_key: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          dimension?: Database["public"]["Enums"]["trait_dimension"]
          id?: string
          is_active?: boolean
          name_key?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "traits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_thread_project: {
        Args: { p_project_id: string; p_thread_id: string }
        Returns: undefined
      }
      cancel_appointment: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      claim_professional: { Args: { p_code: string }; Returns: string }
      confirm_adult: { Args: never; Returns: undefined }
      create_own_professional: {
        Args: {
          p_display_name: string
          p_instagram?: string
          p_whatsapp?: string
        }
        Returns: string
      }
      delete_own_account: { Args: never; Returns: undefined }
      export_own_account: { Args: never; Returns: Json }
      get_artist_grid: {
        Args: {
          p_category_slug: string
          p_limit?: number
          p_pieces?: number
          p_seed?: string
        }
        Returns: {
          avatar_path: string
          display_name: string
          is_fixture: boolean
          neighborhood_slug: string
          pieces: Json
          professional_id: string
          slug: string
          studio_lat: number
          studio_lng: number
        }[]
      }
      get_busy_slots: {
        Args: { p_from: string; p_professional_id: string; p_to: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_discovery_feed: {
        Args: {
          p_category_slug: string
          p_cursor?: string
          p_include_seen?: boolean
          p_limit?: number
        }
        Returns: {
          caption: string
          feed_cursor: string
          media_blurhash: string
          media_bucket: string
          media_height: number
          media_path: string
          media_width: number
          portfolio_item_id: string
          professional_display_name: string
          professional_id: string
          professional_slug: string
          styles: Json
          year: number
        }[]
      }
      get_my_appointments: {
        Args: never
        Returns: {
          conversation_id: string
          counterpart_name: string
          ends_at: string
          id: string
          note: string
          professional_id: string
          starts_at: string
          viewer_is_professional: boolean
        }[]
      }
      get_open_search_feed: {
        Args: { p_category_slug: string; p_cursor?: string; p_limit?: number }
        Returns: {
          budget_currency: string
          budget_max_cents: number
          budget_min_cents: number
          created_at: string
          description: string
          location_slug: string
          project_id: string
          reference_paths: string[]
          size_note: string
          style_slugs: string[]
          timing: Database["public"]["Enums"]["project_timing"]
          title: string
        }[]
      }
      get_open_search_traits: {
        Args: { p_project_id: string }
        Returns: {
          dimension: Database["public"]["Enums"]["trait_dimension"]
          slug: string
        }[]
      }
      get_own_save_counts: {
        Args: { p_since?: string }
        Returns: {
          last_saved_at: string
          portfolio_item_id: string
          saves: number
          saves_since: number
        }[]
      }
      get_reply_habit: {
        Args: { p_professional_id: string }
        Returns: Database["public"]["Enums"]["reply_habit"]
      }
      get_review_summary: {
        Args: { p_professional_id: string }
        Returns: {
          average: number
          reviews_count: number
        }[]
      }
      get_reviewable_appointments: {
        Args: never
        Returns: {
          appointment_id: string
          conversation_id: string
          ends_at: string
          professional_display_name: string
          professional_id: string
          professional_slug: string
        }[]
      }
      get_reviews: {
        Args: { p_limit?: number; p_offset?: number; p_professional_id: string }
        Returns: {
          appointment_ends_at: string
          body: string
          created_at: string
          edited: boolean
          id: string
          media_path: string
          rating: number
        }[]
      }
      get_search_interests: {
        Args: { p_project_id?: string }
        Returns: {
          created_at: string
          interest_id: string
          note: string
          price_currency: string
          price_max_cents: number
          price_min_cents: number
          professional_display_name: string
          professional_id: string
          professional_slug: string
          project_id: string
          project_title: string
          sample_media_path: string
          sessions: number
        }[]
      }
      get_style_examples: {
        Args: { p_category_slug: string }
        Returns: {
          media_blurhash: string
          media_bucket: string
          media_path: string
          style_slug: string
        }[]
      }
      get_top_saved: {
        Args: { p_category_slug: string; p_limit?: number; p_since: string }
        Returns: {
          is_fixture: boolean
          media_blurhash: string
          media_height: number
          media_path: string
          media_width: number
          portfolio_item_id: string
          professional_display_name: string
          professional_slug: string
          saves: number
        }[]
      }
      is_blocked_for_project: {
        Args: { p_professional_id: string; p_project_id: string }
        Returns: boolean
      }
      is_blocked_pair: {
        Args: { p_person_user_id: string; p_professional_id: string }
        Returns: boolean
      }
      is_open_search_reference: { Args: { p_path: string }; Returns: boolean }
      is_search_open: { Args: { p_project_id: string }; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_notifications_read: { Args: never; Returns: undefined }
      mark_saves_seen: { Args: never; Returns: string }
      match_reasons_are_grounded: {
        Args: { p_components: Json; p_reasons: Json }
        Returns: boolean
      }
      push_notification: {
        Args: {
          p_appointment_id: string
          p_kind: Database["public"]["Enums"]["notification_kind"]
          p_outcome: Database["public"]["Enums"]["report_status"]
          p_report_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      schedule_appointment: {
        Args: {
          p_conversation_id: string
          p_ends_at: string
          p_note?: string
          p_starts_at: string
        }
        Returns: string
      }
      search_key: { Args: { p_text: string }; Returns: string }
      search_professionals: {
        Args: {
          p_category_slug: string
          p_limit?: number
          p_pieces?: number
          p_query: string
        }
        Returns: {
          avatar_path: string
          display_name: string
          is_fixture: boolean
          neighborhood_slug: string
          pieces: Json
          professional_id: string
          slug: string
          studio_lat: number
          studio_lng: number
        }[]
      }
      set_own_styles: { Args: { p_style_slugs: string[] }; Returns: undefined }
      set_studio_location: {
        Args: { p_lat: number; p_lng: number; p_neighborhood_slug?: string }
        Returns: undefined
      }
    }
    Enums: {
      appointment_status: "scheduled" | "cancelled"
      assistant_role: "person" | "assistant"
      availability_status: "open" | "limited" | "waitlist" | "closed"
      interaction_source: "discover" | "search" | "profile"
      interaction_verdict: "like" | "pass"
      match_band: "strong" | "good" | "possible"
      notification_kind:
        | "report_reviewed"
        | "appointment_scheduled"
        | "appointment_cancelled"
      onboarding_intent: "offering" | "looking"
      professional_verdict: "interest" | "pass"
      project_status: "draft" | "active" | "archived"
      project_timing: "asap" | "weeks" | "months" | "flexible"
      reply_habit: "same_day" | "few_days" | "slower"
      report_reason:
        | "spam"
        | "harassment"
        | "impersonation"
        | "stolen_work"
        | "explicit"
        | "off_platform"
        | "other"
      report_status: "open" | "reviewing" | "actioned" | "dismissed"
      report_target:
        | "professional"
        | "artwork"
        | "review"
        | "message"
        | "assistant"
      trait_dimension: "body_area" | "size" | "palette"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_status: ["scheduled", "cancelled"],
      assistant_role: ["person", "assistant"],
      availability_status: ["open", "limited", "waitlist", "closed"],
      interaction_source: ["discover", "search", "profile"],
      interaction_verdict: ["like", "pass"],
      match_band: ["strong", "good", "possible"],
      notification_kind: [
        "report_reviewed",
        "appointment_scheduled",
        "appointment_cancelled",
      ],
      onboarding_intent: ["offering", "looking"],
      professional_verdict: ["interest", "pass"],
      project_status: ["draft", "active", "archived"],
      project_timing: ["asap", "weeks", "months", "flexible"],
      reply_habit: ["same_day", "few_days", "slower"],
      report_reason: [
        "spam",
        "harassment",
        "impersonation",
        "stolen_work",
        "explicit",
        "off_platform",
        "other",
      ],
      report_status: ["open", "reviewing", "actioned", "dismissed"],
      report_target: [
        "professional",
        "artwork",
        "review",
        "message",
        "assistant",
      ],
      trait_dimension: ["body_area", "size", "palette"],
    },
  },
} as const

