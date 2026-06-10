import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Cible moderne : -15% taille bundle (vs es2015) + meilleurs perfs JS
    target: 'es2020',
    // PAS de manualChunks ici : sous Vite 8 (bundler Rolldown), manualChunks
    // entremêlait le graphe au point de rendre le chunk nsfwjs/tensorflow
    // (~40 Mo, modèle NSFW embarqué) DÉPENDANCE STATIQUE de l'entrée →
    // modulepreload de 20 Mo+ au premier chargement de wishmaker.fr.
    // Le découpage automatique + les import() dynamiques du code isolent
    // déjà correctement les grosses libs (nsfwjs, leaflet, stripe...) en
    // chunks chargés à la demande. Ne pas réintroduire sans vérifier
    // dist/index.html (aucun modulepreload des chunks nsfwjs/leaflet).
    chunkSizeWarningLimit: 600,
  },
})
