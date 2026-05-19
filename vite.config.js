import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Cible moderne : -15% taille bundle (vs es2015) + meilleurs perfs JS
    target: 'es2020',
    // Découpe le bundle en chunks pour que les grosses libs (Leaflet, Stripe...)
    // ne bloquent pas le 1er chargement et soient cachées séparément par le navigateur.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router-dom') || id.match(/node_modules\/(react|react-dom|scheduler)\//)) {
            return 'react-vendor'
          }
          if (id.includes('framer-motion')) return 'framer'
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps'
          if (id.includes('@stripe')) return 'stripe'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('leo-profanity') || id.includes('french-badwords-list')) return 'moderation-text'
          if (id.includes('@tensorflow') || id.includes('nsfwjs')) return 'moderation-image'
        },
      },
    },
    // Avertit si un chunk dépasse 600 KB (par défaut 500)
    chunkSizeWarningLimit: 600,
  },
})
