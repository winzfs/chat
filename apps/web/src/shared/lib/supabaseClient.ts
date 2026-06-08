import { createClient } from '@supabase/supabase-js';

const fallbackSupabaseUrl = 'https://ylbqvgjeyecztcpahmqc.supabase.co';
const fallbackSupabaseKey = ['sb', 'publishable', 'NL2GpQOccNMO0mrNR', 'KnRg', 'y4CMK9ey'].join('_');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackSupabaseUrl;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || fallbackSupabaseKey;

export const isSupabaseReady = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey);
