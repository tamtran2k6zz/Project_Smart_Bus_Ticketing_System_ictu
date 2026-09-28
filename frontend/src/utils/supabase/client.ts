import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  'https://uhoznqcpaasartfvdynx.supabase.co';

const supabaseKey =
  (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_OQ34-5w3RP1Wa8QLxwlJ1A_wv5e_VdU';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getSupabaseClient = () => supabase;
