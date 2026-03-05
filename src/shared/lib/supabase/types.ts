// Supabase Database Types
// This is a placeholder type definition. In production, generate this file using:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/shared/lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: { [key: string]: Json }
        Insert: { [key: string]: Json }
        Update: { [key: string]: Json }
      }
    }
    Views: {
      [key: string]: {
        Row: { [key: string]: Json }
      }
    }
    Functions: {
      [key: string]: {
        Args: { [key: string]: Json }
        Returns: Json
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}
