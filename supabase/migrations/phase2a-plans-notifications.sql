-- ============================================================================
-- Phase 2a — Subscription plans + school notifications + school requests
-- Spring Drill multi-school (20 Nov 2026).
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor and press
-- Run. It is safe to run twice: every step is IF NOT EXISTS or guarded.
-- RUN THE PHASE 1 MIGRATION FIRST (phase1-multi-school.sql): this file
-- links announcements and requests to the schools table it creates.
--
-- It does NOT touch Row Level Security. RLS stays exactly as it is now.
--
-- PRICES ARE PROPOSED DEFAULTS, FLAT PER SCHOOL PER MONTH (not per
-- student) — the vendor can change any price from the vendor dashboard:
--   Starter  ₦5,000/month  (₦50,000/year, 2 months free), up to 100 students
--   Growth   ₦10,000/month (₦100,000/year), up to 300 students
--   Premium  ₦20,000/month (₦200,000/year), unlimited students
--   Every plan starts with a 14-day free trial.
-- Benchmark (Educare, verified 20 Nov 2026 at
-- educare.school/educare-packages): Standard ₦500 per student monthly,
-- Premium ₦1,250 per student monthly, Enterprise "Contact Us", no free
-- trial, CBT locked behind Premium. A 200-student school pays Educare
-- ₦100,000/month on Standard; on Spring Drill Starter it pays ₦5,000.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PLANS — the subscription plans a school can choose
-- features is newline-separated text, shown as a bullet list.
-- student_limit NULL means unlimited students.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    monthly_price INTEGER NOT NULL,
    yearly_price INTEGER NOT NULL,
    student_limit INTEGER,
    features TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    INSERT INTO public.plans (name, monthly_price, yearly_price, student_limit, features)
    SELECT 'Starter', 5000, 50000, 100,
           'Results & report cards' || chr(10) ||
           'CBT tests' || chr(10) ||
           'JAMB practice' || chr(10) ||
           'Question bank'
    WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Starter');
    INSERT INTO public.plans (name, monthly_price, yearly_price, student_limit, features)
    SELECT 'Growth', 10000, 100000, 300,
           'Everything in Starter' || chr(10) ||
           'Finance & fees tracking' || chr(10) ||
           'Attendance' || chr(10) ||
           'AI lesson planner'
    WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Growth');
    INSERT INTO public.plans (name, monthly_price, yearly_price, student_limit, features)
    SELECT 'Premium', 20000, 200000, NULL,
           'Everything in Growth' || chr(10) ||
           'Priority support' || chr(10) ||
           'Custom subdomain' || chr(10) ||
           'Data migration help'
    WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE name = 'Premium');
    RAISE NOTICE 'plans seeded';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'plans seed skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 2. SCHOOL ANNOUNCEMENTS — vendor messages to schools
-- school_id NULL = every school (e.g. an upgrade announcement).
-- created_by is the vendor's display name, for the record only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_announcements (
    id SERIAL PRIMARY KEY,
    school_id INTEGER,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_announcements_school_id') THEN
        ALTER TABLE public.school_announcements
            ADD CONSTRAINT fk_announcements_school_id
            FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
        RAISE NOTICE 'announcements FK added';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'announcements FK skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 3. SCHOOL REQUESTS — a school asks the vendor for more time or a plan
-- type 'extension': the school wants its membership extended by 1 month.
-- type 'plan_change': details holds the plan name the school chose.
-- Approving an extension moves expires_at one month ahead (same rule as
-- the vendor dashboard Extend button); approving a plan change sets the
-- school's plan. There is no payment yet — renewal is by hand.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_requests (
    id SERIAL PRIMARY KEY,
    school_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('extension', 'plan_change')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_requests_school_id') THEN
        ALTER TABLE public.school_requests
            ADD CONSTRAINT fk_requests_school_id
            FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;
        RAISE NOTICE 'requests FK added';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'requests FK skipped: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 4. CHECKS — read the output after running
-- Expect: 3 plans (Starter, Growth, Premium); announcements and requests
-- empty (0 rows) until the vendor posts one or a school asks for one.
-- ---------------------------------------------------------------------------
SELECT id, name, monthly_price, yearly_price, student_limit, is_active FROM public.plans ORDER BY monthly_price;
SELECT COUNT(*) AS announcements FROM public.school_announcements;
SELECT COUNT(*) AS requests FROM public.school_requests;
