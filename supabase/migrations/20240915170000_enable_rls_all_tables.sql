-- Enable Row-Level Security on all tables to satisfy Supabase security requirements.
ALTER TABLE public.term_results_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cbt_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Ensure that even with RLS enabled, authenticated users can still access what they need.
-- (Assuming relax_rls.sql already created permissive policies, enabling RLS just activates those policies. If no policies exist, it defaults to deny-all. The previous relax_rls.sql created "Allow all" policies for authenticated users).
