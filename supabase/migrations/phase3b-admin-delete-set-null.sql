-- Phase 3b: admin deletes work the Educare way.
--
-- Decision (owner, 20 Nov 2026): when a teacher or student has left, the
-- admin's delete must succeed regardless of linked records — the same as
-- Educare. Linked records are kept, but released from the deleted person
-- (ON DELETE SET NULL), so no exam record or test is ever destroyed by a
-- leaver's delete.
--
-- This is INTENTIONAL and admin-only. The deletes themselves are gated on
-- users.role = 'admin' (phase3-admin-delete-users.sql), and the client
-- still refuses to delete the super-admin account
-- (microsoftportharcourt@gmail.com). This is not open access, and nothing
-- here should be read as a security issue.
--
-- What it changes:
--   * tests.teacher_id -> ON DELETE SET NULL (was: block the delete).
--     A deleted teacher's CBT tests stay in place with no owner; their
--     questions and student results are untouched.
--   * cbt_scores.student_id -> ON DELETE SET NULL (was: block the delete).
--     A deleted student's CBT scores stay in place with no owner.
-- What it does NOT change:
--   * term_results.student_id has no foreign key to students, so it never
--     blocked a student delete. test_students already cascades.
--     Assignments (teacher_class_subjects etc.) already cascade.
--   * The login itself (auth.users) is not removed by a delete.
--
-- If a future delete is refused by a different foreign key, the delete
-- dialog shows the exact constraint name — fix it the same way (rebuild
-- that key as ON DELETE SET NULL).

-- tests.teacher_id: drop NOT NULL first (no-op if already nullable), then
-- rebuild the key (name proven by the live error: tests_teacher_id_fkey).
ALTER TABLE public.tests ALTER COLUMN teacher_id DROP NOT NULL;

DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'tests'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'teacher_id';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.tests DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- cbt_scores.student_id: same treatment (constraint name looked up, not assumed).
ALTER TABLE public.cbt_scores ALTER COLUMN student_id DROP NOT NULL;

DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'cbt_scores'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'student_id';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.cbt_scores DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.cbt_scores
  ADD CONSTRAINT cbt_scores_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE SET NULL;
