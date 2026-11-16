import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

// The 7 affective traits, exactly as stored in report_remarks.affective
// (see resultsEngine.js AFFECTIVE_TRAITS). Only these keys are accepted.
const TRAITS = [
  'Attentiveness',
  'Neatness',
  'Politeness',
  'Punctuality',
  'Relationship with Others',
  'Bible Memory',
  'Pace work',
] as const;

const KEY_WORDS: Record<number, string> = {
  5: 'Excellent',
  4: 'Good',
  3: 'Satisfactory',
  2: 'Fair',
  1: 'Poor',
};

// Same lock as the other AI endpoints (generate-lesson,
// generate-utme-questions, suggest-affective): only signed-in portal
// users may call it. Portal sessions live in browser localStorage, so
// the calling page sends its access token as a Bearer token; verify
// that token against Supabase Auth here. Fail closed: any missing,
// invalid, expired, or unverifiable token is rejected.
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

// The remark must be plain prose. Strip markdown fences and wrapping
// quotation marks; reject anything too short to be a remark.
function cleanRemark(raw: string): string | null {
  let text = raw.trim();
  // Strip a wrapping code fence, if the model added one.
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  // Strip one layer of wrapping double quotes.
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).trim();
  }
  if (text.length < 10) return null;
  return text.slice(0, 600);
}

export async function POST(req: Request) {
  try {
    if (!(await requireSignedInUser(req))) {
      return NextResponse.json({ error: 'Unauthorized: sign in to use this endpoint.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawScores = body?.scores && typeof body.scores === 'object' ? (body.scores as Record<string, unknown>) : {};
    const scores: Array<{ trait: string; score: number }> = [];
    for (const trait of TRAITS) {
      const v = rawScores[trait];
      const n = typeof v === 'number' ? v : typeof v === 'string' && /^[1-5]$/.test(v.trim()) ? parseInt(v.trim(), 10) : null;
      if (n !== null && Number.isInteger(n) && n >= 1 && n <= 5) {
        scores.push({ trait, score: n });
      }
    }
    const observations = typeof body?.observations === 'string' ? body.observations.trim().slice(0, 2000) : '';
    if (scores.length === 0 && observations.length < 10) {
      return NextResponse.json({ error: 'Select at least one trait score, or write a few observations, first.' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set' }, { status: 500 });
    }

    const unscored = TRAITS.filter((t) => !scores.some((s) => s.trait === t));
    const scoreLines = scores.map((s) => `- ${s.trait}: ${s.score} (${KEY_WORDS[s.score]})`).join('\n');

    // Honesty guardrail: the remark must reflect ONLY the scores the
    // teacher selected (and the teacher's observations, if any). The
    // model must not invent achievements, behaviour, attendance, or
    // traits the teacher did not score.
    const promptText = `You are helping a Nigerian school teacher write the Supervisor's remark for a student's report card. The teacher selected the affective trait scores below, and those scores are the ONLY evidence you may use. Traits the teacher did not score must NOT be mentioned at all.

Selected scores (5 Excellent, 4 Good, 3 Satisfactory, 2 Fair, 1 Poor):
${scoreLines || '(none selected)'}
${unscored.length ? `\nNot scored — do not mention: ${unscored.join(', ')}.` : ''}
${observations ? `\nTeacher's observations (additional evidence, if any):\n"""\n${observations}\n"""` : ''}

Write a warm, professional Supervisor's remark of 2-3 sentences that reflects ONLY these scores${observations ? ' and observations' : ''}. Do not invent achievements, behaviour, attendance, or traits not covered. Do not mention the numbers or the scoring scale. Reply with ONLY the remark text — no quotation marks, no preamble, no markdown.`;

    // The free router sometimes returns an HTTP 200 with EMPTY content
    // (proven 16 Nov via Vercel logs) and then succeeds on a later call,
    // so try up to three times before giving up.
    let remark: string | null = null;
    let upstreamFailures = 0;
    for (let attempt = 1; attempt <= 3 && !remark; attempt++) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          max_tokens: 500,
          temperature: 0.3,
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
      remark = cleanRemark(reply);
      if (!remark) {
        console.error('Unusable AI reply (attempt ' + attempt + ', finish=' + choice?.finish_reason + ', len=' + reply.length + '):', reply);
      }
    }

    if (!remark) {
      if (upstreamFailures === 3) {
        return NextResponse.json({ error: 'The AI drafting service is unavailable right now. Please write the remark by hand.' }, { status: 500 });
      }
      return NextResponse.json({ error: 'The AI reply could not be read. Please write the remark by hand.' }, { status: 500 });
    }

    return NextResponse.json({ remark });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Server Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
