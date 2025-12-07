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

  // THE STRATEGY: Try these models in order until one works.
  // We prioritize "latest" aliases as they are usually free-tier friendly.
  const modelsToTry = [
    "gemini-flash-latest",       // Best bet (Fast & Free)
    "gemini-pro-latest",         // Backup (Standard & Free)
    "gemini-2.0-flash-exp",      // Experimental (Often free when stable is paid)
    "gemini-1.5-flash",          // Standard
    "gemini-pro"                 // Old Reliable
  ];

  let lastError = null;

  // LOOP through the list
  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying model: ${modelName}...`);
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }]
        })
      });

      const result = await response.json();

      // If this model fails (Quota or 404), throw error to trigger the catch block
      if (result.error) {
        throw new Error(`${modelName} Error: ${result.error.message}`);
      }

      // IF WE ARE HERE, IT WORKED!
      const text = result.candidates[0].content.parts[0].text;
      const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(jsonText);

      // Add a small note so we know which model actually worked
      data.used_model = modelName;

      return res.status(200).json(data);

    } catch (error) {
      console.error(error.message);
      lastError = error.message;
      // The loop automatically continues to the next model...
    }
  }

  // If ALL models fail
  return res.status(500).json({ 
    error: "All AI models failed. Your Free Tier might be exhausted.", 
    details: lastError 
  });
}
