import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(req: Request) {
  try {
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
          const parser = new PDFParse({ data: buffer });
          const pdfData = await parser.getText();
          fileContent = pdfData.text;
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
      promptText += `\n\nCRITICAL INSTRUCTION: Base your lesson plan strictly on the following curriculum/scheme of work provided by the teacher. Do not invent unrelated topics.\n\n--- CURRICULUM TEXT ---\n${fileContent.substring(0, 15000)}\n--- END CURRICULUM ---`;
    }

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
