// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://jmxyopohngslqvzknjnt.supabase.co';
// Paste the Publishable key from your screenshot here
const supabaseKey = 'sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl'; 

export const supabase = createClient(supabaseUrl, supabaseKey);