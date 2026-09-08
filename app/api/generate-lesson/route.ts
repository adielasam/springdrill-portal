import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { targetClass, subject, topic, extra } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set' }, { status: 500 });
    }

    const promptText = `Act as an expert Nigerian educator. Create a comprehensive lesson plan for ${targetClass} on the subject of ${subject}, focusing on the topic: ${topic}. ${extra || ''}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No content generated.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
