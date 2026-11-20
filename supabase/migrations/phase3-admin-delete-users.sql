-- Phase 3: give the admin the right to delete teachers and students.
--
-- Problem: the admin's Delete button on the Teachers list (and in User
-- Management) silently did nothing. The client code never checked the
-- delete's returned error, so a refused delete still removed the row
-- from the screen — and the teacher came back on refresh.
--
-- The server side of that refusal: the repo's migrations give public.users
-- only a SELECT policy ("Authenticated users can read users") and give
-- public.students only the "Admin manage students" FOR ALL policy, which
-- may never have been applied to the live database. Without a DELETE
-- policy, PostgREST refuses the delete and the client has to surface it
-- (fixed in the same PR: teacher_list.html, manage_users.html,
-- teacher_student_profile.html now check the returned error and only
-- remove the row when the server confirms).
--
-- This file adds the two missing DELETE policies, gated on the caller's
-- users.role = 'admin' — the same pattern as the existing "Admin manage"
-- policies. The super-admin email guard (microsoftportharcourt@gmail.com)
-- stays in the client: super-admin accounts still cannot be deleted, and
-- only a super admin can delete another admin account.
--
-- Run this in the Supabase SQL editor (same as phase1/phase2), then delete
-- the leaver from the Teachers list or User Management. The login itself
-- (auth.users) is NOT removed by this — the account simply has no
-- Spring Drill record left; removing the Auth account needs the service
-- key and is a separate step if ever wanted.
--
-- Known limit: a student who has CBT scores cannot be deleted — the
-- cbt_scores table references students(id) with no cascade, so the delete
-- fails with a foreign-key error and the message says so. Removing a
-- student's scores first is a deliberate, separate decision.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admin can delete users'
  ) THEN
    CREATE POLICY "Admin can delete users" ON public.users
      FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'students'
      AND policyname = 'Admin can delete students'
  ) THEN
    CREATE POLICY "Admin can delete students" ON public.students
      FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.role = 'admin'
      ));
  END IF;
END $$;
