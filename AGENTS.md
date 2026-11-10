<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SpringDrill Portal — project brief

Exam platform for schools. Live at https://springdrill-portal.vercel.app. Deploys from GitHub `adielasam/springdrill-portal` (branch `main`) via Vercel on every push.

## Stack

- Next.js 16 + React 19 + TypeScript. Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for auth and data.
- Most of the app is static HTML pages in `public/` (admin_*.html, teacher_*.html, student_*.html) talking to Supabase via `public/supabaseClient.js`. The Next.js `app/` directory holds the landing page, layout, global CSS and API routes (`app/api/`, `api/admin/`).

## Rules for anyone editing this repo (human or agent)

- **Never add a new root-level `fix_*.js`, `patch_*.js`, `rewrite_*.js`, `build_*.js` or `replace_*.js` script.** Edit the source file directly. One-off scripts that edit files in place are how this repo accumulated 41 dead scripts — all deleted in the de-slop pass, none of them referenced by anything. Do not recreate them.
- **One shared sidebar.** Admin and teacher pages must share the same sidebar component/markup. No per-page divergent menus.
- **No dead links.** Every sidebar and report link must lead to a real page or function. Never ship `href="#"`.
- **Small, reviewable commits.** One fix per commit, with a clear message.
- **Do not change** the Supabase project, the auth flow, or the Vercel/GitHub deployment pipeline.
- **Do not break working flows:** home-page Demo Student login, student dashboard, JAMB/UTME Simulator (answering + Submit records a score under My Results), JAMB Question Bank Injector (teacher bulk CSV upload), student results/analytics, teacher dashboard.
- **Verify after every change:** build cleanly and click through the affected pages on the live site. Report anything still broken instead of leaving it silently.
- Keep `public/` free of stray files: no build logs, no `dummy.*`, no Word lock files (`~$*`).

## Known issues (from the 5 Nov 2026 admin walkthrough)

See `workspace` prompt `spring-drill-admin-fixes/antigravity-prompt.md` (owner's copy): Approvals and Messages pages never finish loading; 9 of 13 report links dead; Publish is an exact copy of Approve; no admin CBT/question-bank/exam management; contradictory dashboard counts; duplicate/null/test records; Fees vs Payments mismatch; Maths Q8/Q1 have no correct option. Submit works in the owner's browser but is dead in Muse's cloud browser (session-specific, under investigation).
