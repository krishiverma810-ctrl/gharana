// /api/config — the PUBLIC cloud settings the app needs (no secrets here).
// The Supabase "anon" key and the VAPID public key are designed to be public;
// all access is still protected by Supabase Row Level Security and your sign-in.

export function GET() {
  return new Response(
    JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
  )
}
