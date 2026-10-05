import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import type { Plugin } from 'vite'

// In-memory store for deduplication & live API testing in Vite dev server
const devReceivedRecords = new Map<string, any>()

function iotIngestionPlugin(): Plugin {
  return {
    name: 'iot-ingestion-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === '/api/iot/sensor-data' || req.url.startsWith('/api/iot/sensor-data?'))) {
          // CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                status: 'online',
                service: 'MoFPI AgriTrace IoT Ingestion Gateway',
                endpoint: '/api/iot/sensor-data',
                buffered_records_count: devReceivedRecords.size,
                timestamp: new Date().toISOString(),
              })
            )
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const data = JSON.parse(body)
                const { record_id, device_id, sequence_number } = data

                if (!record_id || !device_id || sequence_number === undefined) {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 400
                  res.end(
                    JSON.stringify({
                      success: false,
                      status: 'error',
                      message: 'Validation failed: record_id, device_id, and sequence_number are required.',
                    })
                  )
                  return
                }

                const key = `${device_id}-${sequence_number}-${record_id}`
                if (devReceivedRecords.has(key)) {
                  res.setHeader('Content-Type', 'application/json')
                  res.statusCode = 200
                  res.end(
                    JSON.stringify({
                      success: true,
                      status: 'duplicate_acknowledged',
                      record_id,
                      device_id,
                      sequence_number,
                      message: 'Duplicate record acknowledged with zero side-effects (Idempotent).',
                      server_timestamp: new Date().toISOString(),
                    })
                  )
                  return
                }

                devReceivedRecords.set(key, { ...data, received_at: new Date().toISOString() })

                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(
                  JSON.stringify({
                    success: true,
                    status: 'saved',
                    record_id,
                    device_id,
                    sequence_number,
                    message: 'Sensor record ingested and verified successfully.',
                    server_timestamp: new Date().toISOString(),
                  })
                )
              } catch (err: any) {
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    success: false,
                    status: 'error',
                    message: err?.message || 'Invalid JSON format.',
                  })
                )
              }
            })
            return
          }
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === '/api/iot/sensor-data' || req.url.startsWith('/api/iot/sensor-data?'))) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method === 'GET' || req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(
              JSON.stringify({
                success: true,
                status: 'saved',
                service: 'MoFPI AgriTrace Preview Ingestion',
                server_timestamp: new Date().toISOString(),
              })
            )
            return
          }
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    iotIngestionPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'icons.svg'],
      manifest: {
        name: 'MoFPI AgriTrace - Farm-to-Fork Traceability',
        short_name: 'AgriTrace',
        description: 'Offline-First Low-Cost IoT + Blockchain Farm-to-Fork Traceability Platform for SMEs & MoFPI',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'unpkg-assets',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
})
