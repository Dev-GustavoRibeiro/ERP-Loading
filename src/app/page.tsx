import { redirect } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/server'

/**
 * Página raiz (/).
 *
 * Redireciona automaticamente:
 * - Usuário autenticado → /dashboard
 * - Usuário não autenticado → /login
 *
 * O middleware já cuida desse redirecionamento,
 * mas esta página serve como fallback de segurança.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  redirect('/login')
}
