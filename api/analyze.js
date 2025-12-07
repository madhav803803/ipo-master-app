// We use 'require' instead of 'import' to prevent server crashes
const axios = require('axios');
const cheerio = require('cheerio');

export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing." });
  }

  let tableText = "";
  let scrapingSource = "Live Data (Chittorgarh)";

  try {
    // 1. TRY TO SCRAPE (With a 4-second timeout so it doesn't freeze)
    const siteUrl = 'https://www.chittorgarh.com/ipo/ipo_dashboard.asp';
    
    const response = await axios.get(siteUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 4000 // If it takes longer than 4 seconds, give up and use AI memory
    });

    const $ = cheerio.load(response.data);
    // Grab the text from the table
    tableText = $('.table-responsive').first().text().substring(0, 2500);

  } catch (scrapeError) {
    console.log("Scraping failed (using AI memory instead):", scrapeError.message);
    scrapingSource = "AI Simulation (Scraping Failed)";
    tableText = "Scraping failed. Please generate realistic simulated data for current active IPOs in India.";
  }

  // 2. THE PROMPT
  const promptText = `
    Context: We are tracking Indian Mainboard IPOs.
    Source Data: """${tableText}"""
    
    Task:
    1. Identify top 3 CURRENT or UPCOMING Mainboard IPOs from the source data.
    2. If the source data is empty or failed, use your own knowledge to list the most recent real IPOs you know of.
    3. ESTIMATE the GMP (Grey Market Premium) for 4 different websites (Chittorgarh, IPOWatch, InvestorGain, IPO Ji). 
       (Make them slightly different to look realistic, e.g., InvestorGain is usually 2-3% higher).
    4. Calculate the Average GMP.
    5. Act as Anil Singhvi: Give a verdict.

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

  // 3. SEND TO GEMINI (Smart Loop)
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
}
