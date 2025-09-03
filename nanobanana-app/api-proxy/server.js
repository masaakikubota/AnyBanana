// server.js  (Node 18+ / Express)
// env: GEMINI_API_KEY  or file: ./secret/GeminiAPI.txt
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "30mb" }));

const KEY_FILE_PATH = process.env.GEMINI_KEY_FILE || "./secret/GeminiAPI.txt";
let GEMINI_KEY = process.env.GEMINI_API_KEY || "";
if (!GEMINI_KEY && fs.existsSync(KEY_FILE_PATH)) {
  GEMINI_KEY = fs.readFileSync(KEY_FILE_PATH, "utf8").trim();
}
if (!GEMINI_KEY) {
  console.error("Gemini API key not set. Set GEMINI_API_KEY or provide secret/GeminiAPI.txt");
}

const BASE = "https://generativelanguage.googleapis.com/v1beta";

// ---- health check ----
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'nanobanana-api-proxy' });
});

// ---- /prompt (Phase2: 質問→最終プロンプト; JSON限定) ----
app.post("/prompt", async (req, res) => {
  const { systemPrompt, metaPrompt, input, answers } = req.body;
  const userBlock =
    `INPUT:\n${JSON.stringify(input)}\n\n` +
    (answers ? `ANSWERS:\n${JSON.stringify(answers)}` : "");

  const r = await fetch(`${BASE}/models/gemini-2.5-pro:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents: [{ role: "user", parts: [{ text: `${metaPrompt}\n\n${userBlock}` }] }],
      generationConfig: { response_mime_type: "application/json" }
    })
  });
  const json = await r.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try {
    res.json(JSON.parse(text));
  } catch {
    res.json({ phase: "final", final_prompt: "Fallback: could not parse model JSON.", notes: "Please retry." });
  }
});

// ---- /generate (Nano Banana: 画像生成) ----
app.post("/generate", async (req, res) => {
  let { prompt, images = [], n = 1, aspect_ratio, system_prompt, safety = "none", output_mime_type } = req.body;
  n = Math.min(Math.max(1, Number(n) || 1), 50); // 上限50

  const harmCats = [
    "HARM_CATEGORY_HATE_SPEECH",
    "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    "HARM_CATEGORY_DANGEROUS_CONTENT",
    "HARM_CATEGORY_HARASSMENT",
    "HARM_CATEGORY_CIVIC_INTEGRITY",
  ];
  const safetySettings = safety === "none"
    ? harmCats.map(c => ({ category: c, threshold: "BLOCK_NONE" }))
    : undefined; // Default = API baseline

  const toParts = () => {
    const parts = [{ text: prompt }];
    for (const im of images) {
      const b64 = (im.dataUrl || "").split(",")[1] || "";
      parts.push({ inline_data: { mime_type: im.mimeType || "image/png", data: b64 } });
    }
    return parts;
  };

  const bodyBase = {
    contents: [{ parts: toParts() }],
    ...(system_prompt ? { system_instruction: { parts: [{ text: system_prompt }] } } : {}),
    ...(safetySettings ? { safetySettings } : {}),
    ...(output_mime_type ? { generationConfig: { response_mime_type: output_mime_type } } : {})
  };

  const outImages = [];
  for (let i = 0; i < n; i++) {
    const r = await fetch(
      `${BASE}/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_KEY}`,
      { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(bodyBase) }
    );
    const json = await r.json();
    const parts = json?.candidates?.[0]?.content?.parts || [];
    const img = parts.find(p => p.inline_data?.data);
    if (img) outImages.push(img.inline_data.data); // base64 PNG
  }
  res.json({ images: outImages });
});

app.listen(process.env.PORT || 8080, () => console.log("proxy up"));
