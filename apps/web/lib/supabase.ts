import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Magic-link auth uses the implicit flow: the confirmation email links
// straight to `${emailRedirectTo}#access_token=...&type=magiclink`, and this
// client auto-parses that hash fragment on load (detectSessionInUrl). No
// server-side code exchange is needed — see app/auth/callback/page.tsx.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
