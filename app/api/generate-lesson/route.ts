import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractText } from 'unpdf';
import mammoth from 'mammoth';

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

    const { targetClass, subject, topic, extra, fileUrl } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set' }, { status: 500 });
    }

    let fileContent = '';
    if (fileUrl) {
      try {
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) throw new Error("Could not download file");
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        if (fileUrl.toLowerCase().endsWith('.pdf')) {
          const pdfData = await extractText(new Uint8Array(buffer));
          fileContent = pdfData.text.join('\n');
        } else if (fileUrl.toLowerCase().match(/\.(doc|docx)$/)) {
          const docData = await mammoth.extractRawText({ buffer });
          fileContent = docData.value;
        }
      } catch (e: any) {
        console.error("Error parsing file:", e);
        // Continue without file content if parsing fails
      }
    }

    let promptText = `Act as an expert Nigerian educator. Create a comprehensive lesson plan for ${targetClass} on the subject of ${subject}, focusing on the topic: ${topic}. ${extra || ''}`;
    
    if (fileContent) {
      promptText = `Act as an expert Nigerian educator. You have been provided with a curriculum/scheme of work document below. Create a comprehensive lesson plan for ${targetClass} on the subject of ${subject} for ${topic}. \n\nCRITICAL INSTRUCTION: Read the provided curriculum text, strictly find the specific topic assigned to ${topic}, and base your entire lesson plan STRICTLY on that exact topic. Do not invent unrelated topics.\n\n--- CURRICULUM TEXT ---\n${fileContent.substring(0, 15000)}\n--- END CURRICULUM ---`;
    }

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
      return NextResponse.json({ error: `OpenRouter Error: ${response.status} ${errorText}` }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No content generated.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
