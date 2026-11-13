import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const maxDuration = 60;

// Paid AI endpoint: only signed-in portal users may call it. Portal
// sessions live in browser localStorage (see public/supabaseClient.js),
// so the calling page sends its access token as a Bearer token; verify
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

export async function POST(req: Request) {
  try {
    if (!(await requireSignedInUser(req))) {
      return NextResponse.json({ error: 'Unauthorized: sign in to use this endpoint.' }, { status: 401 });
    }

    const { subject, count } = await req.json();

    // Cap the caller-supplied count: default 5, never more than 40
    // (the simulator's per-subject size). Never pass an uncapped
    // caller value into the prompt.
    const rawCount = Number(count);
    const safeCount = Number.isFinite(rawCount)
      ? Math.min(40, Math.max(1, Math.floor(rawCount)))
      : 5;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set' }, { status: 500 });
    }

    const promptText = `Generate a JSON array of exactly ${safeCount} multiple choice questions for the Nigerian JAMB/UTME exam on the subject of ${subject}. 
Each object in the JSON array must have EXACTLY this format:
{
  "question_text": "The actual question?",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
  },
  "correct_option": "A"
}
Output NOTHING but the raw JSON array. Do not wrap in markdown tags like \`\`\`json.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-flash",
        "max_tokens": 4000,
        "messages": [
          {"role": "user", "content": promptText}
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "[]";
    
    // Clean up potential markdown formatting
    reply = reply.trim();
    if (reply.startsWith("```json")) {
      reply = reply.substring(7);
    }
    if (reply.startsWith("```")) {
      reply = reply.substring(3);
    }
    if (reply.endsWith("```")) {
      reply = reply.substring(0, reply.length - 3);
    }

    const parsedQuestions = JSON.parse(reply.trim());

    return NextResponse.json(parsedQuestions);
  } catch (error: any) {
    console.error("Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
