// api/gemini.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    
    // THE SAFETY NET: If Google sends an error (like a 429), tell the frontend it failed!
    if (!response.ok || data.error) {
      return res.status(response.status || 500).json({ error: data.error });
    }
    
    // Otherwise, send the successful data
    res.status(200).json(data);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}