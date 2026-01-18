/**
 * Supabase Database Types
 * Generated from the Supabase schema
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          organization: string | null
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          organization?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          organization?: string | null
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          user_id: string
          device_name: string
          device_type: string
          mac_address: string | null
          serial_number: string | null
          firmware_version: string | null
          last_seen: string | null
          config: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_name: string
          device_type?: string
          mac_address?: string | null
          serial_number?: string | null
          firmware_version?: string | null
          last_seen?: string | null
          config?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_name?: string
          device_type?: string
          mac_address?: string | null
          serial_number?: string | null
          firmware_version?: string | null
          last_seen?: string | null
          config?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      telemetry: {
        Row: {
          id: number
          device_id: string | null
          timestamp: string
          temperature: number | null
          humidity: number | null
          pressure: number | null
          gas_resistance: number | null
          iaq: number | null
          co2: number | null
          voc: number | null
          sensor_type: string | null
          raw_data: Record<string, unknown>
        }
        Insert: {
          id?: number
          device_id?: string | null
          timestamp?: string
          temperature?: number | null
          humidity?: number | null
          pressure?: number | null
          gas_resistance?: number | null
          iaq?: number | null
          co2?: number | null
          voc?: number | null
          sensor_type?: string | null
          raw_data?: Record<string, unknown>
        }
        Update: {
          id?: number
          device_id?: string | null
          timestamp?: string
          temperature?: number | null
          humidity?: number | null
          pressure?: number | null
          gas_resistance?: number | null
          iaq?: number | null
          co2?: number | null
          voc?: number | null
          sensor_type?: string | null
          raw_data?: Record<string, unknown>
        }
      }
      documents: {
        Row: {
          id: number
          content: string
          metadata: Record<string, unknown>
          embedding: number[] | null
          source: string | null
          document_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          content: string
          metadata?: Record<string, unknown>
          embedding?: number[] | null
          source?: string | null
          document_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          content?: string
          metadata?: Record<string, unknown>
          embedding?: number[] | null
          source?: string | null
          document_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      species: {
        Row: {
          id: number
          scientific_name: string
          common_name: string | null
          kingdom: string | null
          phylum: string | null
          class_name: string | null
          order_name: string | null
          family: string | null
          genus: string | null
          species_epithet: string | null
          description: string | null
          embedding: number[] | null
          metadata: Record<string, unknown>
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: number
          scientific_name: string
          common_name?: string | null
          kingdom?: string | null
          phylum?: string | null
          class_name?: string | null
          order_name?: string | null
          family?: string | null
          genus?: string | null
          species_epithet?: string | null
          description?: string | null
          embedding?: number[] | null
          metadata?: Record<string, unknown>
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          scientific_name?: string
          common_name?: string | null
          kingdom?: string | null
          phylum?: string | null
          class_name?: string | null
          order_name?: string | null
          family?: string | null
          genus?: string | null
          species_epithet?: string | null
          description?: string | null
          embedding?: number[] | null
          metadata?: Record<string, unknown>
          image_url?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      match_documents: {
        Args: {
          query_embedding: number[]
          match_count?: number
          filter?: Record<string, unknown>
        }
        Returns: {
          id: number
          content: string
          metadata: Record<string, unknown>
          similarity: number
        }[]
      }
      match_species: {
        Args: {
          query_embedding: number[]
          match_count?: number
        }
        Returns: {
          id: number
          scientific_name: string
          common_name: string | null
          description: string | null
          similarity: number
        }[]
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
