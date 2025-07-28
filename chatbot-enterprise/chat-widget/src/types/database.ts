import { createClient } from '@supabase/supabase-js'

export interface Database {
  public: {
    Tables: {
      chatbots: {
        Row: {
          id: string
          name: string
          description: string | null
          knowledge_base_ids: string[] | null
          n8n_webhook_url: string | null
          config: any | null
          is_active: boolean | null
          created_at: string | null
          owner_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          knowledge_base_ids?: string[] | null
          n8n_webhook_url?: string | null
          config?: any | null
          is_active?: boolean | null
          created_at?: string | null
          owner_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          knowledge_base_ids?: string[] | null
          n8n_webhook_url?: string | null
          config?: any | null
          is_active?: boolean | null
          created_at?: string | null
          owner_id?: string | null
        }
      }
      chat_sessions: {
        Row: {
          session_id: string  // Now the primary key
          chatbot_id: string | null
          user_identifier: string | null
          platform: string | null
          status: string | null
          metadata: any | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          session_id: string  // Required primary key
          chatbot_id?: string | null
          user_identifier?: string | null
          platform?: string | null
          status?: string | null
          metadata?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          session_id?: string  // Can't update primary key normally
          chatbot_id?: string | null
          user_identifier?: string | null
          platform?: string | null
          status?: string | null
          metadata?: any | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          session_id: string | null  // References chat_sessions.session_id
          role: string
          content: string
          metadata: any | null
          created_at: string | null
        }
        Insert: {
          id?: string
          session_id?: string | null  // References chat_sessions.session_id
          role: string
          content: string
          metadata?: any | null
          created_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string | null  // References chat_sessions.session_id
          role?: string
          content?: string
          metadata?: any | null
          created_at?: string | null
        }
      }
    }
  }
}

export type SupabaseClient = ReturnType<typeof createClient<Database>>
