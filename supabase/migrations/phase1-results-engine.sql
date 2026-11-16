-- ============================================================================
-- SpringDrill — Phase 1 results engine: database setup
-- ============================================================================
-- RUN ONCE in the Supabase Dashboard: SQL Editor -> New query -> paste ->
-- Run. Safe to run more than once: every statement below is idempotent
-- (IF NOT EXISTS / DROP IF EXISTS guards).
--
-- CORRECTED 16 Nov 2026: the original step 6 (UPDATE backfill of total)
-- was removed — total is a GENERATED column and cannot be updated
-- (Postgres 428C9, proven on the live DB). Re-running this file after a
-- failed run is safe: steps that already applied are no-ops.
--
-- WHY THIS FILE EXISTS
-- The portal code (term_results reads/writes) already assumes these
-- columns and statuses, but two things may not exist in the live database:
--   1. The term_results status check constraint may still only allow
--      ('draft', 'final'). The workflow needs draft -> submitted ->
--      approved -> published (+ rejected). Without this change, Approve,
--      Reject, Submit Final and Publish fail with a check-constraint
--      error (the approve page already warns about this).
--   2. There is no session column on term_results and no table at all for
--      term remarks / affective scores, so the Make Report page and the
--      report-card remarks have nowhere to store their data.
--
-- WHAT DEPENDS ON IT
--   * Widened status constraint: Make Report (Submit Final), Approve,
--     Publish. Until it runs, those actions show an honest "run the SQL
--     setup" message instead of silently failing.
--   * session column: Make Report, broadsheet, publish, student card.
--   * report_remarks table: Teacher Comments, report cards (remarks +
--     affective keys). Until it runs, those pages show "setup required"
--     instead of crashing.
-- ============================================================================

-- 1. Widen the term_results status constraint to the full workflow.
ALTER TABLE public.term_results DROP CONSTRAINT IF EXISTS term_results_status_check;
ALTER TABLE public.term_results
    ADD CONSTRAINT term_results_status_check
    CHECK (status IN ('draft', 'submitted', 'final', 'approved', 'rejected', 'published'));

-- 2. Columns the results pages read/write (no-ops if they already exist).
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS session text;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS first_cat numeric;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS second_cat numeric;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS exam numeric;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS submitted_by uuid;
ALTER TABLE public.term_results ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- 3. Lookup index for the class/subject/term/sub-term queries every
--    results page runs.
CREATE INDEX IF NOT EXISTS term_results_lookup_idx
    ON public.term_results (class_id, subject_id, term, sub_term);

-- 4. Term remarks + affective scores (one row per student per class/term).
--    Supervisor's remark = form/class teacher; Principal's remark = admin.
--    Affective scores are stored as JSON, e.g.
--    {"Attentiveness": 5, "Neatness": 4, ...} with values 1-5.
CREATE TABLE IF NOT EXISTS public.report_remarks (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id bigint NOT NULL,
    class_id bigint NOT NULL,
    session text,
    term text NOT NULL,
    sub_term text NOT NULL,
    supervisor_remark text,
    principal_remark text,
    affective jsonb DEFAULT '{}'::jsonb,
    updated_by uuid,
    updated_at timestamptz DEFAULT now()
);

-- One remark row per student per class/term (session included when set).
-- Plain unique index (not a constraint) so re-runs stay harmless.
CREATE UNIQUE INDEX IF NOT EXISTS report_remarks_unique_idx
    ON public.report_remarks (student_id, class_id, COALESCE(session, ''), term, sub_term);

-- 5. Row Level Security for the new table.
--    NOTE: these policies mirror the project's existing pattern for
--    portal tables (signed-in users read/write through the app). If your
--    project uses stricter per-role policies elsewhere, tighten these to
--    match before going live.
ALTER TABLE public.report_remarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_remarks_select" ON public.report_remarks;
CREATE POLICY "report_remarks_select" ON public.report_remarks
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "report_remarks_insert" ON public.report_remarks;
CREATE POLICY "report_remarks_insert" ON public.report_remarks
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "report_remarks_update" ON public.report_remarks;
CREATE POLICY "report_remarks_update" ON public.report_remarks
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 6. No backfill step: term_results.total is a GENERATED column in the
--    live database (proven 16 Nov 2026: UPDATE on it fails with 428C9),
--    so the database computes it from the components itself and there
--    is nothing to backfill. Do not add an UPDATE of total here.
