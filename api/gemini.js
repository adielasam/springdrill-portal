// api/gemini.js
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Securely pull the key from Vercel
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key is missing in Vercel Environment Variables.' });
    }

    const promptText = req.body.prompt;

    try {
        // CHANGED MODEL TO gemini-pro TO ENSURE UNIVERSAL FREE-TIER COMPATIBILITY
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const data = await response.json();

        // If Google rejects it, tell us EXACTLY why!
        if (!response.ok) {
            console.error("Google Error:", data);
            return res.status(500).json({ 
                error: `Google API Error: ${data.error?.message || 'Check Vercel Logs'}` 
            });
        }

        // Success! Send the data back to the teacher
        res.status(200).json(data);
        
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: `Server catch error: ${error.message}` });
    }
}
