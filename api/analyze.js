const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
  // 1. Setup Google AI
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  
  // We use the specific version "gemini-1.5-flash-001" to avoid 404 errors
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

  // 2. The Prompt
  const prompt = `
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

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonText = text.replace(/```json/g, "").replace(/```/g, "");
    const data = JSON.parse(jsonText);

    res.status(200).json(data);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: error.message });
  }
}
