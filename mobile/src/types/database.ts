import type { Credential, CredentialInput, Issuer } from '../lib/credentials';
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
      provider_credentials: {
        Row: Credential
        Insert: CredentialInput
        Update: Partial<Credential>
        Relationships: []
      }
      trusted_issuers: {
        Row: Issuer
        Insert: Pick<Issuer,'name'|'credential_types'> & Partial<Issuer>
        Update: Partial<Issuer>
        Relationships: []
      }

      provider_badges: {
        Row: { id: string; provider_id: string; kind: string; subject: string; verified_at: string; expires_at: string | null; revoked_at: string | null }
        Insert: { id?: string; provider_id: string; kind: string; subject: string; verified_at?: string; expires_at?: string | null; revoked_at?: string | null }
        Update: { kind?: string; subject?: string; verified_at?: string; expires_at?: string | null; revoked_at?: string | null }
        Relationships: []
      }

      admin_users: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      bids: {
        Row: {
          bidder_name: string
          bidder_type: string | null
          bidder_whatsapp: string
          created_at: string | null
          id: string
          job_id: string
          message: string
          provider_slug: string | null
          quote_amount: number | null
          status: string | null
          timeline: string | null
          user_id: string | null
        }
        Insert: {
          bidder_name: string
          bidder_type?: string | null
          bidder_whatsapp: string
          created_at?: string | null
          id?: string
          job_id: string
          message: string
          provider_slug?: string | null
          quote_amount?: number | null
          status?: string | null
          timeline?: string | null
          user_id?: string | null
        }
        Update: {
          bidder_name?: string
          bidder_type?: string | null
          bidder_whatsapp?: string
          created_at?: string | null
          id?: string
          job_id?: string
          message?: string
          provider_slug?: string | null
          quote_amount?: number | null
          status?: string | null
          timeline?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string
          cover_image: string | null
          created_at: string | null
          excerpt: string
          id: string
          images: string[] | null
          include_in_sitemap: boolean | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          pub_date: string | null
          reading_time: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          videos: string[] | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string
          id?: string
          images?: string[] | null
          include_in_sitemap?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          pub_date?: string | null
          reading_time?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          videos?: string[] | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string
          id?: string
          images?: string[] | null
          include_in_sitemap?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          pub_date?: string | null
          reading_time?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          videos?: string[] | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          slug: string
          status: string
          title: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          slug: string
          status?: string
          title: string
        }
        Update: {
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          slug?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          categories: string[] | null
          cover_image: string | null
          created_at: string | null
          dedicated_page_url: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          logo: string | null
          name: string
          slug: string
          status: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          categories?: string[] | null
          cover_image?: string | null
          created_at?: string | null
          dedicated_page_url?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          logo?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          categories?: string[] | null
          cover_image?: string | null
          created_at?: string | null
          dedicated_page_url?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          logo?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      claim_requests: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          profile_id: string
          profile_name: string
          profile_type: string
          status: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          profile_id: string
          profile_name: string
          profile_type: string
          status?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          profile_id?: string
          profile_name?: string
          profile_type?: string
          status?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      contact_events: {
        Row: {
          contacted_at: string
          id: string
          tiler_id: string
        }
        Insert: {
          contacted_at?: string
          id?: string
          tiler_id: string
        }
        Update: {
          contacted_at?: string
          id?: string
          tiler_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_events_tiler_id_fkey"
            columns: ["tiler_id"]
            isOneToOne: false
            referencedRelation: "tiler_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_events_tiler_id_fkey"
            columns: ["tiler_id"]
            isOneToOne: false
            referencedRelation: "tilers"
            referencedColumns: ["id"]
          },
        ]
      }
      device_fingerprints: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          provider_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_fingerprints_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_candidates: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          profile_a: string
          profile_b: string
          reason: string
          resolved_at: string | null
          score: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_a: string
          profile_b: string
          reason: string
          resolved_at?: string | null
          score?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          profile_a?: string
          profile_b?: string
          reason?: string
          resolved_at?: string | null
          score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_candidates_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_candidates_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          created_at: string | null
          cta_link: string | null
          cta_text: string | null
          description: string | null
          id: string
          image: string | null
          is_active: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          published_at: string | null
          row_count: number
          source_label: string | null
          status: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          published_at?: string | null
          row_count?: number
          source_label?: string | null
          status?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          published_at?: string | null
          row_count?: number
          source_label?: string | null
          status?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      import_rows: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          normalised_phone: string | null
          provider_id: string | null
          raw: Json
          reject_reason: string | null
          row_number: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          normalised_phone?: string | null
          provider_id?: string | null
          raw: Json
          reject_reason?: string | null
          row_number: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          normalised_phone?: string | null
          provider_id?: string | null
          raw?: Json
          reject_reason?: string | null
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_engagements: {
        Row: {
          created_at: string
          customer_id: string
          data: Json
          id: string
          needs_moderation: boolean
          project_id: string
          provider_id: string
          provider_user_id: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          data: Json
          id?: string
          needs_moderation?: boolean
          project_id: string
          provider_id: string
          provider_user_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          data?: Json
          id?: string
          needs_moderation?: boolean
          project_id?: string
          provider_id?: string
          provider_user_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_engagements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_engagements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_portfolio: {
        Row: {
          approved_at: string
          caption: string
          engagement_id: string
          photos: string[]
          provider_id: string
        }
        Insert: {
          approved_at: string
          caption: string
          engagement_id: string
          photos: string[]
          provider_id: string
        }
        Update: {
          approved_at?: string
          caption?: string
          engagement_id?: string
          photos?: string[]
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_portfolio_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "job_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_portfolio_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_removal_tokens: {
        Row: {
          created_at: string
          provider_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          provider_id: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          provider_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_removal_tokens_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          e164: string
          expires_at: string
          id: string
          purpose: string
          salt: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          e164: string
          expires_at: string
          id?: string
          purpose: string
          salt: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          e164?: string
          expires_at?: string
          id?: string
          purpose?: string
          salt?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          merged_into: string | null
          nic_hash: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          merged_into?: string | null
          nic_hash?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          merged_into?: string | null
          nic_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_blacklist: {
        Row: {
          created_at: string
          e164: string
          reason: string
        }
        Insert: {
          created_at?: string
          e164: string
          reason?: string
        }
        Update: {
          created_at?: string
          e164?: string
          reason?: string
        }
        Relationships: []
      }
      phone_numbers: {
        Row: {
          created_at: string
          e164: string
          id: string
          is_primary: boolean
          person_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          e164: string
          id?: string
          is_primary?: boolean
          person_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          e164?: string
          id?: string
          is_primary?: boolean
          person_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_numbers_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_hashes: {
        Row: {
          created_at: string
          id: string
          provider_id: string
          sha256: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider_id: string
          sha256: string
        }
        Update: {
          created_at?: string
          id?: string
          provider_id?: string
          sha256?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_hashes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          area_label: string | null
          budget_range: string | null
          city: string
          completion_month: number | null
          created_at: string | null
          customer_name: string
          description: string | null
          design_3d_images: Json | null
          district: string | null
          episode_01_thumbnail: string | null
          episode_01_youtube: string | null
          episode_02_thumbnail: string | null
          episode_02_youtube: string | null
          homepage_display: boolean | null
          id: string
          images: string[] | null
          old_space_images: Json | null
          project_type: string
          project_videos: Json | null
          reference_id: string | null
          session_token: string | null
          status: string
          user_id: string | null
          whatsapp: string
          youtube_short: string | null
        }
        Insert: {
          area_label?: string | null
          budget_range?: string | null
          city: string
          completion_month?: number | null
          created_at?: string | null
          customer_name: string
          description?: string | null
          design_3d_images?: Json | null
          district?: string | null
          episode_01_thumbnail?: string | null
          episode_01_youtube?: string | null
          episode_02_thumbnail?: string | null
          episode_02_youtube?: string | null
          homepage_display?: boolean | null
          id?: string
          images?: string[] | null
          old_space_images?: Json | null
          project_type: string
          project_videos?: Json | null
          reference_id?: string | null
          session_token?: string | null
          status?: string
          user_id?: string | null
          whatsapp: string
          youtube_short?: string | null
        }
        Update: {
          area_label?: string | null
          budget_range?: string | null
          city?: string
          completion_month?: number | null
          created_at?: string | null
          customer_name?: string
          description?: string | null
          design_3d_images?: Json | null
          district?: string | null
          episode_01_thumbnail?: string | null
          episode_01_youtube?: string | null
          episode_02_thumbnail?: string | null
          episode_02_youtube?: string | null
          homepage_display?: boolean | null
          id?: string
          images?: string[] | null
          old_space_images?: Json | null
          project_type?: string
          project_videos?: Json | null
          reference_id?: string | null
          session_token?: string | null
          status?: string
          user_id?: string | null
          whatsapp?: string
          youtube_short?: string | null
        }
        Relationships: []
      }
      provider_claim_numbers: {
        Row: {
          created_at: string
          e164: string
          invited_at: string | null
          provider_id: string
        }
        Insert: {
          created_at?: string
          e164: string
          invited_at?: string | null
          provider_id: string
        }
        Update: {
          created_at?: string
          e164?: string
          invited_at?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_claim_numbers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_skills: {
        Row: {
          created_at: string
          provider_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          provider_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          provider_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_skills_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_submissions: {
        Row: {
          city: string
          cover_image: string | null
          created_at: string | null
          description: string | null
          district: string | null
          id: string
          name: string
          phone: string | null
          photo_urls: string[] | null
          profile_image: string | null
          provider_type: string
          service_areas: string[] | null
          services: string[] | null
          status: string
          user_id: string | null
          whatsapp: string
        }
        Insert: {
          city: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_urls?: string[] | null
          profile_image?: string | null
          provider_type: string
          service_areas?: string[] | null
          services?: string[] | null
          status?: string
          user_id?: string | null
          whatsapp: string
        }
        Update: {
          city?: string
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_urls?: string[] | null
          profile_image?: string | null
          provider_type?: string
          service_areas?: string[] | null
          services?: string[] | null
          status?: string
          user_id?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      providers: {
        Row: {
          avg_rating: number | null
          city: string | null
          claim_denied_at: string | null
          claim_status: string
          completeness: number
          cover_image: string | null
          created_at: string | null
          daily_rate_max: number | null
          daily_rate_min: number | null
          description: string | null
          district: string | null
          experience_years: number | null
          gallery: string[] | null
          id: string
          is_featured: boolean | null
          merged_into: string | null
          name: string
          person_id: string | null
          phone: string | null
          profile_image: string | null
          provider_type: string
          review_count: number | null
          service_areas: string[] | null
          services: string[] | null
          slug: string
          source: string
          status: string
          updated_at: string | null
          user_id: string | null
          verification_status: string
          visit_fee: number
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          avg_rating?: number | null
          city?: string | null
          claim_denied_at?: string | null
          claim_status?: string
          completeness?: number
          cover_image?: string | null
          created_at?: string | null
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          description?: string | null
          district?: string | null
          experience_years?: number | null
          gallery?: string[] | null
          id?: string
          is_featured?: boolean | null
          merged_into?: string | null
          name: string
          person_id?: string | null
          phone?: string | null
          profile_image?: string | null
          provider_type: string
          review_count?: number | null
          service_areas?: string[] | null
          services?: string[] | null
          slug: string
          source?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string
          visit_fee?: number
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          avg_rating?: number | null
          city?: string | null
          claim_denied_at?: string | null
          claim_status?: string
          completeness?: number
          cover_image?: string | null
          created_at?: string | null
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          description?: string | null
          district?: string | null
          experience_years?: number | null
          gallery?: string[] | null
          id?: string
          is_featured?: boolean | null
          merged_into?: string | null
          name?: string
          person_id?: string | null
          phone?: string | null
          profile_image?: string | null
          provider_type?: string
          review_count?: number | null
          service_areas?: string[] | null
          services?: string[] | null
          slug?: string
          source?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string
          visit_fee?: number
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          confirmed_job: boolean
          created_at: string | null
          engagement_id: string | null
          id: string
          job_type: string | null
          provider_id: string | null
          provider_reply: string | null
          rating: number
          reviewer_name: string
          status: string
          tiler_id: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          confirmed_job?: boolean
          created_at?: string | null
          engagement_id?: string | null
          id?: string
          job_type?: string | null
          provider_id?: string | null
          provider_reply?: string | null
          rating: number
          reviewer_name: string
          status?: string
          tiler_id?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          confirmed_job?: boolean
          created_at?: string | null
          engagement_id?: string | null
          id?: string
          job_type?: string | null
          provider_id?: string | null
          provider_reply?: string | null
          rating?: number
          reviewer_name?: string
          status?: string
          tiler_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: true
            referencedRelation: "job_engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tiler_id_fkey"
            columns: ["tiler_id"]
            isOneToOne: false
            referencedRelation: "tiler_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tiler_id_fkey"
            columns: ["tiler_id"]
            isOneToOne: false
            referencedRelation: "tilers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_projects: {
        Row: {
          created_at: string
          id: string
          project_id: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          provider_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_projects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_providers: {
        Row: {
          created_at: string | null
          id: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          active: boolean
          id: string
          name_en: string
          name_si: string
          name_ta: string
          parent_id: string | null
          selectable: boolean
        }
        Insert: {
          active?: boolean
          id: string
          name_en: string
          name_si: string
          name_ta: string
          parent_id?: string | null
          selectable?: boolean
        }
        Update: {
          active?: boolean
          id?: string
          name_en?: string
          name_si?: string
          name_ta?: string
          parent_id?: string | null
          selectable?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "skills_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_log: {
        Row: {
          cost: number | null
          e164: string
          error: string | null
          id: string
          lang: string
          provider: string
          provider_uid: string | null
          segments: number
          sent_at: string
          status: string
          template: string
        }
        Insert: {
          cost?: number | null
          e164: string
          error?: string | null
          id?: string
          lang?: string
          provider?: string
          provider_uid?: string | null
          segments?: number
          sent_at?: string
          status?: string
          template: string
        }
        Update: {
          cost?: number | null
          e164?: string
          error?: string | null
          id?: string
          lang?: string
          provider?: string
          provider_uid?: string | null
          segments?: number
          sent_at?: string
          status?: string
          template?: string
        }
        Relationships: []
      }
      tilers: {
        Row: {
          availability: Database["public"]["Enums"]["availability_status"]
          avatar_url: string | null
          avg_rating: number
          bio: string | null
          city: string | null
          cover_image: string | null
          created_at: string
          daily_rate_max: number | null
          daily_rate_min: number | null
          district: string
          experience_years: number
          featured: boolean
          full_name: string
          gallery: string[] | null
          id: string
          is_verified: boolean
          phone: string
          review_count: number
          service_areas: string[] | null
          services: string[]
          slug: string | null
          source: string | null
          total_jobs: number
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          availability?: Database["public"]["Enums"]["availability_status"]
          avatar_url?: string | null
          avg_rating?: number
          bio?: string | null
          city?: string | null
          cover_image?: string | null
          created_at?: string
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          district: string
          experience_years?: number
          featured?: boolean
          full_name: string
          gallery?: string[] | null
          id?: string
          is_verified?: boolean
          phone: string
          review_count?: number
          service_areas?: string[] | null
          services?: string[]
          slug?: string | null
          source?: string | null
          total_jobs?: number
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability_status"]
          avatar_url?: string | null
          avg_rating?: number
          bio?: string | null
          city?: string | null
          cover_image?: string | null
          created_at?: string
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          district?: string
          experience_years?: number
          featured?: boolean
          full_name?: string
          gallery?: string[] | null
          id?: string
          is_verified?: boolean
          phone?: string
          review_count?: number
          service_areas?: string[] | null
          services?: string[]
          slug?: string | null
          source?: string | null
          total_jobs?: number
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      tiler_profiles: {
        Row: {
          availability:
            | Database["public"]["Enums"]["availability_status"]
            | null
          avatar_url: string | null
          avg_rating: number | null
          bio: string | null
          city: string | null
          created_at: string | null
          daily_rate_max: number | null
          daily_rate_min: number | null
          district: string | null
          experience_years: number | null
          featured: boolean | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          phone: string | null
          review_count: number | null
          services: string[] | null
          slug: string | null
          total_jobs: number | null
        }
        Insert: {
          availability?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          district?: string | null
          experience_years?: number | null
          featured?: boolean | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          phone?: string | null
          review_count?: number | null
          services?: string[] | null
          slug?: string | null
          total_jobs?: number | null
        }
        Update: {
          availability?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          daily_rate_max?: number | null
          daily_rate_min?: number | null
          district?: string | null
          experience_years?: number | null
          featured?: boolean | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          phone?: string | null
          review_count?: number | null
          services?: string[] | null
          slug?: string | null
          total_jobs?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_service_provider: {
        Args: { submission_id: string }
        Returns: string
      }
      current_person_id: { Args: never; Returns: string }
      get_claim_status: { Args: { p_claim_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      merge_providers: {
        Args: { p_loser: string; p_survivor: string }
        Returns: Json
      }
      normalize_lk_phone: { Args: { input: string }; Returns: string }
      otp_rate_check: { Args: { p_e164: string }; Returns: Json }
      save_job_engagement: {
        Args: { expected_version: number; job_id: string; next_data: Json }
        Returns: undefined
      }
      discover_service_providers: {
        Args: { search_text?: string; profession?: string; area_filter?: string; page_number?: number; provider_slug?: string }
        Returns: { id: string; name: string; slug: string; provider_type: string; city: string; district: string; services: string[]; profile_image: string; avg_rating: number; review_count: number; verification_status: string; service_areas: string[]; completed_jobs: number; badge_kinds: string[]; confirmed_review_count: number }[]
      }
      search_service_providers: {
        Args: {
          district_filter?: string
          page_number?: number
          profession?: string
          search_text?: string
        }
        Returns: {
          avg_rating: number
          city: string
          district: string
          id: string
          name: string
          profile_image: string
          provider_type: string
          review_count: number
          services: string[]
          slug: string
          verification_status: string
        }[]
      }
      verify_claim: {
        Args: { p_claim_id: string; p_code: string }
        Returns: string
      }
    }
    Enums: {
      availability_status: "available" | "busy" | "unavailable"
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
      availability_status: ["available", "busy", "unavailable"],
    },
  },
} as const
