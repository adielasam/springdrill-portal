// Attempt sync for signed-in students — deliberately constrained.
//
// The portal's Supabase client (public/supabaseClient.js) stores its auth
// session in localStorage under the standard sb-<project-ref>-auth-token
// key. This module creates a client for the SAME project with the SAME
// publishable key, so it sees the same session the portal signed in —
// without touching the auth flow, signing anything in or out, or changing
// any RLS policy.
//
// ONLY when a session exists, completed attempts are queued locally and
// flushed to test_results when online, using EXACTLY the insert shape the
// existing UTME engine uses in public/utme_test_engine.html
// (student_id, test_id 998, score scaled to /400, total_score 400).
// Guests (no session) keep local history only — nothing is ever synced
// for them, and the UI says so honestly.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Same project URL + publishable key as public/supabaseClient.js (public
// values, already shipped to every browser by the portal pages).
const SUPABASE_URL = "https://jmxyopohngslqvzknjnt.supabase.co";
const SUPABASE_KEY = "sb_publishable_yGvqUxGlwiJuSkFN4VOpWw_nKYmo-vl";

const HISTORY_KEY = "sd-jamb-history-v1";
const HISTORY_LIMIT = 20;

export interface Attempt {
  id: string;
  createdAt: string; // ISO timestamp of completion
  subject: string;
  year: string;
  size: number;
  mode: "practice" | "study";
  correct: number;
  total: number;
  jambScore: number; // scaled to /400, mirroring the UTME engine
  synced: boolean;
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!client) {
    try {
      client = createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch {
      return null;
    }
  }
  return client;
}

// The signed-in student's id, or null for guests / when Supabase is
// unreachable. Never throws.
export async function getSessionUserId(): Promise<string | null> {
  try {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export function loadHistory(): Attempt[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Attempt =>
        a && typeof a.id === "string" && typeof a.correct === "number" && typeof a.total === "number",
    );
  } catch {
    return [];
  }
}

function saveHistory(attempts: Attempt[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(attempts.slice(0, HISTORY_LIMIT)));
  } catch {
    // Storage full or unavailable: history is a nicety, never fatal.
  }
}

// Record a completed attempt locally, then try to sync it in the
// background. Returns the stored attempt. Never throws.
export async function recordAttempt(
  attempt: Omit<Attempt, "id" | "createdAt" | "synced">,
): Promise<Attempt> {
  const stored: Attempt = {
    ...attempt,
    id: `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    synced: false,
  };
  saveHistory([stored, ...loadHistory()]);
  // Fire-and-forget: syncing must never block the results screen.
  void flushQueue();
  return stored;
}

export type FlushResult = "synced" | "guest" | "offline" | "error" | "nothing-queued";

// In-flight guard: concurrent flushQueue calls (e.g. from recordAttempt
// and the 'online' handler at once) share one run, so the same attempt can
// never be inserted twice.
let flushInFlight: Promise<FlushResult> | null = null;

// Flush unsynced attempts to test_results. No-ops for guests and while
// offline. Failures leave the queue intact for the next attempt.
export async function flushQueue(): Promise<FlushResult> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = runFlush();
  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

async function runFlush(): Promise<FlushResult> {
  try {
    if (typeof window === "undefined" || !window.navigator.onLine) return "offline";
    const history = loadHistory();
    const pending = history.filter((a) => !a.synced);
    if (pending.length === 0) return "nothing-queued";
    const userId = await getSessionUserId();
    if (!userId) return "guest";
    const sb = getClient();
    if (!sb) return "error";

    let syncedAny = false;
    for (const attempt of pending) {
      const { error } = await sb.from("test_results").insert([
        {
          student_id: userId,
          test_id: 998,
          score: attempt.jambScore,
          total_score: 400,
          created_at: attempt.createdAt,
        },
      ]);
      if (error) return syncedAny ? "synced" : "error";
      attempt.synced = true;
      syncedAny = true;
      saveHistory(history);
    }
    return "synced";
  } catch {
    return "error";
  }
}
