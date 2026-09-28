import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://uhoznqcpaasartfvdynx.supabase.co';

const supabaseKey =
  (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_OQ34-5w3RP1Wa8QLxwlJ1A_wv5e_VdU';

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const authStorageKey = `sb-${projectRef}-auth-token`;
let authStorage: Storage =
  sessionStorage.getItem(authStorageKey) !== null ? sessionStorage : localStorage;

const browserAuthStorage = {
  getItem: (key: string) => authStorage.getItem(key),
  setItem: (key: string, value: string) => authStorage.setItem(key, value),
  removeItem: (key: string) => authStorage.removeItem(key),
};

export const setAuthPersistence = (rememberMe: boolean) => {
  const nextStorage = rememberMe ? localStorage : sessionStorage;
  if (nextStorage === authStorage) {
    return;
  }

  const currentSession = authStorage.getItem(authStorageKey);
  authStorage.removeItem(authStorageKey);
  if (currentSession) {
    nextStorage.setItem(authStorageKey, currentSession);
  }
  authStorage = nextStorage;
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: browserAuthStorage,
  },
});

export const getSupabaseClient = () => supabase;
