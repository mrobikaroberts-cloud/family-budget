# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin /opt/homebrew/bin/npm install` — install dependencies (node must be in PATH for child scripts)
- `npm run dev` — Vite dev server at `http://localhost:5173`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build at `http://localhost:4173`

No test suite or linter is configured.

## Architecture

Single-page React + Vite app deployed on Netlify. All UI and logic lives in **`src/App.jsx`** — no routing library. Tab navigation is driven by a single `tab` useState variable (`"dashboard"` | `"transactions"` | `"debts"` | `"weekly"` | `"insights"` | `"upload"` | `"advisor"`).

### API proxy

All Claude API calls use `fetch("/.netlify/functions/claude", ...)` — never the Anthropic API URL directly. `netlify/functions/claude.js` is a thin Node.js HTTPS proxy that injects `ANTHROPIC_API_KEY` from the environment. In local dev without `netlify dev`, AI features will return 404; set `ANTHROPIC_API_KEY` and use `netlify dev` to test them end-to-end.

### State management

All state is local React `useState` in `App` — no Redux, Zustand, or Context. Key state:

- `income`, `expenses`, `debts`, `goals` — current month's live data
- `monthlySnapshots` — `Record<"YYYY-MM", { income, expenses, notes }>` for the 12-month history view
- `advisorHistory` — turn-by-turn chat array for the AI Advisor tab

A `useEffect` keeps `monthlySnapshots[todayKey]` in sync with live `income`/`expenses`.

### Key utilities

- `monthKey(year, month0)` / `parseKey(key)` — convert between `Date` and `"YYYY-MM"` string keys
- `fmt(n)` — USD currency formatter (`Intl.NumberFormat`)
- `pct(val, total)` — percentage clamped to 100, used by all `ProgressBar` components

### Claude API usage

All features call `claude-sonnet-4-20250514`. `max_tokens` varies: 500 (monthly insights), 1000 (NL parser, goal setter, advisor), 1500 (document upload). The `SmartAddModal` handles both natural-language entry parsing and vision-based document extraction (image/PDF) in one flow.
