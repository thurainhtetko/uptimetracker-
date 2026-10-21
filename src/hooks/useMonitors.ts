import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchMonitors } from '../api/uptimerobot'
import { fetchMockMonitors } from '../api/mock'
import type { Monitor } from '../types'

interface State {
  monitors: Monitor[]
  loading: boolean
  error: string | null
  rateLimited: boolean
  lastUpdated: Date | null
  refreshing: boolean
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export function useMonitors() {
  const [state, setState] = useState<State>({
    monitors: [],
    loading: true,
    error: null,
    rateLimited: false,
    lastUpdated: null,
    refreshing: false,
  })
  const inFlight = useRef(false)

  const load = useCallback(async (manual: boolean) => {
    if (inFlight.current) return
    inFlight.current = true
    if (manual) setState((s) => ({ ...s, refreshing: true }))
    try {
      const monitors = USE_MOCK ? await fetchMockMonitors() : await fetchMonitors()
      setState({
        monitors,
        loading: false,
        error: null,
        rateLimited: false,
        lastUpdated: new Date(),
        refreshing: false,
      })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Unexpected error while loading monitors.'
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error: message,
        rateLimited: err instanceof ApiError && err.rateLimited,
      }))
    } finally {
      inFlight.current = false
    }
  }, [])

  const refresh = useCallback(() => load(true), [load])

  useEffect(() => {
    const timer = setTimeout(() => void load(false), 0)
    return () => clearTimeout(timer)
  }, [load])

  return { ...state, refresh, mock: USE_MOCK }
}
