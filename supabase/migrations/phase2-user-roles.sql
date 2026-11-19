-- Phase 2: multi-role support for the Educare-style role switcher (PR #41).
--
-- users.role stays the PRIMARY role; user_roles holds EXTRA roles only.
-- A teacher granted 'admin' keeps every teacher feature and gains the
-- Admin dashboard in the profile menu (see public/roleSwitcher.js).
-- Run this in the Supabase SQL editor before testing the switcher.

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'teacher')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Any signed-in user can read roles (the switcher menu needs them).
drop policy if exists "user_roles_select" on public.user_roles;
create policy "user_roles_select" on public.user_roles
  for select to authenticated using (true);

-- Only admins can grant roles.
drop policy if exists "user_roles_insert" on public.user_roles;
create policy "user_roles_insert" on public.user_roles
  for insert to authenticated with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Only admins can remove roles.
drop policy if exists "user_roles_delete" on public.user_roles;
create policy "user_roles_delete" on public.user_roles
  for delete to authenticated using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
