import { NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export const maxDuration = 60;

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
        "stream": true,
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

    // Next.js Node.js runtime requires wrapping the raw undici stream in a custom Web ReadableStream
    const reader = response.body?.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err) {
          console.error("Stream reading error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error("Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
