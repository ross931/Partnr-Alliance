import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fsfpfyxaszvbvhdfvhgc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_L90qG-AjMcmFUe-O2iwyoQ_uhyeMgNm'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
