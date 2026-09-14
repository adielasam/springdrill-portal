-- 1. MAKE POLICIES IDEMPOTENT (applied everywhere)
-- 2. ENABLE RLS ON EVERY TABLE
-- 3. ADMIN UNLOCK POLICY
-- 4. RESTRICT INSERT STATUS TO DRAFT
-- 5. TRIGGER FOR STUDENT CLASS CHECK
-- 6. LOOKUP INDEX
-- 7. SECURITY HARDENING (CHECK constraints, audit log, SECURITY DEFINER search_path)

-- Assumed data types based on error: INTEGER for IDs instead of UUID (except for Auth users)

-- CREATE AUDIT TABLE FIRST
CREATE TABLE IF NOT EXISTS public.term_results_audit (
    id SERIAL PRIMARY KEY,
    term_result_id UUID, -- assuming term_results PK is UUID
    changed_by UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    old_status TEXT,
    new_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.term_results_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read audit log" ON public.term_results_audit;
CREATE POLICY "Admins can read audit log" ON public.term_results_audit
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- =========================================================================
-- ENABLE RLS & POLICIES FOR EXISTING TABLES
-- =========================================================================

-- Sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read sessions" ON public.sessions;
CREATE POLICY "Authenticated read sessions" ON public.sessions FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage sessions" ON public.sessions;
CREATE POLICY "Admin manage sessions" ON public.sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Terms
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read terms" ON public.terms;
CREATE POLICY "Authenticated read terms" ON public.terms FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage terms" ON public.terms;
CREATE POLICY "Admin manage terms" ON public.terms FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Sub Terms
ALTER TABLE public.sub_terms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read sub_terms" ON public.sub_terms;
CREATE POLICY "Authenticated read sub_terms" ON public.sub_terms FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage sub_terms" ON public.sub_terms;
CREATE POLICY "Admin manage sub_terms" ON public.sub_terms FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read classes" ON public.classes;
CREATE POLICY "Authenticated read classes" ON public.classes FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage classes" ON public.classes;
CREATE POLICY "Admin manage classes" ON public.classes FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read subjects" ON public.subjects;
CREATE POLICY "Authenticated read subjects" ON public.subjects FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Admin manage subjects" ON public.subjects;
CREATE POLICY "Admin manage subjects" ON public.subjects FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read mapped students" ON public.students;
CREATE POLICY "Teachers read mapped students" ON public.students FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = students.class_id)
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
DROP POLICY IF EXISTS "Admin manage students" ON public.students;
CREATE POLICY "Admin manage students" ON public.students FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- Teacher Class Subjects
ALTER TABLE public.teacher_class_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read own mappings" ON public.teacher_class_subjects;
CREATE POLICY "Teachers read own mappings" ON public.teacher_class_subjects FOR SELECT USING (
    teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
DROP POLICY IF EXISTS "Admin manage teacher_class_subjects" ON public.teacher_class_subjects;
CREATE POLICY "Admin manage teacher_class_subjects" ON public.teacher_class_subjects FOR ALL USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- CBT Tests
ALTER TABLE public.cbt_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read mapped cbt_tests" ON public.cbt_tests;
CREATE POLICY "Teachers read mapped cbt_tests" ON public.cbt_tests FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = cbt_tests.class_id AND tcs.subject_id = cbt_tests.subject_id)
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
DROP POLICY IF EXISTS "Teachers insert mapped cbt_tests" ON public.cbt_tests;
CREATE POLICY "Teachers insert mapped cbt_tests" ON public.cbt_tests FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = class_id AND tcs.subject_id = subject_id)
);
DROP POLICY IF EXISTS "Teachers update mapped cbt_tests" ON public.cbt_tests;
CREATE POLICY "Teachers update mapped cbt_tests" ON public.cbt_tests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = class_id AND tcs.subject_id = subject_id)
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = class_id AND tcs.subject_id = subject_id)
);

-- CBT Scores
ALTER TABLE public.cbt_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers read mapped cbt_scores" ON public.cbt_scores;
CREATE POLICY "Teachers read mapped cbt_scores" ON public.cbt_scores FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.cbt_tests ct JOIN public.teacher_class_subjects tcs ON ct.class_id = tcs.class_id AND ct.subject_id = tcs.subject_id WHERE ct.id = cbt_scores.cbt_test_id AND tcs.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);
-- Similarly add INSERT/UPDATE for cbt_scores if needed by teachers, omitting for brevity if read is sufficient for this scope, 
-- but will add them to be thorough:
DROP POLICY IF EXISTS "Teachers insert mapped cbt_scores" ON public.cbt_scores;
CREATE POLICY "Teachers insert mapped cbt_scores" ON public.cbt_scores FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.cbt_tests ct JOIN public.teacher_class_subjects tcs ON ct.class_id = tcs.class_id AND ct.subject_id = tcs.subject_id WHERE ct.id = cbt_test_id AND tcs.teacher_id = auth.uid())
);
DROP POLICY IF EXISTS "Teachers update mapped cbt_scores" ON public.cbt_scores;
CREATE POLICY "Teachers update mapped cbt_scores" ON public.cbt_scores FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.cbt_tests ct JOIN public.teacher_class_subjects tcs ON ct.class_id = tcs.class_id AND ct.subject_id = tcs.subject_id WHERE ct.id = cbt_test_id AND tcs.teacher_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.cbt_tests ct JOIN public.teacher_class_subjects tcs ON ct.class_id = tcs.class_id AND ct.subject_id = tcs.subject_id WHERE ct.id = cbt_test_id AND tcs.teacher_id = auth.uid())
);


-- =========================================================================
-- TERM RESULTS TABLE CREATION & REFINEMENT
-- =========================================================================

-- Note: We use INTEGER for IDs (or let Postgres infer from existing tables if altered later)
-- To prevent FK type mismatch with existing tables, assuming they are INTEGER based on error
CREATE TABLE IF NOT EXISTS public.term_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INTEGER NOT NULL,
    class_id INTEGER NOT NULL,
    subject_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    sub_term_id INTEGER NOT NULL,
    first_cat NUMERIC DEFAULT 0 CHECK (first_cat >= 0 AND first_cat <= 20),
    second_cat NUMERIC DEFAULT 0 CHECK (second_cat >= 0 AND second_cat <= 20),
    exam NUMERIC DEFAULT 0 CHECK (exam >= 0 AND exam <= 60),
    total NUMERIC GENERATED ALWAYS AS (COALESCE(first_cat, 0) + COALESCE(second_cat, 0) + COALESCE(exam, 0)) STORED,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, class_id, subject_id, term_id, sub_term_id)
);

-- Lookup Index
CREATE INDEX IF NOT EXISTS idx_term_results_lookup ON public.term_results (class_id, subject_id, term_id, sub_term_id);

ALTER TABLE public.term_results ENABLE ROW LEVEL SECURITY;

-- Policy: Read
DROP POLICY IF EXISTS "Teachers can read term_results" ON public.term_results;
CREATE POLICY "Teachers can read term_results" ON public.term_results FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = term_results.class_id AND tcs.subject_id = term_results.subject_id)
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Policy: Update (Drafts)
DROP POLICY IF EXISTS "Teachers can update draft term_results" ON public.term_results;
CREATE POLICY "Teachers can update draft term_results" ON public.term_results FOR UPDATE USING (
    status != 'final' AND
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = term_results.class_id AND tcs.subject_id = term_results.subject_id)
) WITH CHECK (
    status != 'final' AND
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = term_results.class_id AND tcs.subject_id = term_results.subject_id)
);

-- Policy: Insert (Must be draft)
DROP POLICY IF EXISTS "Teachers can insert term_results" ON public.term_results;
CREATE POLICY "Teachers can insert term_results" ON public.term_results FOR INSERT WITH CHECK (
    status = 'draft' AND
    EXISTS (SELECT 1 FROM public.teacher_class_subjects tcs WHERE tcs.teacher_id = auth.uid() AND tcs.class_id = term_results.class_id AND tcs.subject_id = term_results.subject_id)
);

-- Policy: Admin Unlock (Can update anything)
DROP POLICY IF EXISTS "Admins can manage term_results" ON public.term_results;
CREATE POLICY "Admins can manage term_results" ON public.term_results FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- =========================================================================
-- TRIGGER: ENFORCE STUDENT BELONGS TO CLASS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.check_student_belongs_to_class()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.students
        WHERE id = NEW.student_id AND class_id = NEW.class_id
    ) THEN
        RAISE EXCEPTION 'student_id % does not belong to class_id %', NEW.student_id, NEW.class_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_student_class ON public.term_results;
CREATE TRIGGER trg_check_student_class
BEFORE INSERT OR UPDATE ON public.term_results
FOR EACH ROW
EXECUTE FUNCTION public.check_student_belongs_to_class();

-- =========================================================================
-- TRIGGER: AUDIT LOG FOR STATUS CHANGES
-- =========================================================================
CREATE OR REPLACE FUNCTION public.audit_term_results_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
        INSERT INTO public.term_results_audit (term_result_id, changed_by, action, old_status, new_status)
        -- auth.uid() requires proper context, in triggers it is accessible if session is passed but safer with current_setting if missing.
        -- Assuming auth.uid() is available because Supabase standard passes it:
        VALUES (NEW.id, auth.uid(), TG_OP, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_term_results ON public.term_results;
CREATE TRIGGER trg_audit_term_results
AFTER INSERT OR UPDATE ON public.term_results
FOR EACH ROW
EXECUTE FUNCTION public.audit_term_results_status();

-- =========================================================================
-- SUBMIT FINAL FUNCTION (Runs with elevated privileges)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.submit_final_term_results(p_class_id INTEGER, p_subject_id INTEGER, p_term_id INTEGER, p_sub_term_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- re-verify caller permission inside the function!
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
      AND term_id = p_term_id
      AND sub_term_id = p_sub_term_id
      AND status != 'final';
END;
$$;
