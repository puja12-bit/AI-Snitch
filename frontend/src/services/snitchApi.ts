export async function analyzeFrame(image: string) {
  const res = await fetch(
    "https://ai-snitch-backend-1058711032319.us-central1.run.app/vision",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image }),
    }
  );

  return res.json();
}