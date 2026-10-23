# UP Time Tracker

A dark, monitor-focused status page for `host.thurain.website`, built with React, TypeScript and Vite and deployed on Vercel. The browser only reads a normalized payload from the same-origin `/api/status` function; the UptimeRobot API key never reaches the client.

## Stack

- React 19 + TypeScript + Vite (static build)
- One self-contained Vercel serverless function (`api/status.ts`)
- UptimeRobot v2 `getMonitors` as the upstream data source

## Local development

```bash
npm install
cp .env.example .env   # then edit .env
npm run dev
```

`npm run dev` and `npm run preview` serve `/api/status` from Vite middleware using the same server module, so the app works without deploying first.

## Environment variables

All values are server-side only. **Never prefix them with `VITE_`** — Vite inlines `VITE_*` variables into the client bundle.

| Variable | Required | Description |
| --- | --- | --- |
| `UPTIMEROBOT_API_KEY` | Yes | Read-only or monitor-specific UptimeRobot key |
| `UPTIMEROBOT_MONITOR_IDS` | No | Comma-separated monitor IDs to include; empty means all monitors on the key |
| `UPTIMEROBOT_API_ENDPOINT` | No | Override the UptimeRobot endpoint (testing only) |

On Vercel, add these under **Project → Settings → Environment Variables** for Production, Preview and Development. If the key was ever committed to git, rotate it in UptimeRobot before deploying.

## Deploying to Vercel

- Build command: `npm run build`
- Output directory: `dist`
- `api/status.ts` is detected automatically as a serverless function.
- `vercel.json` pins the build/output paths and the CDN cache header for `/api/status`.

The function allows `https://uptimetracker.thurain.website` and localhost origins, and responds to `GET`, `HEAD` and `OPTIONS`.

## API contract

`GET /api/status` returns:

```json
{
  "updatedAt": 1792740654,
  "timeZone": "Asia/Yangon",
  "timeZoneLabel": "MMT",
  "monitors": [
    {
      "id": 804358825,
      "name": "host.thurain.website",
      "url": "https://host.thurain.website",
      "status": "up",
      "uptime": { "d7": 99.99, "d30": 99.95, "d90": 99.9 },
      "allTimeUptime": 99.9,
      "avgResponseMs": 881,
      "intervalSec": 300,
      "createdAt": 1792559425,
      "dailyUptimes": [{ "date": "2026-10-23", "uptime_pct": 100 }],
      "incidents": [
        {
          "id": "804358825-1792733790-resolved",
          "monitorId": 804358825,
          "monitorName": "host.thurain.website",
          "status": "resolved",
          "startedAt": 1792733790,
          "durationSec": 306,
          "reason": "Connection timeout"
        }
      ]
    }
  ]
}
```

Responses are cached for 45 seconds by the function and the CDN (`s-maxage=45, stale-while-revalidate=30`); the client refreshes every 60 seconds and when the tab becomes visible.

### Mapping notes

- UptimeRobot statuses: `0` paused, `1` not checked, `2` up, `8` seems down, `9` down.
- Log types: `1` down opens an incident, `2` up resolves it, `99` closes any open incident and records a maintenance entry.
- Reasons are normalized: `333333` → `Connection timeout`, HTTP `1xx–5xx` → e.g. `502 Bad Gateway`, anything else → `Unexpected error`.
- All timestamps are rendered in `Asia/Yangon` (`MMT`).
