// 1. Use 'require' (Old School)
const axios = require('axios');
const cheerio = require('cheerio');

// 2. Use 'module.exports' instead of 'export default'
module.exports = async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing." });
  }

  let tableText = "";
  let scrapingSource = "Live Data (Chittorgarh)";

  try {
    // SCRAPE with a timeout
    const siteUrl = 'https://www.chittorgarh.com/ipo/ipo_dashboard.asp';
    
    const response = await axios.get(siteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000 // 5 seconds max
    });

    const $ = cheerio.load(response.data);
    tableText = $('.table-responsive').first().text().substring(0, 2500);

  } catch (scrapeError) {
    console.log("Scraping failed:", scrapeError.message);
    scrapingSource = "AI Simulation (Scraping Failed)";
    tableText = "Scraping failed. Please generate realistic simulated data for current active IPOs in India.";
  }

  // THE PROMPT
  const promptText = `
    Context: We are tracking Indian Mainboard IPOs.
    Source Data: """${tableText}"""
    
    Task:
    1. Identify top 3 CURRENT or UPCOMING Mainboard IPOs.
    2. ESTIMATE the GMP for 4 websites (Chittorgarh, IPOWatch, InvestorGain, IPO Ji).
    3. Calculate Average GMP.
    4. Act as Anil Singhvi: Give a verdict.

    Output STRICTLY in this JSON format:
    {
      "meta": { "source": "${scrapingSource}" },
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

  // SMART LOOP
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
      console.log(`Model ${modelName} failed...`);
    }
  }
  
  return res.status(500).json({ error: "All AI models failed." });
};
