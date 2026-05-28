// api/gemini.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Grab the truly hidden API key from Vercel's secure vault
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    // Forward the frontend's request securely to Google
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    
    // Send Google's response back to your React app
    res.status(200).json(data);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: 'Failed to fetch from Gemini' });
  }
}