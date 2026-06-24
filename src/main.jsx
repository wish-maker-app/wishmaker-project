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
import toast, { Toaster } from 'react-hot-toast'
import router from './router'
import './lib/i18n'
import './index.css'
// Note : 'leaflet/dist/leaflet.css' n'est PAS importé ici (chemin critique) —
// chaque page carte (lazy) l'importe déjà localement, donc le style n'arrive
// que quand une carte est réellement affichée.
import { registerServiceWorker } from './lib/pushNotifications'
import useConfigStore from './store/configStore'

// Enregistrer le Service Worker au démarrage
registerServiceWorker()

// Confirmation de désabonnement email : l'Edge Function email-unsubscribe a fait
// le désabonnement puis redirigé vers l'app avec ?unsub=ok|err → on affiche un
// toast et on nettoie l'URL. (toast est mis en file et s'affichera dès que le
// Toaster est monté.)
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search)
  const unsub = params.get('unsub')
  if (unsub) {
    setTimeout(() => {
      if (unsub === 'ok') toast.success('Tu es désabonné·e des emails Wish Maker.')
      else toast.error('Lien de désabonnement invalide.')
    }, 900)
    params.delete('unsub')
    const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash
    window.history.replaceState(null, '', clean)
  }
}

// ────────────────────────────────────────────────────────────────────────
// Auto-reload après un deploy Vercel — évite l'infinite spinner
// ────────────────────────────────────────────────────────────────────────
// 1. Vite émet 'vite:preloadError' quand un chunk hashé n'existe plus
//    (typique après un deploy où les assets ont changé de hash).
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault() // empêche l'erreur de remonter en plus du reload
    // Garde anti-boucle partagée avec l'errorElement du routeur : si on a déjà
    // rechargé il y a moins de 12s, on ne reboucle pas (erreur peut-être permanente).
    const KEY = '__chunk_reload_ts'
    const last = Number(sessionStorage.getItem(KEY) || 0)
    if (Date.now() - last > 12000) {
      console.warn('[preloadError] chunk obsolète, reload…', event.payload)
      sessionStorage.setItem(KEY, String(Date.now()))
      window.location.reload()
    }
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

// Charger la config (durées vœux/urgent, rétention) depuis Supabase.
// Différé après le 1er rendu : cette config ne sert qu'à l'intérieur de l'app
// (durées de vœux…), pas à la landing. La sortir du chemin critique évite une
// requête Supabase concurrente pendant le premier chargement.
{
  const _loadConfig = () => useConfigStore.getState().loadConfig()
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(_loadConfig, { timeout: 3000 })
  } else {
    setTimeout(_loadConfig, 1)
  }
}


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
