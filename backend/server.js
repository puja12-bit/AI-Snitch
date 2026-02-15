import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.post("/vision", (req, res) => {
  console.log("Frame received");

  res.json({
    isScam: false,
    confidence: 0.25,
    title: "Test Result",
    explanation: "Backend communication working"
  });
});

app.listen(8000, () => {
  console.log("Backend running on http://localhost:8000");
});
