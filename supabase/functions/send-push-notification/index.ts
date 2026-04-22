// Supabase Edge Function — send-push-notification
// Envoie des notifications push via Web Push Protocol (RFC 8291)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base64url } from 'https://deno.land/std@0.168.0/encoding/base64url.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'contact@wishmaker.app'

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

  // Import VAPID private key
  const rawKey = base64urlToUint8Array(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    await convertRawToP8(rawKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

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

async function convertRawToP8(raw32: Uint8Array): Promise<ArrayBuffer> {
  // PKCS#8 wrapper for EC P-256 private key (32 bytes raw)
  const prefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06,
    0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01,
    0x01, 0x04, 0x20
  ])
  const result = new Uint8Array(prefix.length + raw32.length)
  result.set(prefix)
  result.set(raw32, prefix.length)
  return result.buffer
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

  // HKDF-based key derivation (RFC 8291)
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0')
  const prkKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveBits'])

  // IKM = HKDF(auth, sharedSecret, "Content-Encoding: auth\0", 32)
  const ikmInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\0'),
    ...clientPublicKey,
    ...localPublicKeyRaw,
  ])

  const authHkdfKey = await crypto.subtle.importKey('raw', clientAuth, { name: 'HKDF' }, false, ['deriveBits'])
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: sharedSecret, info: authInfo },
      authHkdfKey,
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

// ── Main handler ──

serve(async (req) => {
  try {
    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let targetUserId: string
    let title: string
    let notifBody: string
    let url: string

    // Appelé par webhook Supabase (INSERT sur messages)
    if (body.type === 'INSERT' && body.table === 'messages') {
      const message = body.record
      // Trouver la conversation pour savoir qui notifier
      const { data: conv } = await supabase
        .from('conversations')
        .select('wisher_id, maker_id')
        .eq('id', message.conversation_id)
        .single()

      if (!conv) return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404 })

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
    }

    // Récupérer les subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', targetUserId)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payload = JSON.stringify({ title, body: notifBody, url, tag: 'message' })
    let sent = 0

    for (const sub of subscriptions) {
      if (!sub.p256dh || !sub.auth) continue

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
        } else if (response.status === 410 || response.status === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error(`Push failed: ${response.status} ${await response.text()}`)
        }
      } catch (err) {
        console.error('Push send error:', err)
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
