import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";
import tailwindcss from '@tailwindcss/vite'

const manifestForPlugIn: Partial<VitePWAOptions> = {
  devOptions: {
    enabled: false // Allows PWA features in dev mode
  },
  registerType: 'autoUpdate',
  includeAssets: [
    'favicon.ico', 
    'favicon-96x96.png', 
    'favicon.svg', 
    'apple-touch-icon.png', 
    'robots.txt'
  ],
  manifest: {
    name: "Cookibud",
    short_name: "Cookibud",
    description: "Tool to help you manage recipes and schedule meals.",
    icons: [{
      src: '/assets/pal only.png',
      sizes: '1024x1024',
      type: 'image/png',
      purpose: 'any maskable'
    }, {
      src: '/assets/pal_head.png',
      sizes: '1024x1024',
      type: 'image/png',
      purpose: 'any maskable'
    }, {
      src: 'pal_head-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any'
    },
    {
      src: 'pal_head-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any'
    }
    ],
    theme_color: "#E08535",
    background_color: "#E08535",
    display: "standalone",
    scope: '/',
    start_url: "/",
    orientation: 'portrait'
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === 'document',
        handler: 'NetworkFirst',
      },
      {
        urlPattern: ({ request }) =>
          ['style', 'script', 'image'].includes(request.destination),
        handler: 'CacheFirst',
      },
      {
        urlPattern: /^https:\/\/jsonplaceholder\.typicode\.com\/posts/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24, // 1 jour
          },
        },
      },
    ],
  },
}

export default defineConfig({
  plugins: [react(), VitePWA(manifestForPlugIn), tailwindcss(),],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8003', // Backend server URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''), // Removes /api before sending to backend
      },
    },
    port: 5174,
    strictPort: true, 
    hmr: {
      port: 5174,
    },
  },
})