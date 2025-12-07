import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing." });
  }

  try {
    // 1. SCRAPE CHITTORGARH (Our Main Source)
    const siteUrl = 'https://www.chittorgarh.com/ipo/ipo_dashboard.asp';
    const response = await axios.get(siteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const $ = cheerio.load(response.data);
    const tableText = $('.table-responsive').first().text().substring(0, 2500);

    // 2. THE PROMPT (Updated for Multiple GMP Columns)
    const promptText = `
      I have scraped this text from Chittorgarh.com:
      """${tableText}"""

      Your Task:
      1. Identify top 3 CURRENT/UPCOMING Mainboard IPOs.
      2. For each IPO, I want you to ESTIMATE the GMP (Grey Market Premium) as it would appear on different popular websites. 
         (Since we are only scraping one site, use your knowledge of how these sites usually differ. e.g., InvestorGain is usually slightly higher).
      
      3. Calculate the AVERAGE GMP of these 4 values.

      Output STRICTLY in this JSON format:
      {
        "ipos": [
          {
            "name": "IPO Name",
            "dates": "Start - End",
            "gmp_chittorgarh": "₹50",
            "gmp_ipowatch": "₹52",
            "gmp_investorgain": "₹55",
            "gmp_ipoji": "₹48",
            "gmp_avg": "₹51.25",
            "anil_singhvi": "Apply for Listing Gain",
            "risk": "Medium - Reason",
            "verdict": "MUST APPLY", 
            "verdict_color": "apply" 
          }
        ]
      }
      (verdict_color: 'apply', 'avoid', 'wait')
    `;

    // 3. SEND TO GEMINI (Using the Smart Loop)
    const modelsToTry = ["gemini-flash-latest", "gemini-pro", "gemini-1.5-flash"];
    
    for (const modelName of modelsToTry) {
      try {
        const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const aiResponse = await fetch(aiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const result = await aiResponse.json();
        if (result.error) throw new Error(result.error.message);

        const text = result.candidates[0].content.parts[0].text;
        const jsonText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(jsonText);
        
        return res.status(200).json(data);

      } catch (e) {
        console.log(`Model ${modelName} failed, trying next...`);
      }
    }
    
    throw new Error("All AI models failed.");

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
