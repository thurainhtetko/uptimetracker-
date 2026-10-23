import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchStatus } from '../api/status'
import type { StatusPayload } from '../types'

const REFRESH_MS = 60_000

interface State {
  data: StatusPayload | null
  loading: boolean
  refreshing: boolean
  error: string | null
  lastUpdated: number | null
}

export function useStatus() {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
  })
  const inFlight = useRef(false)

  const load = useCallback(async (manual = false): Promise<void> => {
    if (inFlight.current) return
    inFlight.current = true

    if (manual) {
      setState((current) => ({ ...current, loading: current.data === null, refreshing: true, error: null }))
    }

    try {
      const data = await fetchStatus()
      setState({
        data,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: Date.now(),
      })
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unexpected error while loading status.'
      setState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error: message,
      }))
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => void load(false), REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void load(false)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [load])

  const refresh = useCallback(() => void load(true), [load])

  return { ...state, refresh }
}
