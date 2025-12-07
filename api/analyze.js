export default async function handler(req, res) {
  // 1. Get the Key
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing in Vercel Settings." });
  }

  // 2. The Prompt
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

  // 3. The Direct URL (Bypassing the SDK)
  // We use gemini-1.5-flash which is the standard, fast model.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    // 4. Send the Request directly
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptText }]
        }]
      })
    });

    const result = await response.json();

    // 5. Check for Google Errors
    if (result.error) {
      throw new Error(result.error.message);
    }

    // 6. Extract the text
    const text = result.candidates[0].content.parts[0].text;
    
    // 7. Clean JSON
    const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(jsonText);

    res.status(200).json(data);

  } catch (error) {
    console.error("Direct API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
