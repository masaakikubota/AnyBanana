# NanoBanana API Proxy

Developer API (AI Studio) proxy for:
- POST /prompt  -> Gemini 2.5 Pro (JSON only)
- POST /generate -> Gemini 2.5 Flash Image (Nano Banana)

## Setup
1. Provide API key via env or file:
   - `export GEMINI_API_KEY=...` **or**
   - Create `./secret/GeminiAPI.txt` with the key (do **not** commit this file).

2. Install & run
```bash
cd api-proxy
npm i
npm start
```

## Deploy
- Cloud Run / Functions / any Node host with HTTPS.
- Set CORS per your Pages domain if you lock it down.

## Notes
- Safety default is **None** (BLOCK_NONE for harm categories). Google baseline policies still apply.
- Upper bound: 50 images per request loop.
