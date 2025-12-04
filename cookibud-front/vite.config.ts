import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA, type VitePWAOptions } from "vite-plugin-pwa";
import tailwindcss from '@tailwindcss/vite'

const manifestForPlugIn: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', "/img/sav.png", 'robots.txt'],
  manifest: {
    name: "Cookibud",
    short_name: "Cookibud",
    description: "Tool to help you manage recipes and schedule meals.",
    icons: [{
      src: '/android-chrome-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'favicon'
    },
    {
      src: '/android-chrome-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'favicon'
    },
    {
      src: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
      purpose: 'apple touch icon',
    },
    {
      src: '/maskable_icon.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    }
    ],
    theme_color: '#201b5b',
    background_color: '#f0e7db',
    display: "standalone",
    scope: '/',
    start_url: "/",
    orientation: 'portrait'
  },
  workbox: {
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
})