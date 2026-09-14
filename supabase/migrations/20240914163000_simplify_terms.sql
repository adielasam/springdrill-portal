-- 1. Alter cbt_tests table to use text
ALTER TABLE public.cbt_tests DROP COLUMN IF EXISTS term_id CASCADE;
ALTER TABLE public.cbt_tests DROP COLUMN IF EXISTS sub_term_id CASCADE;
ALTER TABLE public.cbt_tests ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE public.cbt_tests ADD COLUMN IF NOT EXISTS sub_term TEXT;

-- 2. Alter term_results table to use text
ALTER TABLE public.term_results DROP COLUMN IF EXISTS term_id CASCADE;
ALTER TABLE public.term_results DROP COLUMN IF EXISTS sub_term_id CASCADE;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS term TEXT;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS sub_term TEXT;

-- 3. Recreate the uniqueness constraint for term_results so a student only has one result per class/subject/term/subterm
ALTER TABLE public.term_results ADD CONSTRAINT unique_term_result UNIQUE(student_id, class_id, subject_id, term, sub_term);

-- 4. Recreate the index for faster lookups
CREATE INDEX IF NOT EXISTS idx_term_results_lookup_text ON public.term_results (class_id, subject_id, term, sub_term);

-- 5. Drop the now unused terms and sub_terms tables completely
DROP TABLE IF EXISTS public.sub_terms CASCADE;
DROP TABLE IF EXISTS public.terms CASCADE;

-- 6. Update the RPC function signature and logic
DROP FUNCTION IF EXISTS public.submit_final_term_results;
CREATE OR REPLACE FUNCTION public.submit_final_term_results(p_class_id INTEGER, p_subject_id INTEGER, p_term TEXT, p_sub_term TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.teacher_class_subjects tcs
        WHERE tcs.teacher_id = auth.uid()
        AND tcs.class_id = p_class_id
        AND tcs.subject_id = p_subject_id
    ) AND NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Not authorized to submit results for this class and subject';
    END IF;

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
