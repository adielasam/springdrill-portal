-- Add missing 'total_questions' column to 'test_results' table
ALTER TABLE public.test_results ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;

-- Optionally reload the schema cache so Supabase API picks it up immediately
NOTIFY pgrst, 'reload schema';
