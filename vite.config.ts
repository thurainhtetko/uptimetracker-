import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = env.UPTIMEROBOT_API_KEY ?? ''

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/uptimerobot': {
          target: 'https://api.uptimerobot.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/uptimerobot/, '/v2/getMonitors'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const url = proxyReq.path
              proxyReq.path = `${url}${url.includes('?') ? '&' : '?'}api_key=${apiKey}`
            })
          },
        },
      },
    },
  }
})
