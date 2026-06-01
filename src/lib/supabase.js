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
// 1. Met un timeout par requete (4s par defaut, 60s pour les uploads)
// 2. Si timeout → AbortController abort proprement (libere la connexion morte)
// 3. Retry une fois automatiquement avec une connexion fraiche
// 4. Si 2e timeout → throw, l'UI peut gerer l'erreur normalement
//
// Effet : transparent pour le code metier (toutes les queries supabase en
// beneficient), pas de spinner infini, et 99% des cas resolus en <50ms.
const FETCH_TIMEOUT_MS = 4000
const UPLOAD_TIMEOUT_MS = 60000 // 60s pour les uploads (photos peuvent etre lourdes en 4G/3G)

// Detecte si une requete est un upload Supabase Storage. Les uploads ont :
// - URL contenant '/storage/v1/' (endpoints Supabase Storage)
// - ET un body binaire (File / Blob / FormData / ArrayBuffer)
// On leur applique un timeout beaucoup plus genereux + PAS de retry (un retry
// d'upload partiel = renvoyer toute l'image, gaspillage data mobile).
function isStorageUpload(input, init) {
  const url = typeof input === 'string' ? input : input?.url || ''
  if (!url.includes('/storage/v1/')) return false
  const body = init?.body
  if (!body) return false
  return body instanceof Blob || body instanceof FormData || body instanceof ArrayBuffer
}

async function resilientFetch(input, init = {}) {
  const isUpload = isStorageUpload(input, init)
  const timeoutMs = isUpload ? UPLOAD_TIMEOUT_MS : FETCH_TIMEOUT_MS

  const attemptFetch = (attempt = 1) => {
    const controller = new AbortController()
    // Si l'appelant fournit son propre signal, on respecte la composition
    if (init.signal) {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
    const timeoutId = setTimeout(() => controller.abort('timeout'), timeoutMs)

    return fetch(input, { ...init, signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId)
        return res
      })
      .catch(async (err) => {
        clearTimeout(timeoutId)
        const isTimeout = err?.name === 'AbortError' || err?.message === 'timeout'
        // Retry une seule fois sur timeout — sauf pour les uploads (re-envoyer
        // une image lourde sur connexion lente n'aiderait pas, le retry timeout
        // pareil et l'user gaspille sa data).
        if (isTimeout && attempt === 1 && !isUpload) {
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

// ─────────────────────────────────────────────────────────────────────────
// withTimeout : garantit qu'une requete supabase se resout/rejette TOUJOURS,
// meme si supabase-js hang AVANT le fetch (resolution interne session/lock),
// cas que resilientFetch ne couvre pas. Sans ca, au retour d'arriere-plan
// (connexion HTTP/2 morte), un chargement de liste/conversation reste en
// spinner infini ("t'as rien"). A wrapper autour de chaque query critique :
//   const { data, error } = await withTimeout(supabase.from(...).select(...))
export function withTimeout(promise, ms = 4000, label = 'QUERY_TIMEOUT') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ])
}

// ensureSession : "garantit" que la session est prête avant une query de
// lecture, MAIS sans jamais hang. Le getSession() interne de supabase-js peut
// se bloquer indéfiniment au réveil/connexion morte (lock/refresh deferred) ;
// comme on l'appelle souvent dans un try AVANT la query, un hang laissait le
// `finally` (et donc les gardes inFlight) bloqués → la page ne se rechargeait
// JAMAIS. Ici on le borne à 2,5s et on avale l'erreur : si ça timeoute, on
// lance quand même la query (le JWT est déjà attaché depuis localStorage).
export async function ensureSession() {
  try {
    await withTimeout(supabase.auth.getSession(), 2500, 'SESSION_TIMEOUT')
  } catch {
    /* best-effort : on continue, la query utilisera le JWT déjà en place */
  }
}
