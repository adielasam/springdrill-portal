import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { targetClass, subject, topic, extra } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY is not set' }, { status: 500 });
    }

    const promptText = `Act as an expert Nigerian educator. Create a comprehensive lesson plan for ${targetClass} on the subject of ${subject}, focusing on the topic: ${topic}. ${extra || ''}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-1.5-flash",
        "messages": [
          {"role": "user", "content": promptText}
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No content generated.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
