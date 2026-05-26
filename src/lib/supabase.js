import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env')
}

// ─────────────────────────────────────────────────────────────────────────
// Fetch resilient (anti-hang)
// ─────────────────────────────────────────────────────────────────────────
// Probleme : quand l'app passe en arriere-plan (autre app, autre onglet),
// le navigateur peut "tuer" silencieusement les connexions HTTP/2 ou les
// suspendre. Au retour, les fetch() suivants peuvent rester suspendus sans
// jamais resoudre → spinner infini sur les pages qui en dependent.
//
// Notre wrapper :
// 1. Met un timeout par requete (4s par defaut, configurable)
// 2. Si timeout → AbortController abort proprement (libere la connexion morte)
// 3. Retry une fois automatiquement avec une connexion fraiche
// 4. Si 2e timeout → throw, l'UI peut gerer l'erreur normalement
//
// Effet : transparent pour le code metier (toutes les queries supabase en
// beneficient), pas de spinner infini, et 99% des cas resolus en <50ms.
const FETCH_TIMEOUT_MS = 4000

async function resilientFetch(input, init = {}) {
  const attemptFetch = (attempt = 1) => {
    const controller = new AbortController()
    // Si l'appelant fournit son propre signal, on respecte la composition
    if (init.signal) {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
    const timeoutId = setTimeout(() => controller.abort('timeout'), FETCH_TIMEOUT_MS)

    return fetch(input, { ...init, signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId)
        return res
      })
      .catch(async (err) => {
        clearTimeout(timeoutId)
        const isTimeout = err?.name === 'AbortError' || err?.message === 'timeout'
        // Retry une seule fois sur timeout (avec nouvelle connexion fraiche)
        if (isTimeout && attempt === 1) {
          console.warn(`[supabase] fetch timeout, retry #${attempt + 1}…`, input)
          return attemptFetch(attempt + 1)
        }
        throw err
      })
  }
  return attemptFetch()
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Bypass le Web Locks API de Supabase qui peut hang sur refresh (F5)
    // et laisser getSession()/refreshSession() bloqués indéfiniment.
    // Sans cette option, les pages restent vides après F5.
    // Ref: https://github.com/supabase/auth-js/issues/768
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
  global: {
    fetch: resilientFetch,
  },
})
