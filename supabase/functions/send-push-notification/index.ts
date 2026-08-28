// Supabase Edge Function — send-push-notification
// Envoie des notifications push via Web Push Protocol (RFC 8291) pour le web,
// et via FCM HTTP v1 pour les apps natives (Capacitor Android/iOS).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'contact@wishmaker.app'
// Compte de service Firebase (JSON complet) — pour l'envoi des push NATIFS via
// FCM. Stocké dans les secrets Supabase (jamais dans le code / git).
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')

// CORS — indispensable pour les appels depuis le navigateur (ex. « Avertir »
// dans l'admin). Sans réponse au preflight OPTIONS, le navigateur bloque le POST.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Crypto helpers pour Web Push ──

function base64urlToUint8Array(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function createVapidJwt(endpoint: string): Promise<string> {
  const origin = new URL(endpoint).origin

  const header = { alg: 'ES256', typ: 'JWT' }
  const payload = {
    aud: origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: `mailto:${VAPID_EMAIL}`,
  }

  const headerB64 = base64url(new TextEncoder().encode(JSON.stringify(header)))
  const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  const cryptoKey = await importVapidSigningKey()

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  // Convert DER signature to raw r||s format
  const sigArray = new Uint8Array(signature)
  let rawSig: Uint8Array
  if (sigArray.length === 64) {
    rawSig = sigArray
  } else {
    // DER format
    rawSig = derToRaw(sigArray)
  }

  return `${unsignedToken}.${base64url(rawSig)}`
}

function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64)
  // Parse DER sequence
  let offset = 2 // skip 0x30, length
  if (der[1] & 0x80) offset += (der[1] & 0x7f)

  // R value
  offset++ // 0x02
  const rLen = der[offset++]
  const rStart = offset + (rLen > 32 ? rLen - 32 : 0)
  const rDest = rLen < 32 ? 32 - rLen : 0
  raw.set(der.slice(rStart, offset + rLen), rDest)
  offset += rLen

  // S value
  offset++ // 0x02
  const sLen = der[offset++]
  const sStart = offset + (sLen > 32 ? sLen - 32 : 0)
  const sDest = sLen < 32 ? 32 - sLen : 0
  raw.set(der.slice(sStart, offset + sLen), 32 + sDest)

  return raw
}

// Import de la clé privée VAPID (ES256) pour signer le JWT.
// Historique : les 32 octets bruts étaient emballés dans un PKCS#8 construit à
// la main, sans le champ publicKey [1] de l'ECPrivateKey (RFC 5915) — que
// l'implémentation ECDSA de Deno exige. importKey levait « InvalidEncoding » à
// CHAQUE appel : aucun JWT n'était signé, donc aucune push n'a jamais été
// envoyée. Le format JWK reconstruit la paire depuis les deux secrets sans DER
// manuel, et échoue explicitement si la publique ne correspond pas à la privée.
let vapidSigningKey: CryptoKey | null = null

async function importVapidSigningKey(): Promise<CryptoKey> {
  if (vapidSigningKey) return vapidSigningKey
  const pub = base64urlToUint8Array(VAPID_PUBLIC_KEY)
  const priv = base64urlToUint8Array(VAPID_PRIVATE_KEY)
  vapidSigningKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: base64url(priv),
      x: base64url(pub.slice(1, 33)), // pub = 0x04 || X(32) || Y(32)
      y: base64url(pub.slice(33, 65)),
      ext: false,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  return vapidSigningKey
}

// ── Chiffrement du payload (RFC 8291 — aes128gcm) ──

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPublicKey = base64urlToUint8Array(p256dhKey)
  const clientAuth = base64urlToUint8Array(authSecret)

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
  )

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientKey },
      localKeyPair.privateKey,
      256
    )
  )

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // HKDF-based key derivation (RFC 8291 §3.4)
  //   PRK_key = HMAC-SHA-256(auth_secret, ecdh_secret)   → HKDF-Extract(salt=auth, ikm=ecdh)
  //   key_info = "WebPush: info" || 0x00 || ua_public || as_public
  //   IKM     = HMAC-SHA-256(PRK_key, key_info || 0x01)  → HKDF-Expand(info=key_info, 32)
  // Attention : le secret ECDH est l'IKM et le auth_secret est le SALT (et non
  // l'inverse), et l'info est bien "WebPush: info\0"||ua||as — "Content-Encoding:
  // auth\0" appartient à l'ancien schéma aesgcm (draft-04), pas à aes128gcm.
  const ikmInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\0'),
    ...clientPublicKey,
    ...localPublicKeyRaw,
  ])

  const sharedSecretKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits'])
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: clientAuth, info: ikmInfo },
      sharedSecretKey,
      256
    )
  )

  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits'])

  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0')
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: cekInfo },
      ikmKey,
      128
    )
  )

  // Nonce = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0')
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
      ikmKey,
      96
    )
  )

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const paddedPayload = new Uint8Array([...new TextEncoder().encode(payload), 2]) // padding delimiter
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      paddedPayload
    )
  )

  // Build aes128gcm body: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)

  const body = new Uint8Array([
    ...salt,
    ...rs,
    localPublicKeyRaw.length,
    ...localPublicKeyRaw,
    ...ciphertext,
  ])

  return { encrypted: body, salt, localPublicKey: localPublicKeyRaw }
}

// ── FCM (push natif Android/iOS via Firebase Cloud Messaging HTTP v1) ──
// On obtient un access token OAuth2 à partir du compte de service (JWT RS256),
// mis en cache ~1h, puis on POST le message sur l'API FCM v1.

let cachedFcm: { token: string; exp: number } | null = null

function pemToDer(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
  const bin = atob(b64)
  const der = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i)
  return der
}

function b64urlJson(obj: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(obj)))
}

async function getFcmAccessToken(sa: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedFcm && cachedFcm.exp > now + 60) return cachedFcm.token

  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${b64urlJson(header)}.${b64urlJson(claims)}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  )
  const jwt = `${unsigned}.${base64url(sig)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  const json = await res.json()
  if (!json.access_token) throw new Error('FCM token error: ' + JSON.stringify(json))
  cachedFcm = { token: json.access_token, exp: now + (json.expires_in || 3600) }
  return json.access_token
}

// Envoie une notif à un token natif. Retourne le status HTTP FCM (404 = token
// mort → l'appelant nettoie l'abonnement).
async function sendFcm(
  sa: Record<string, string>,
  deviceToken: string,
  title: string,
  body: string,
  url: string,
  badge?: number,
): Promise<number> {
  const accessToken = await getFcmAccessToken(sa)
  const message = {
    message: {
      token: deviceToken,
      notification: { title, body },
      data: { url }, // lu par pushNotificationActionPerformed (nativePush.js)
      android: { priority: 'high', notification: { default_sound: true } },
      apns: { payload: { aps: { sound: 'default', ...(badge ? { badge } : {}) } } },
    },
  }
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    },
  )
  if (!(res.status >= 200 && res.status < 300)) {
    console.error(`FCM ${res.status}: ${await res.text()}`)
  }
  return res.status
}

// ── Diagnostic de la paire de clés VAPID ──
// Cause d'échec classique et invisible : VAPID_PUBLIC_KEY (serveur) ne
// correspond pas à VAPID_PRIVATE_KEY, ou pas à VITE_VAPID_PUBLIC_KEY (build
// front). Le service push renvoie alors 401/403 et rien n'est jamais délivré.
async function diagnoseVapid(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {
    publicKey: VAPID_PUBLIC_KEY,
    publicKeyLength: VAPID_PUBLIC_KEY?.length ?? null,
    privateKeyLength: VAPID_PRIVATE_KEY?.length ?? null,
    email: VAPID_EMAIL,
  }
  try {
    const pubRaw = base64urlToUint8Array(VAPID_PUBLIC_KEY)
    const privRaw = base64urlToUint8Array(VAPID_PRIVATE_KEY)
    out.publicKeyBytes = pubRaw.length
    out.privateKeyBytes = privRaw.length
    out.publicKeyFirstByte = pubRaw[0] // doit valoir 4 (point non compressé)

    // Signer avec la privée, vérifier avec la publique : si la vérification
    // échoue, les deux secrets ne forment pas une paire.
    const privKey = await importVapidSigningKey()
    const pubKey = await crypto.subtle.importKey(
      'raw', pubRaw,
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']
    )
    const msg = new TextEncoder().encode('vapid-pair-check')
    const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, msg)
    out.keyPairMatches = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pubKey, sig, msg)
  } catch (err) {
    out.keyPairError = String(err)
  }
  return out
}

// ── Autorisation ──
// verify_jwt=true : le gateway Supabase a déjà vérifié la SIGNATURE du JWT
// présent dans l'en-tête Authorization. On peut donc décoder ses claims en
// confiance pour savoir QUI appelle (rôle + user id), sans re-vérifier la sig.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function decodeJwtClaims(authHeader: string | null): { role: string; sub: string | null } {
  try {
    if (!authHeader) return { role: 'anon', sub: null }
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const part = token.split('.')[1]
    if (!part) return { role: 'anon', sub: null }
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    if (pad) b64 += '='.repeat(4 - pad)
    const claims = JSON.parse(atob(b64))
    return { role: claims.role || 'anon', sub: claims.sub || null }
  } catch {
    return { role: 'anon', sub: null }
  }
}

function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

// ── Main handler ──

serve(async (req) => {
  // Preflight CORS du navigateur
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Qui appelle ? (service_role = serveur/cron/webhook, authenticated = user connecté)
    const { role: callerRole, sub: callerId } = decodeJwtClaims(req.headers.get('Authorization'))

    // Diagnostic réservé au service_role (jamais exposé aux clients).
    if (body.diagnose === true) {
      if (callerRole !== 'service_role') return jsonResponse({ error: 'Forbidden' }, 403)
      return jsonResponse({ vapid: await diagnoseVapid() })
    }

    let targetUserId: string
    let title: string
    let notifBody: string
    let url: string

    // Appelé par webhook Supabase (INSERT sur messages)
    if (body.type === 'INSERT' && body.table === 'messages') {
      // Seul le trigger DB (clé service_role) peut déclencher cette branche —
      // sinon un utilisateur pourrait usurper une notif « nouveau message ».
      if (callerRole !== 'service_role') return jsonResponse({ error: 'Forbidden' }, 403)

      const message = body.record
      // Trouver la conversation pour savoir qui notifier
      const { data: conv } = await supabase
        .from('conversations')
        .select('wisher_id, maker_id')
        .eq('id', message.conversation_id)
        .single()

      if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404)

      // Notifier l'autre personne (pas l'expéditeur)
      targetUserId = message.sender_id === conv.wisher_id ? conv.maker_id : conv.wisher_id
      title = 'Nouveau message — Wish Maker'
      notifBody = 'Vous avez reçu un nouveau message'
      url = `/messages/${message.conversation_id}`
    } else {
      // Appel manuel
      targetUserId = body.user_id
      title = body.title || 'Wish Maker'
      notifBody = body.body || 'Nouvelle notification'
      url = body.url || '/'

      // ── Contrôle d'accès de l'appel manuel ──
      // Empêche n'importe quel utilisateur connecté d'envoyer une push
      // arbitraire à n'importe qui (spam / phishing). Sont autorisés :
      //   • service_role  → serveur / cron (ex. notify-expiring-wishes)
      //   • admin         → fonctionnalité « Avertir l'auteur » du back-office
      //   • un user lié au destinataire par une conversation (Maker → Wisher,
      //     ex. markRealizedByMaker) — il peut déjà lui parler de toute façon.
      if (callerRole !== 'service_role') {
        if (callerRole !== 'authenticated' || !callerId || !UUID_RE.test(callerId)) {
          return jsonResponse({ error: 'Forbidden' }, 403)
        }
        if (!targetUserId || !UUID_RE.test(String(targetUserId))) {
          return jsonResponse({ error: 'Invalid target' }, 400)
        }

        // Admin ?
        const { data: caller } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', callerId)
          .maybeSingle()
        let allowed = !!caller?.is_admin

        // Sinon : partage-t-il une conversation avec le destinataire ?
        if (!allowed) {
          const { data: convs } = await supabase
            .from('conversations')
            .select('maker_id, wisher_id')
            .or(`maker_id.eq.${callerId},wisher_id.eq.${callerId}`)
          allowed = (convs || []).some(
            (c) =>
              (c.maker_id === callerId && c.wisher_id === targetUserId) ||
              (c.wisher_id === callerId && c.maker_id === targetUserId)
          )
        }

        if (!allowed) return jsonResponse({ error: 'Forbidden' }, 403)
      }
    }

    // Récupérer les subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId)

    if (!subscriptions || subscriptions.length === 0) {
      return jsonResponse({ sent: 0, message: 'No subscriptions' })
    }

    // Badge : nombre de messages non lus du destinataire → pastille sur
    // l'icône de la PWA (le Service Worker appelle setAppBadge(badge) à la
    // réception). Best-effort : à défaut, pastille générique.
    let badge: number | undefined
    try {
      const { data: convIds } = await supabase
        .from('conversations')
        .select('id')
        .or(`wisher_id.eq.${targetUserId},maker_id.eq.${targetUserId}`)
      const ids = (convIds || []).map((c: { id: string }) => c.id)
      if (ids.length) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', ids)
          .neq('sender_id', targetUserId)
          .eq('is_read', false)
        if (typeof count === 'number' && count > 0) badge = count
      }
    } catch { /* pastille générique */ }

    const payload = JSON.stringify({ title, body: notifBody, url, tag: 'message', badge })
    let sent = 0
    // Un échec d'envoi était jusqu'ici invisible ({ sent: 0 } sans explication).
    // On collecte les causes pour pouvoir diagnostiquer depuis l'appelant.
    const failures: Array<Record<string, unknown>> = []

    // Compte de service Firebase (pour les tokens natifs). Parsé une seule fois.
    let fcmSa: Record<string, string> | null = null
    if (FCM_SERVICE_ACCOUNT) {
      try { fcmSa = JSON.parse(FCM_SERVICE_ACCOUNT) } catch { console.error('FCM_SERVICE_ACCOUNT: JSON invalide') }
    }

    for (const sub of subscriptions) {
      const platform = sub.platform || 'web'

      // ── Push NATIF (Android/iOS) via FCM ──
      if (platform === 'android' || platform === 'ios') {
        if (!fcmSa) { failures.push({ id: sub.id, reason: 'FCM not configured' }); continue }
        try {
          const status = await sendFcm(fcmSa, sub.endpoint, title, notifBody, url, badge)
          if (status >= 200 && status < 300) {
            sent++
          } else if (status === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id) // token mort
            failures.push({ id: sub.id, status, reason: 'fcm token dead (deleted)' })
          } else {
            failures.push({ id: sub.id, status, reason: 'fcm failed' })
          }
        } catch (err) {
          console.error('FCM send error:', err)
          failures.push({ id: sub.id, error: String(err) })
        }
        continue
      }

      // ── Web Push (VAPID) ──
      if (!sub.p256dh || !sub.auth) {
        failures.push({ id: sub.id, reason: 'missing keys' })
        continue
      }

      try {
        const jwt = await createVapidJwt(sub.endpoint)
        const { encrypted } = await encryptPayload(payload, sub.p256dh, sub.auth)

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
            'TTL': '86400',
            'Urgency': 'high',
          },
          body: encrypted,
        })

        if (response.ok || response.status === 201) {
          sent++
        } else {
          const text = await response.text()
          console.error(`Push failed: ${response.status} ${text}`)
          failures.push({
            id: sub.id,
            host: new URL(sub.endpoint).host,
            status: response.status,
            body: text.slice(0, 500),
          })
          // 404/410 : abonnement définitivement périmé côté service push.
          if (response.status === 410 || response.status === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          }
        }
      } catch (err) {
        console.error('Push send error:', err)
        failures.push({ id: sub.id, error: String(err) })
      }
    }

    // Les détails d'échec ne sont renvoyés qu'aux appelants serveur.
    return jsonResponse(
      callerRole === 'service_role' && failures.length ? { sent, failures } : { sent }
    )
  } catch (err) {
    return jsonResponse({ error: err.message }, 400)
  }
})
