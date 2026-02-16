import { cookies } from 'next/headers'

const COOKIE = 'sa_token'
const TTL_MS = 8 * 60 * 60 * 1000 // 8 horas

function secret(): string {
  return process.env.NEXTAUTH_SECRET ?? 'fallback-secret-change-me'
}

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + (4 - str.length % 4) % 4, '='
  )
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
  const out = new ArrayBuffer(bytes.length)
  new Uint8Array(out).set(bytes)
  return out
}

/** Genera un token firmado con id y expiración */
export async function createSuperadminToken(id: string): Promise<string> {
  const enc = new TextEncoder()
  const data = JSON.stringify({ id, exp: Date.now() + TTL_MS })
  const encoded = b64url(enc.encode(data))
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(encoded))
  return `${encoded}.${b64url(sig)}`
}

/** Verifica token y retorna el id del superadmin, o null si inválido */
export async function verifySuperadminToken(token: string): Promise<string | null> {
  try {
    const dotIdx = token.indexOf('.')
    if (dotIdx === -1) return null
    const encoded = token.slice(0, dotIdx)
    const sigStr = token.slice(dotIdx + 1)
    if (!encoded || !sigStr) return null

    const enc = new TextEncoder()
    const key = await getKey()
    const sig = b64urlDecode(sigStr)
    const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(encoded))
    if (!valid) return null

    const { id, exp } = JSON.parse(new TextDecoder().decode(new Uint8Array(b64urlDecode(encoded))))
    if (Date.now() > exp) return null
    return id as string
  } catch {
    return null
  }
}

/** Lee el token de la cookie y retorna el id, o null */
export async function getSuperadminId(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  return verifySuperadminToken(token)
}

export const SA_COOKIE = COOKIE
export const SA_TTL_SECONDS = TTL_MS / 1000
