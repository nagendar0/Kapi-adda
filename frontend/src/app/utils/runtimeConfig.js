const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

// These values are intentionally configured at deploy time. Defaults point to
// your live Kapi Adda project database and local development backend.
export const API_BASE = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');
export const HAS_BACKEND_API = true;

export const SUPABASE_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kvjvnrktnkenlsaatmxq.supabase.co');
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_-9vJtAUFRJ6NnjrIvpTOwQ_QDzOjrUt';
export const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const SUPABASE_HEADERS = HAS_SUPABASE
  ? { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
  : {};

export const deploymentConfigurationError =
  'The app is not connected to its data service. Configure NEXT_PUBLIC_API_URL or both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.';
