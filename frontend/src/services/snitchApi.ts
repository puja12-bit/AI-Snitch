export async function analyzeFrame(image: string) {
  const res = await fetch("http://localhost:8000/vision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image }),
  });

  return res.json();
}
