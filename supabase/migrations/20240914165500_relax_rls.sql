-- ==========================================
-- 1. SWITCH TERMS AND SUB_TERMS TO TEXT
-- ==========================================
ALTER TABLE public.cbt_tests DROP COLUMN IF EXISTS term_id CASCADE;
ALTER TABLE public.cbt_tests DROP COLUMN IF EXISTS sub_term_id CASCADE;
ALTER TABLE public.cbt_tests ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE public.cbt_tests ADD COLUMN IF NOT EXISTS sub_term TEXT;

ALTER TABLE public.term_results DROP COLUMN IF EXISTS term_id CASCADE;
ALTER TABLE public.term_results DROP COLUMN IF EXISTS sub_term_id CASCADE;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS sub_term TEXT;

ALTER TABLE public.term_results DROP CONSTRAINT IF EXISTS unique_term_result;
ALTER TABLE public.term_results ADD CONSTRAINT unique_term_result UNIQUE(student_id, class_id, subject_id, term, sub_term);

CREATE INDEX IF NOT EXISTS idx_term_results_lookup_text ON public.term_results (class_id, subject_id, term, sub_term);

DROP TABLE IF EXISTS public.sub_terms CASCADE;
DROP TABLE IF EXISTS public.terms CASCADE;

-- ==========================================
-- 2. RELAX RLS POLICIES (Remove strict teacher mapping)
-- ==========================================

-- Allow teachers to read and write any term_results (Drafts)
DROP POLICY IF EXISTS "Teachers can read term_results" ON public.term_results;
CREATE POLICY "Teachers can read term_results" ON public.term_results FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can update draft term_results" ON public.term_results;
CREATE POLICY "Teachers can update draft term_results" ON public.term_results FOR UPDATE USING (status != 'final' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers can insert term_results" ON public.term_results;
CREATE POLICY "Teachers can insert term_results" ON public.term_results FOR INSERT WITH CHECK (status = 'draft' AND auth.role() = 'authenticated');

-- Allow teachers to read CBT tests and scores
DROP POLICY IF EXISTS "Teachers read mapped cbt_tests" ON public.cbt_tests;
CREATE POLICY "Teachers read mapped cbt_tests" ON public.cbt_tests FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Teachers read mapped cbt_scores" ON public.cbt_scores;
CREATE POLICY "Teachers read mapped cbt_scores" ON public.cbt_scores FOR SELECT USING (auth.role() = 'authenticated');

-- Allow teachers to read students
DROP POLICY IF EXISTS "Teachers read mapped students" ON public.students;
CREATE POLICY "Teachers read mapped students" ON public.students FOR SELECT USING (auth.role() = 'authenticated');


-- ==========================================
-- 3. UPDATE SUBMIT FINAL FUNCTION
-- ==========================================
DROP FUNCTION IF EXISTS public.submit_final_term_results;
CREATE OR REPLACE FUNCTION public.submit_final_term_results(p_class_id INTEGER, p_subject_id INTEGER, p_term TEXT, p_sub_term TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.term_results
    SET status = 'final',
        submitted_by = auth.uid(),
        submitted_at = now()
    WHERE class_id = p_class_id
      AND subject_id = p_subject_id
      AND term = p_term
      AND sub_term = p_sub_term
      AND status != 'final';
END;
$$;
