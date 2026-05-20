# 🎯 IELTS Prep Tracker

A personal dashboard to track your IELTS preparation — log practice sessions, monitor scores across all 6 modules, and spot weak areas before exam day.

![Dashboard preview](https://img.shields.io/badge/React-18-blue?logo=react) ![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite) ![No backend](https://img.shields.io/badge/Backend-None-green)

## Features

- **6 module tracking** — Listening, Reading, Writing, Speaking, Vocabulary, Grammar
- **Score trend chart** — SVG chart showing progress over time (no chart library needed)
- **Focus areas** — auto-highlights modules below your target band
- **Session history** — filterable log with delete support
- **Insights tab** — averages, best session, study time, daily tip based on days left
- **Export / Import** — backup your data as JSON and restore anytime
- **Fully offline** — all data stored in `localStorage`, no account or backend needed
- **Zero dependencies** beyond React + Vite

## Getting started

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/ielts-tracker.git
cd ielts-tracker

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Deploy to GitHub Pages

```bash
# 1. Build
npm run build

# 2. Install gh-pages helper
npm install -D gh-pages

# 3. Add to package.json scripts:
#    "deploy": "gh-pages -d dist"

# 4. Deploy
npm run deploy
```

Or use **Vercel / Netlify** — just connect the repo and set build command to `npm run build` and output dir to `dist`.

## Customising targets

Edit the `MODULES` array in `src/App.jsx`:

```js
const MODULES = [
  { id: 'listening', name: 'Listening', icon: '🎧', color: '#60a5fa', target: 7 },
  // change `target` to your desired band score
]
```

## Data format

Data is stored in `localStorage` under `ielts_tracker_data` as JSON:

```json
{
  "listening": [
    { "date": "2026-05-20", "score": 6.5, "qty": 40, "time": 45, "notes": "..." }
  ],
  ...
}
```

Use the **Export** button to download a `.json` backup, and **Import** to restore it on any device.

## Tech stack

| Tool | Why |
|------|-----|
| React 18 | UI components & state |
| Vite 5 | Fast dev server & build |
| SVG (hand-rolled) | Trend chart — no chart library needed |
| localStorage | Data persistence — no backend |

---

Built for personal IELTS prep. Good luck on your exam! 🎓
