import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/vision", async (req, res) => {
  try {
    const { image } = req.body;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: {
        parts: [
          {
            inlineData: {
              data: image,
              mimeType: "image/jpeg",
            },
          },
          {
            text: "Analyze this image for signs of AI generation or manipulation. Respond in JSON with fields: isScam (boolean), confidence (0–1), title, explanation.",
          },
        ],
      },
    });

    let text = response.text || "{}";

    // try parsing safely
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        isScam: false,
        confidence: 0.3,
        title: "Analysis returned text",
        explanation: text,
      };
    }

    res.json(parsed);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      isScam: false,
      confidence: 0,
      title: "Backend Error",
      explanation: "Vision analysis failed",
    });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
