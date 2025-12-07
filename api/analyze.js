const { GoogleGenerativeAI } = require("@google/generative-ai");

export default async function handler(req, res) {
  // 1. Setup Google AI
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // 2. The Prompt (The Instructions)
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
    // 3. Ask Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 4. Clean the text to ensure it is pure JSON
    const jsonText = text.replace(/```json/g, "").replace(/```/g, "");
    const data = JSON.parse(jsonText);

    // 5. Send data to website
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
