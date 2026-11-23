import type { SupabaseClient } from '@supabase/supabase-js'

// The Supabase library (~150 KB) loads in the background after the app is on screen.
let createClient: typeof import('@supabase/supabase-js').createClient | null = null

// Cloud config comes from the server (/api/config), so all keys live in Vercel —
// nothing to type on each device. Cached so the app knows it offline.

export interface CloudConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  vapidPublicKey: string
}

const KEY = 'gh-cloud-config'

function cached(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as CloudConfig) : null
  } catch {
    return null
  }
}

let config: CloudConfig | null = cached()
let client: SupabaseClient | null = null

export async function loadCloudConfig(): Promise<CloudConfig | null> {
  if (navigator.onLine) {
    try {
      const r = await fetch(`/api/config?t=${Date.now()}`, { cache: 'no-store' })
      if (r.ok) {
        const c = (await r.json()) as Partial<CloudConfig>
        if (c.supabaseUrl && c.supabaseAnonKey) {
          config = { supabaseUrl: c.supabaseUrl, supabaseAnonKey: c.supabaseAnonKey, vapidPublicKey: c.vapidPublicKey ?? '' }
          try {
            localStorage.setItem(KEY, JSON.stringify(config))
          } catch {
            /* ignore */
          }
        } else {
          config = null
        }
      }
    } catch {
      /* offline — use cache */
    }
  }
  if (config && !createClient) createClient = (await import('@supabase/supabase-js')).createClient
  return config
}

export const cloudConfig = () => config

/** The Supabase client (null until Supabase is set up in Vercel). */
export function supa(): SupabaseClient | null {
  if (!config || !createClient) return null
  client ??= createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gh-supabase-auth' } })
  return client
}

export async function currentUser() {
  const s = supa()
  if (!s) return null
  const { data } = await s.auth.getSession()
  return data.session?.user ?? null
}
