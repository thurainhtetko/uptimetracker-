import { getStatusData } from '../server/status.ts'

const PRODUCTION_ORIGIN = 'https://uptimetracker.thurain.website'
const ALLOWED_ORIGINS = new Set([PRODUCTION_ORIGIN])

interface ApiRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function resolveOrigin(origin: string | undefined): string {
  if (!origin) return PRODUCTION_ORIGIN
  if (ALLOWED_ORIGINS.has(origin)) return origin
  if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return origin
  return PRODUCTION_ORIGIN
}

function sendJson(
  res: ApiResponse,
  statusCode: number,
  body: unknown,
  cacheControl: string,
  headOnly = false,
): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', cacheControl)
  res.end(headOnly ? undefined : JSON.stringify(body))
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const origin = firstHeader(req.headers.origin)
  res.setHeader('Access-Control-Allow-Origin', resolveOrigin(origin))
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    sendJson(res, 405, { error: { message: 'Method not allowed.' } }, 'no-store')
    return
  }

  const headOnly = req.method === 'HEAD'

  try {
    const data = await getStatusData()
    sendJson(res, 200, data, 'public, s-maxage=45, stale-while-revalidate=30', headOnly)
  } catch (error) {
    const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 502
    const message = error instanceof Error ? error.message : 'Failed to load status.'
    sendJson(res, statusCode, { error: { message } }, 'no-store', headOnly)
  }
}
