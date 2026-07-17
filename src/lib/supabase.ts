/**
 * Supabase Browser Client
 *
 * Usa las VITE_ variables de entorno.
 * Misma instancia que PuzzleHH y HHFighters.
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

let client: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return client
}

export function createNewClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}
