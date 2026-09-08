import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { subject, count } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const promptText = `Generate a JSON array of exactly ${count || 5} multiple choice questions for the Nigerian JAMB/UTME exam on the subject of ${subject}. 
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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2, // Low temperature for consistent JSON output
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
    }

    const data = await response.json();
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    
    // Clean up potential markdown formatting from Gemini
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
