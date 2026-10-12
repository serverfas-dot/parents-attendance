import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 6000);
  const requestSignal = init?.signal;

  if (requestSignal) {
    if (requestSignal.aborted) controller.abort();
    else requestSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    globalThis.clearTimeout(timeout);
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: false,
    autoRefreshToken: true,
  },
});
