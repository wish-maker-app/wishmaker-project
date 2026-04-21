import React from 'react'
import ReactDOM from 'react-dom/client'

// Fix iOS PWA : empêche la navigation de sortir du mode standalone
if ('standalone' in navigator && navigator.standalone) {
  document.addEventListener('click', (e) => {
    let node = e.target
    while (node) {
      if (node.nodeName === 'A' && node.href) {
        const url = new URL(node.href)
        if (url.origin === window.location.origin) {
          e.preventDefault()
          history.pushState(null, '', url.pathname + url.search + url.hash)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }
        break
      }
      node = node.parentNode
    }
  }, false)
}
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import router from './router'
import './lib/i18n'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { registerServiceWorker } from './lib/pushNotifications'
import useConfigStore from './store/configStore'

// Enregistrer le Service Worker au démarrage
registerServiceWorker()

// ────────────────────────────────────────────────────────────────────────
// Auto-reload après un deploy Vercel — évite l'infinite spinner
// ────────────────────────────────────────────────────────────────────────
// 1. Vite émet 'vite:preloadError' quand un chunk hashé n'existe plus
//    (typique après un deploy où les assets ont changé de hash).
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[preloadError] chunk obsolete, reload…', event.payload)
    window.location.reload()
  })
}

// 2. Si un nouveau Service Worker prend le contrôle (après deploy),
//    on recharge pour être sûr d'avoir le dernier HTML + derniers chunks.
//    On évite la boucle avec un flag sessionStorage.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (sessionStorage.getItem('__sw_reloaded')) return
    sessionStorage.setItem('__sw_reloaded', '1')
    window.location.reload()
  })
}

// Charger la config (durées vœux/urgent, rétention) depuis Supabase
useConfigStore.getState().loadConfig()


class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null } }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(error, info) { console.error('App crash:', error, info) }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', padding:'20px', fontFamily:'sans-serif' }}>
          <h2 style={{ color:'#5B6BF5' }}>Oops, something went wrong</h2>
          <p style={{ color:'#666', marginTop:'8px' }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop:'16px', padding:'10px 20px', background:'#5B6BF5', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1A1A2E',
          color: '#fff',
          borderRadius: '14px',
          fontSize: '14px',
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        },
        success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
      }}
    />
  </React.StrictMode>
)
