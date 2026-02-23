import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Replace with your actual Project URL and Publishable Key from Supabase Settings
const supabaseUrl = 'https://jmxyopohngslqvzknjnt.supabase.co';
const supabaseKey = 'sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl'; 

export const supabase = createClient(supabaseUrl, supabaseKey);