import type { DailyUptime, Incident, Monitor, ResponsePoint } from '../types'

const DAY = 86400

let seed = 42
function random(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}

function makeDailyUptimes(now: number, createdAt: number, dips: number[]): DailyUptime[] {
  return Array.from({ length: 90 }, (_, i) => {
    const date = now - (89 - i) * DAY
    if (date <= createdAt) return { date, uptime: null }
    const dip = dips.find((d) => Math.abs(date - d) < DAY / 2)
    if (dip !== undefined) return { date, uptime: i % 3 === 0 ? 97.2 : 99.1 }
    return { date, uptime: random() > 0.97 ? 99.85 : 100 }
  })
}

function makeResponseTimes(now: number, base: number, spike: boolean): ResponsePoint[] {
  return Array.from({ length: 96 }, (_, i) => {
    const t = now - (95 - i) * 900
    const jitter = base * 0.25 * (random() - 0.5) * 2
    const isSpike = spike && i > 70 && i < 82
    return { t, ms: Math.round(Math.max(20, base + jitter + (isSpike ? base * 3 : 0))) }
  })
}

function makeIncidents(now: number): Incident[] {
  return [
    {
      startedAt: now - 3 * DAY - 7200,
      endedAt: now - 3 * DAY - 6900,
      durationSec: 300,
      reason: '502 Bad Gateway',
    },
    {
      startedAt: now - 11 * DAY - 36000,
      endedAt: now - 11 * DAY - 34200,
      durationSec: 1800,
      reason: 'Connection timed out',
    },
    {
      startedAt: now - 2 * 3600,
      endedAt: null,
      durationSec: null,
      reason: '502 Bad Gateway',
    },
  ]
}

export function fetchMockMonitors(): Promise<Monitor[]> {
  const now = Math.floor(Date.now() / 1000)
  const createdAt = now - 60 * DAY

  const monitors: Monitor[] = [
    {
      id: 1,
      name: 'API — api.example.com',
      url: 'https://api.example.com/health',
      status: 'up',
      intervalSec: 60,
      createdAt,
      uptime: { d7: 99.98, d30: 99.95, d90: 99.91 },
      dailyUptimes: makeDailyUptimes(now, createdAt, [now - 11 * DAY]),
      responseTimes: makeResponseTimes(now, 142, false),
      avgResponseMs: 142,
      incidents: makeIncidents(now).slice(0, 2),
    },
    {
      id: 2,
      name: 'Website — example.com',
      url: 'https://example.com',
      status: 'down',
      intervalSec: 60,
      createdAt,
      uptime: { d7: 99.2, d30: 99.6, d90: 99.7 },
      dailyUptimes: makeDailyUptimes(now, createdAt, [now - 3 * DAY, now - 27 * DAY]),
      responseTimes: makeResponseTimes(now, 380, true),
      avgResponseMs: 415,
      incidents: makeIncidents(now),
    },
    {
      id: 3,
      name: 'CDN — cdn.example.com',
      url: 'https://cdn.example.com/ping',
      status: 'up',
      intervalSec: 300,
      createdAt,
      uptime: { d7: 100, d30: 99.99, d90: 99.97 },
      dailyUptimes: makeDailyUptimes(now, createdAt, []),
      responseTimes: makeResponseTimes(now, 58, false),
      avgResponseMs: 58,
      incidents: [],
    },
    {
      id: 4,
      name: 'Database — db.example.com:5432',
      url: 'tcp://db.example.com:5432',
      status: 'paused',
      intervalSec: 300,
      createdAt,
      uptime: { d7: 99.5, d30: 99.8, d90: 99.4 },
      dailyUptimes: makeDailyUptimes(now, createdAt, [now - 8 * DAY, now - 41 * DAY, now - 42 * DAY]),
      responseTimes: makeResponseTimes(now, 23, false),
      avgResponseMs: 23,
      incidents: makeIncidents(now).slice(1),
    },
  ]

  return new Promise((resolve) => setTimeout(() => resolve(monitors), 400))
}
