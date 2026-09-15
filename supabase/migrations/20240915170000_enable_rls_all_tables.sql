-- Enable Row-Level Security on all tables to satisfy Supabase security requirements.
ALTER TABLE public.term_results_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create read-all policies for authenticated users on configuration tables
-- so the dashboard doesn't break when RLS is enabled.

DROP POLICY IF EXISTS "Authenticated users can read sessions" ON public.sessions;
CREATE POLICY "Authenticated users can read sessions" ON public.sessions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read classes" ON public.classes;
CREATE POLICY "Authenticated users can read classes" ON public.classes FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read subjects" ON public.subjects;
CREATE POLICY "Authenticated users can read subjects" ON public.subjects FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read teacher_class_subjects" ON public.teacher_class_subjects;
CREATE POLICY "Authenticated users can read teacher_class_subjects" ON public.teacher_class_subjects FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read users" ON public.users;
CREATE POLICY "Authenticated users can read users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
