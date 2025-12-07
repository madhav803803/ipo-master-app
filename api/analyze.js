export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing in Vercel Settings." });
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

  // List of models to try (Newest to Oldest)
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-pro",
    "gemini-1.0-pro"
  ];

  let lastError = null;

  // LOOP: Try each model one by one
  for (const modelName of modelsToTry) {
    try {
      console.log(`Attempting to use model: ${modelName}`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const result = await response.json();

      // If Google returns an error (like 404), throw it to trigger the next loop
      if (result.error) {
        throw new Error(result.error.message);
      }

      // IF WE GET HERE, IT WORKED!
      const text = result.candidates[0].content.parts[0].text;
      const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(jsonText);

      // Send success and stop the loop
      return res.status(200).json(data);

    } catch (error) {
      console.error(`Model ${modelName} failed:`, error.message);
      lastError = error.message;
      // Continue to the next model in the list...
    }
  }

  // If all models fail
  return res.status(500).json({ 
    error: `All AI models failed. Last error: ${lastError}. Check API Key.` 
  });
}
