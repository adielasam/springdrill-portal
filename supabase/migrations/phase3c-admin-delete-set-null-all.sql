-- Phase 3c: finish the Educare delete policy — no more one-by-one blocks.
--
-- After phase3b ran, deleting Richard Odili moved past the tests table and
-- was refused by the NEXT key: questions_teacher_id_fkey on public.questions.
-- The live database has foreign keys the repo's migrations never recorded
-- (the tests and questions tables are not in them), so fixing keys one at a
-- time costs a round trip per key. This file ends that cycle.
--
-- Same decision as phase3b (owner, 20 Nov 2026): an admin delete of a
-- teacher or student who has left must succeed regardless of linked
-- records. Linked records are kept but released from the deleted person
-- (ON DELETE SET NULL) — no exam record, test or question is destroyed.
-- Intentional and admin-only (deletes gated on users.role = 'admin');
-- not a security issue.
--
-- What it does, in order:
--   1. The known next blocker, explicitly (name proven by the live error):
--      questions.teacher_id -> ON DELETE SET NULL. Richard's bank questions
--      stay in the bank with no author.
--   2. A safety net: every OTHER single-column foreign key pointing at
--      public.users(id) or public.students(id) that would still block a
--      delete is rebuilt the same way. Keys that already cascade or already
--      release are left alone; multi-column keys are left alone (rebuilding
--      one as single-column would be wrong). Anything it cannot rebuild is
--      reported as a NOTICE, not an error, so the script keeps going.
--
-- Run in the Supabase SQL editor. Then retry the delete from the Teachers
-- list — it should succeed, and the teacher stays gone after refresh.

-- 1. The known blocker: questions.teacher_id.
ALTER TABLE public.questions ALTER COLUMN teacher_id DROP NOT NULL;

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
    AND tc.table_name = 'questions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'teacher_id';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.questions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_teacher_id_fkey
  FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Safety net: every other single-column key into users/students.
DO $$
DECLARE
  r record;
  upd text;
BEGIN
  FOR r IN
    SELECT tc.table_name AS tbl,
           kcu.column_name AS col,
           tc.constraint_name AS cname,
           ccu.table_name AS ref_tbl,
           ccu.column_name AS ref_col,
           rc.update_rule AS upd_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
     AND tc.table_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
     AND rc.unique_constraint_schema = ccu.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.table_name IN ('users', 'students')
      AND rc.delete_rule NOT IN ('SET NULL', 'CASCADE')
      AND (
        SELECT count(*) FROM information_schema.key_column_usage k2
        WHERE k2.constraint_name = tc.constraint_name
          AND k2.table_schema = tc.table_schema
      ) = 1
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', r.tbl, r.col);
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, r.cname);
      upd := CASE WHEN r.upd_rule <> 'NO ACTION' THEN ' ON UPDATE ' || r.upd_rule ELSE '' END;
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE SET NULL%s',
        r.tbl, r.cname, r.col, r.ref_tbl, r.ref_col, upd);
      RAISE NOTICE 'Delete-release applied: %.%I -> %.%I', r.tbl, r.col, r.ref_tbl, r.ref_col;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Delete-release SKIPPED: %.%I (%): %', r.tbl, r.col, r.cname, SQLERRM;
    END;
  END LOOP;
END $$;
