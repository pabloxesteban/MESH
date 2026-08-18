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
          id: string
          lat: number | null
          lng: number | null
          metro_key: string
          slug: string
          updated_at: string
        }
        Insert: {
          admin_area?: string | null
          city: string
          country_code: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          metro_key: string
          slug: string
          updated_at?: string
        }
        Update: {
          admin_area?: string | null
          city?: string
          country_code?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          metro_key?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
          analytics_opt_in: boolean
          avatar_media_id: string | null
          city_location_id: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          analytics_opt_in?: boolean
          avatar_media_id?: string | null
          city_location_id?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          updated_at?: string
        }
        Update: {
          analytics_opt_in?: boolean
          avatar_media_id?: string | null
          city_location_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
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
      projects: {
        Row: {
          budget_currency: string | null
          budget_max_cents: number | null
          budget_min_cents: number | null
          category_id: string
          created_at: string
          description: string | null
          id: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_discovery_feed: {
        Args: { p_category_slug: string; p_cursor?: string; p_limit?: number }
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
          professional_is_fixture: boolean
          professional_slug: string
          styles: Json
          year: number
        }[]
      }
      match_reasons_are_grounded: {
        Args: { p_components: Json; p_reasons: Json }
        Returns: boolean
      }
    }
    Enums: {
      availability_status: "open" | "limited" | "waitlist" | "closed"
      interaction_source: "discover" | "search" | "profile"
      interaction_verdict: "like" | "pass"
      match_band: "strong" | "good" | "possible"
      project_status: "draft" | "active" | "archived"
      project_timing: "asap" | "weeks" | "months" | "flexible"
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
      availability_status: ["open", "limited", "waitlist", "closed"],
      interaction_source: ["discover", "search", "profile"],
      interaction_verdict: ["like", "pass"],
      match_band: ["strong", "good", "possible"],
      project_status: ["draft", "active", "archived"],
      project_timing: ["asap", "weeks", "months", "flexible"],
    },
  },
} as const

