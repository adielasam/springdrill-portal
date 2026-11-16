import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// The 7 affective traits, exactly as stored in report_remarks.affective
// (see resultsEngine.js AFFECTIVE_TRAITS). The response is validated
// against this list; anything else the model returns is dropped.
const TRAITS = [
  'Attentiveness',
  'Neatness',
  'Politeness',
  'Punctuality',
  'Relationship with Others',
  'Bible Memory',
  'Pace work',
] as const;

type Trait = (typeof TRAITS)[number];
type Suggestion = { score: number | null; reason: string };

// Same lock as the other AI endpoints (generate-lesson,
// generate-utme-questions): only signed-in portal users may call it.
// Portal sessions live in browser localStorage, so the calling page
// sends its access token as a Bearer token; verify that token against
// Supabase Auth here. Fail closed: any missing, invalid, expired, or
// unverifiable token is rejected.
async function requireSignedInUser(req: Request): Promise<boolean> {
  try {
    const header = req.headers.get('authorization');
    if (!header || !header.toLowerCase().startsWith('bearer ')) return false;
    const token = header.slice(7).trim();
    if (!token) return false;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error } = await supabase.auth.getUser(token);
    return !error && !!data.user;
  } catch {
    return false;
  }
}

// Normalize the model's message content: some providers return a plain
// string, others an array of content parts. The free router can serve
// either shape, so both must be handled.
function messageText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const content = (message as Record<string, unknown>).content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => {
        if (p && typeof p === 'object') {
          const text = (p as Record<string, unknown>).text;
          if (typeof text === 'string') return text;
        }
        return '';
      })
      .join('\n');
  }
  return '';
}

// The model must return JSON only. Be forgiving about code fences, then
// validate hard: every trait present, score an integer 1-5 or null,
// reason a short string. Nothing unvalidated reaches the caller.
function parseSuggestions(raw: string): Record<Trait, Suggestion> | null {
  // Attempt 1: strict JSON object.
  const strict = parseStrict(raw);
  if (strict) return strict;
  // Attempt 2: per-trait extraction. Each trait is read independently
  // from its own entry, so prose wrapping, trailing commas, truncation
  // and other malformed JSON cannot lose the whole reply.
  return parsePerTrait(raw);
}

function parseStrict(raw: string): Record<Trait, Suggestion> | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const out = {} as Record<Trait, Suggestion>;
  for (const trait of TRAITS) {
    const entry = obj[trait];
    let score: number | null = null;
    let reason = 'No evidence in the observations.';
    if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>;
      if (typeof e.score === 'number' && Number.isInteger(e.score) && e.score >= 1 && e.score <= 5) {
        score = e.score;
      } else if (typeof e.score === 'string' && /^[1-5]$/.test(e.score.trim())) {
        score = parseInt(e.score.trim(), 10);
      }
      if (typeof e.reason === 'string' && e.reason.trim()) {
        reason = e.reason.trim().slice(0, 200);
      }
    }
    out[trait] = { score, reason };
  }
  return out;
}

function parsePerTrait(raw: string): Record<Trait, Suggestion> | null {
  const out = {} as Record<Trait, Suggestion>;
  let found = 0;
  for (const trait of TRAITS) {
    let score: number | null = null;
    let reason = 'No evidence in the observations.';
    const idx = raw.indexOf(`"${trait}"`);
    if (idx !== -1) {
      // Read only up to the end of this trait's entry object, so a
      // score is never borrowed from the next trait's entry.
      const close = raw.indexOf('}', idx);
      const entry = close === -1 ? raw.slice(idx, idx + 400) : raw.slice(idx, close + 1);
      const scoreMatch = entry.match(/"score"\s*:\s*"?(null|[1-5])"?/);
      if (scoreMatch) {
        found++;
        if (scoreMatch[1] !== 'null') score = parseInt(scoreMatch[1], 10);
        const reasonMatch = entry.match(/"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (reasonMatch) {
          try {
            reason = (JSON.parse(`"${reasonMatch[1]}"`) as string).slice(0, 200);
          } catch {
            reason = reasonMatch[1].slice(0, 200);
          }
        }
      }
    }
    out[trait] = { score, reason };
  }
  return found > 0 ? out : null;
}

export async function POST(req: Request) {
  try {
    if (!(await requireSignedInUser(req))) {
      return NextResponse.json({ error: 'Unauthorized: sign in to use this endpoint.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const observations = typeof body?.observations === 'string' ? body.observations.trim().slice(0, 2000) : '';
    if (observations.length < 10) {
      return NextResponse.json({ error: 'Write a few observations about the student first.' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set' }, { status: 500 });
    }

    // Honesty guardrail, stated twice because it is the whole point of
    // this endpoint: the teacher's observations are the ONLY evidence.
    // A trait with no supporting observation MUST come back null — the
    // teacher scores it by hand. The model must never invent a character
    // judgment about a child.
    const promptText = `You are helping a Nigerian school teacher complete the affective (character and behaviour) section of a student's report card. The teacher's own observations below are the ONLY evidence you may use.

Score each trait 1-5 (5 Excellent, 4 Good, 3 Satisfactory, 2 Fair, 1 Poor) ONLY when the observations clearly support it. If the observations say nothing about a trait, its score MUST be null — never guess, never infer a character judgment from silence.

Traits: ${TRAITS.join(', ')}.

Examples of what counts as evidence: "arrives early", "always on time" → Punctuality; "neat", "tidy", "clean uniform" → Neatness; "polite", "respectful", "greets" → Politeness; "pays attention", "focused", "listens" → Attentiveness; "helps classmates", "relates well", "kind to others" → Relationship with Others; "knows verses", "memorizes scripture" → Bible Memory; "finishes work quickly" or "slow to finish" → Pace work. These examples only help you RECOGNIZE evidence in the observations — never score a trait the observations do not actually speak about.

Teacher's observations:
"""
${observations}
"""

Reply with ONLY a JSON object, no other text and no markdown fences, in exactly this shape:
{"Attentiveness": {"score": 4, "reason": "..."}, "Neatness": {"score": null, "reason": "No evidence in the observations."}, ...}
Start your reply with { — write nothing before the JSON object.
Each reason must be one short sentence grounded in the observations.`;

    // The free router sometimes returns an HTTP 200 with EMPTY content
    // (proven 16 Nov via Vercel logs: empty replies, no API error) and
    // then succeeds on a later call, so try up to three times before
    // giving up — the teacher should not have to click repeatedly for
    // one suggestion. A generous token budget also guards against
    // reasoning models spending the budget before emitting content.
    let suggestions: Record<Trait, Suggestion> | null = null;
    let upstreamFailures = 0;
    for (let attempt = 1; attempt <= 3 && !suggestions; attempt++) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          max_tokens: 2000,
          temperature: 0.2,
          messages: [{ role: 'user', content: promptText }],
        }),
      });

      if (!response.ok) {
        upstreamFailures++;
        const errorText = await response.text();
        console.error('OpenRouter API Error:', errorText);
        continue;
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const reply = messageText(choice?.message);
      suggestions = parseSuggestions(reply);
      if (!suggestions) {
        console.error('Unparseable AI reply (attempt ' + attempt + ', finish=' + choice?.finish_reason + ', len=' + reply.length + '):', reply);
      }
    }

    if (!suggestions) {
      if (upstreamFailures === 3) {
        return NextResponse.json({ error: 'The AI suggestion service is unavailable right now. Please score the traits by hand.' }, { status: 500 });
      }
      return NextResponse.json({ error: 'The AI reply could not be read. Please score the traits by hand.' }, { status: 500 });
    }

    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Server Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
