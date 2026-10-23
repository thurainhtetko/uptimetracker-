# UP Time Tracker

A dark, monitor-focused status page for `host.thurain.website`, built with React, TypeScript and Vite and deployed as a static site on Vercel.

The browser calls UptimeRobot's v2 `getMonitors` API directly and normalizes the response in `src/api/status.ts`.

> **Security:** direct browser calls require the UptimeRobot API key in the client bundle. Use a read-only or monitor-specific key, and rotate it if it has ever been committed to git. The key is visible to anyone who visits the site.

## Stack

- React 19 + TypeScript + Vite
- UptimeRobot v2 `getMonitors`
- No backend, database or serverless functions

## Local development

```bash
npm install
cp .env.example .env   # then edit .env
npm run dev
```

## Environment variables

Vite inlines `VITE_*` variables at build time.

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_UPTIMEROBOT_API_KEY` | Yes | Read-only or monitor-specific UptimeRobot key |
| `VITE_UPTIMEROBOT_MONITOR_IDS` | No | Comma-separated monitor IDs; empty means all monitors on the key |

Production values are committed in `.env.production`, so Vercel picks them up automatically during `npm run build`; no dashboard environment variables are required. The key is compiled into the public JavaScript bundle.

Local development reads `.env` (ignored by git). You can copy `.env.example` to `.env` and fill in the same values.

## Deploying to Vercel

- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` pins the build and output paths.

## Data mapping

- UptimeRobot statuses: `0` paused, `1` not checked, `2` up, `8` seems down, `9` down.
- Log types: `1` down opens an incident, `2` up resolves it, `99` closes any open incident and records a maintenance entry.
- Reasons are normalized: `333333` → `Connection timeout`, HTTP `1xx–5xx` → e.g. `502 Bad Gateway`, anything else → `Unexpected error`.
- Uptime windows come from `custom_uptime_ratios=7-30-90`; the chart uses 90 daily `custom_uptime_ranges`.
- All timestamps are rendered in `Asia/Yangon` (`MMT`).

The client refreshes every 60 seconds and when the tab becomes visible. Because each visitor calls UptimeRobot directly, heavy traffic can hit API rate limits.
