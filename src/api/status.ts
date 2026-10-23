import type { Monitor, StatusPayload } from '../types'

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMonitor(value: unknown): value is Monitor {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.url === 'string' &&
    typeof value.status === 'string' &&
    Array.isArray(value.dailyUptimes) &&
    Array.isArray(value.incidents)
  )
}

function isPayload(value: unknown): value is StatusPayload {
  return (
    isRecord(value) &&
    typeof value.updatedAt === 'number' &&
    typeof value.timeZone === 'string' &&
    typeof value.timeZoneLabel === 'string' &&
    Array.isArray(value.monitors) &&
    value.monitors.every(isMonitor)
  )
}

function errorMessage(body: unknown): string | null {
  if (!isRecord(body) || !isRecord(body.error)) return null
  return typeof body.error.message === 'string' ? body.error.message : null
}

export async function fetchStatus(): Promise<StatusPayload> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch('/api/status', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    })

    let body: unknown = null
    try {
      body = await response.json()
    } catch {
      body = null
    }

    if (!response.ok) {
      throw new ApiError(errorMessage(body) ?? `Status request failed (HTTP ${response.status}).`, response.status)
    }

    if (!isPayload(body)) {
      throw new ApiError('The status service returned an unexpected response.', response.status)
    }

    return body
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The status request timed out.')
    }
    throw new ApiError('Could not reach the status service.')
  } finally {
    clearTimeout(timer)
  }
}
