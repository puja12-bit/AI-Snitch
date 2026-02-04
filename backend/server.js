import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

app.post("/analyze-frame", async (req, res) => {
  const { image } = req.body;

  const geminiRes = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { data: image, mimeType: "image/jpeg" } },
            { text: "Detect AI generated content. Return JSON." }
          ]
        }]
      })
    }
  );

  const data = await geminiRes.json();
  res.json(data);
});

app.listen(8000, () => console.log("Backend running"));
