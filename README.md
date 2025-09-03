# AnyBanana (NanoBanana Frontend)

Static frontend for NanoBanana Prompt Builder & Generator.

- Live via GitHub Pages
- No server required for mock mode
- Optional API proxy for real image generation

## Quick Start
1) Enable GitHub Pages for this repo:
   - Settings → Pages → Source: Deploy from a branch, Branch: `main`, Folder: `/ (root)`
2) Open: `https://masaakikubota.github.io/AnyBanana/`
3) By default, it runs in mock mode (no API calls).

## Connect a Backend (optional)
- Deploy the API proxy from this repo (Render Blueprint: `render.yaml`).
  - Quick deploy: https://render.com/deploy?repo=https://github.com/masaakikubota/AnyBanana
  - Service rootDir: `nanobanana-app/api-proxy`
  - Env var: `GEMINI_API_KEY`
- Then open the site with `?api=` query:
  - `https://masaakikubota.github.io/AnyBanana/?api=https://your-proxy.example.com`
- The URL is saved to `localStorage` and used on subsequent visits.

## Notes
- `index.html` is self‑contained (inline CSS/JS). It uses JSZip CDN for ZIP export.
- Add/replace your API URL at any time using `?api=...` or clear from DevTools localStorage (`NB_API_BASE_URL`).
