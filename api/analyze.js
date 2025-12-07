export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key is missing in Vercel." });
  }

  // We use the exact same URL you used in the browser
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: "Google Error", details: data.error });
    }

    // SUCCESS!
    // We map the list to show just the names
    const modelNames = data.models.map(m => m.name);

    return res.status(200).json({
      message: "SUCCESS: The Key works! Here are the models Vercel can see:",
      available_models: modelNames
    });

  } catch (error) {
    return res.status(500).json({ error: "Network Error", details: error.message });
  }
}
