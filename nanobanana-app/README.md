# NanoBanana Prompt Builder (GitHub Pages + API Proxy)

- Frontend (static, GitHub Pages): `docs/index.html`
- Backend (Node/Express): `api-proxy/`

## Quick start
1. Deploy `api-proxy` (Cloud Run/Functions, set `GEMINI_API_KEY` or mount `secret/GeminiAPI.txt`).
2. Set `API_BASE_URL` in `docs/index.html` to your backend URL.
3. Push to GitHub, enable Pages with **/docs**.

> **Security:** Do not commit secrets. The `secret/` folder is ignored by git.
