import type { IncomingMessage, ServerResponse } from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import { getStatusData } from './api/status.ts'

function statusApiPlugin(apiKey: string | undefined, monitorIds: number[]): Plugin {
  const handle = async (_req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      const data = await getStatusData({ apiKey, monitorIds })
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(data))
    } catch (error) {
      const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 502
      const message = error instanceof Error ? error.message : 'Failed to load status.'
      res.statusCode = statusCode
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify({ error: { message } }))
    }
  }

  return {
    name: 'status-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/status', handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/status', handle)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const monitorIds = (env.UPTIMEROBOT_MONITOR_IDS ?? '')
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((id) => Number.isFinite(id))

  return {
    plugins: [react(), statusApiPlugin(env.UPTIMEROBOT_API_KEY, monitorIds)],
  }
})
