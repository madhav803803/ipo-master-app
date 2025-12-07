export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing." });
  }

  // The Prompt
  const promptText = `
    You are a Stock Market Expert. 
    Generate a JSON list of the top 3 current or upcoming Mainboard IPOs in India.
    For each IPO, estimate the current GMP (Grey Market Premium) based on general market knowledge (or simulate realistic data if live access is restricted).
    
    Provide the output STRICTLY in this JSON format, no other text:
    {
      "ipos": [
        {
          "name": "IPO Name Ltd",
          "dates": "Start - End Date",
          "gmp": "50 (approx)",
          "anil_singhvi": "Apply for Listing Gain (Simulated View)",
          "risk": "High/Medium/Low - Reason",
          "verdict": "MUST APPLY", 
          "verdict_color": "apply" 
        }
      ]
    }
    (Note: verdict_color must be 'apply', 'avoid', or 'wait').
  `;

  // WE USE THE MODEL FOUND IN YOUR LIST: gemini-2.0-flash
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Extract text
    const text = result.candidates[0].content.parts[0].text;
    
    // Clean JSON (Remove markdown formatting if AI adds it)
    const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonText);

    return res.status(200).json(data);

  } catch (error) {
    console.error("AI Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
