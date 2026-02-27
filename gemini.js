// api/gemini.js
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Securely pull the key from Vercel's hidden environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing on the server.' });
    }

    const promptText = req.body.prompt;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        if (!response.ok) {
            throw new Error("Failed to connect to Google AI.");
        }

        const data = await response.json();
        res.status(200).json(data);
        
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'Failed to generate content' });
    }
}