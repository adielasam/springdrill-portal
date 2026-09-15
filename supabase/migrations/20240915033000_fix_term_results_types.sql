-- Fix for the "operator does not exist: integer = text" error on Make Report
-- This error happens because term and sub_term were originally created as INTEGER columns, 
-- but the new Next.js interface sends them as TEXT ("First Term", "Half Term").

-- Drop any depending constraints if necessary
ALTER TABLE public.term_results DROP CONSTRAINT IF EXISTS term_results_term_fkey;
ALTER TABLE public.term_results DROP CONSTRAINT IF EXISTS term_results_sub_term_fkey;

-- Alter the columns to TEXT so they accept "First Term", "Half Term", etc.
ALTER TABLE public.term_results ALTER COLUMN term TYPE TEXT USING term::TEXT;
ALTER TABLE public.term_results ALTER COLUMN sub_term TYPE TEXT USING sub_term::TEXT;

-- Also ensure student_id is TEXT just in case (though we now handle it via integer mapping, it's safer)
-- Wait, we just mapped student_id to send Integer (students.id) in the JS code!
-- So student_id SHOULD remain INTEGER in the DB. We leave student_id alone.

-- Ensure schema cache is updated
NOTIFY pgrst, 'reload schema';
