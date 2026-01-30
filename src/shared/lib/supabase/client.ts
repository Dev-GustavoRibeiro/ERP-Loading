import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Durante a build, retornar um cliente mock se as variáveis não estiverem configuradas
    if (typeof window === 'undefined') {
      console.warn('[Supabase] Variáveis de ambiente não configuradas durante build')
    }
    throw new Error('Supabase URL and Anon Key are required. Please configure your environment variables.')
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
}
