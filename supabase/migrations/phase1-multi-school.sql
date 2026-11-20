-- ============================================================================
-- Phase 1 — Multi-school: schools table + school_id on tenant tables
-- Spring Drill multi-school plan, Phase 1 (20 Nov 2026).
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor and press
-- Run. It is safe to run twice: every step is IF NOT EXISTS or guarded, so
-- re-running changes nothing.
--
-- It does NOT touch Row Level Security. RLS stays exactly as it is now
-- (OFF). The owner re-runs the RLS enable script separately if wanted.
--
-- AFTER RUNNING: open the portal as admin and confirm Spring Valley still
-- works (dashboard, students list, a teacher page). Then read the checks
-- at the bottom of this file and confirm the counts.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SCHOOLS TABLE — reconcile with the live table (plan §2.6)
-- Live table (confirmed 20 Nov 2026): id integer, name text,
-- created_at timestamptz; 3 rows, all 2026-09-17: SpringDrill Nursery
-- School, SpringDrill Primary School, SpringDrill High School.
-- Those 3 rows are SpringDrill's own internal sections, NOT partner
-- schools. They are kept exactly as they are. This step only ADDS the
-- partner-school columns the plan specifies. No second schools table.
--
-- Columns town / students_count / wants are the plan's own signup-form
-- fields (§1.1) — the plan's table list (§2.1) has no column for them,
-- so they are added here for the vendor to review signups.
-- setup_completed is needed by plan §1.4 (the setup wizard): a school
-- whose setup is unfinished is sent back to the wizard on login.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS setup_code TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS town TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS students_count INTEGER;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS wants TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS motto TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS student_limit INTEGER;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN;

-- Defaults for NEW rows only (existing rows keep NULL, so the 3 section
-- rows are NOT marked 'pending' — they are not partner schools).
ALTER TABLE public.schools ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.schools ALTER COLUMN setup_completed SET DEFAULT false;

-- One slug per school. NULL slugs (the 3 section rows) never conflict.
CREATE UNIQUE INDEX IF NOT EXISTS schools_slug_unique ON public.schools (slug);

-- ---------------------------------------------------------------------------
-- 2. school_id ON EVERY TENANT TABLE (plan §2.2, plus fees / payments /
-- invoices — the plan's list omits the finance tables, but setup step 4
-- writes fees per school, so they belong here too)
-- Added as a plain INTEGER column first; the foreign key is added in the
-- next step so a key problem can never block the column itself. A table
-- that does not exist in this database is reported and skipped.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','students','teachers','classes','subjects','sessions','terms',
    'sub_terms','tests','questions','test_questions','test_students',
    'test_results','cbt_tests','cbt_scores','term_results','report_remarks',
    'teacher_class_subjects','student_subjects','assignments',
    'term_results_audit','fees','payments','invoices'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS school_id INTEGER', t);
      RAISE NOTICE 'school_id column ok: %', t;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'school_id column skipped %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- Foreign keys to schools(id). If a school row is ever deleted, its rows
-- go ownerless (SET NULL) instead of blocking the delete.
DO $$
DECLARE
  t text;
  cname text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','students','teachers','classes','subjects','sessions','terms',
    'sub_terms','tests','questions','test_questions','test_students',
    'test_results','cbt_tests','cbt_scores','term_results','report_remarks',
    'teacher_class_subjects','student_subjects','assignments',
    'term_results_audit','fees','payments','invoices'
  ] LOOP
    cname := 'fk_' || t || '_school_id';
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = cname) THEN
        EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE SET NULL', t, cname);
        RAISE NOTICE 'FK added: %', t;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FK skipped %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. SPRING VALLEY BECOMES SCHOOL #1 (plan §2.5)
-- A NEW row is created for Spring Valley School. The 3 existing section
-- rows are NOT Spring Valley and are NOT touched: they stay as the
-- school's internal sections (Nursery / Primary / High) and keep their
-- NULL partner columns. If this file is run twice, the row is reused.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  sv_id INTEGER;
BEGIN
  SELECT id INTO sv_id FROM public.schools
  WHERE slug = 'spring-valley' OR name = 'Spring Valley School'
  LIMIT 1;
  IF sv_id IS NULL THEN
    INSERT INTO public.schools (name, slug, status, setup_completed, approved_at)
    VALUES ('Spring Valley School', 'spring-valley', 'active', true, now())
    RETURNING id INTO sv_id;
    RAISE NOTICE 'Spring Valley partner row created: id %', sv_id;
  ELSE
    UPDATE public.schools
    SET slug = COALESCE(slug, 'spring-valley'),
        status = 'active',
        setup_completed = true,
        approved_at = COALESCE(approved_at, now())
    WHERE id = sv_id;
    RAISE NOTICE 'Spring Valley partner row already exists: id %', sv_id;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. VENDOR ROLE (plan §2.4)
-- The current admin login becomes the vendor (super admin). Vendor logins
-- have NO school: school_id stays NULL for this account.
-- ---------------------------------------------------------------------------
-- 'vendor' must be added to the user_role enum FIRST: public.users.role
-- is an enum, and the UPDATE below fails with 22P02 ("invalid input
-- value for enum user_role") if the value does not exist yet — the
-- first run of this file hit exactly that, and the DO block's
-- EXCEPTION handler swallowed it. This is a top-level statement on
-- purpose: ALTER TYPE ... ADD VALUE cannot run inside a transaction
-- block or a DO block.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'vendor';
DO $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.users SET role = 'vendor'
  WHERE email = 'microsoftportharcourt@gmail.com';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'vendor role set on % user(s)', n;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'vendor role update skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 5. TAG EXISTING ROWS AS SPRING VALLEY (plan §2.5)
-- Every existing row with no school gets Spring Valley's id. The vendor
-- account is left without a school (see §4).
--
-- EXCEPTION — subjects: subjects.school_id already means "which section"
-- (1 = Nursery, 2 = Primary, 3 = High) in the live database, and the
-- Subjects pages filter by it. Overwriting it would break section
-- filtering, so subjects rows are NOT retagged here. Phase 2 will add a
-- separate section link for subjects and then tag them to their school.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  sv_id INTEGER;
  t text;
  n INTEGER;
BEGIN
  SELECT id INTO sv_id FROM public.schools WHERE slug = 'spring-valley' LIMIT 1;
  IF sv_id IS NULL THEN
    RAISE NOTICE 'tagging skipped: no Spring Valley row';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'students','teachers','classes','sessions','terms','sub_terms',
    'tests','questions','test_questions','test_students','test_results',
    'cbt_tests','cbt_scores','term_results','report_remarks',
    'teacher_class_subjects','student_subjects','assignments',
    'term_results_audit','fees','payments','invoices'
  ] LOOP
    BEGIN
      EXECUTE format('UPDATE public.%I SET school_id = $1 WHERE school_id IS NULL', t) USING sv_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      RAISE NOTICE 'tagged % rows in %', n, t;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'tagging skipped %: %', t, SQLERRM;
    END;
  END LOOP;
  -- users: everyone except the vendor.
  BEGIN
    UPDATE public.users SET school_id = sv_id
    WHERE school_id IS NULL AND role IS DISTINCT FROM 'vendor';
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE 'tagged % users', n;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'user tagging skipped: %', SQLERRM;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- 6. CHECKS — read the output after running
-- Expect: schools = 4 rows (3 sections + Spring Valley); the Spring Valley
-- row has slug 'spring-valley', status 'active'; users shows 1 vendor;
-- students / classes show school_id set (not NULL).
-- ---------------------------------------------------------------------------
SELECT id, name, slug, status, setup_completed FROM public.schools ORDER BY id;
SELECT role, COUNT(*) AS users FROM public.users GROUP BY role ORDER BY role;
SELECT school_id, COUNT(*) AS students FROM public.students GROUP BY school_id;
SELECT school_id, COUNT(*) AS classes FROM public.classes GROUP BY school_id;
SELECT school_id, COUNT(*) AS teachers FROM public.teachers GROUP BY school_id;
