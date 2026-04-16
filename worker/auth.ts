// Firebase ID token verification via Google's JWK public keys

export interface VerifiedUser {
  uid: string
  email: string
}

interface JWK {
  kid: string
  n: string
  e: string
  alg: string
  use: string
}

interface JWKS {
  keys: JWK[]
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<VerifiedUser | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, sigB64] = parts

    // Decode header to get kid
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')))
    const kid: string = header.kid
    if (!kid) return null

    // Fetch Google JWK public keys (JWK format — directly importable by Web Crypto)
    const keysRes = await fetch(
      'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
      { cf: { cacheEverything: true, cacheTtl: 3600 } } as RequestInit,
    )
    if (!keysRes.ok) return null
    const jwks = await keysRes.json() as JWKS
    const jwk = jwks.keys.find(k => k.kid === kid)
    if (!jwk) return null

    // Import JWK directly — no PEM/DER parsing needed
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Verify signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const sig = base64UrlToBuffer(sigB64)
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data)
    if (!valid) return null

    // Decode and validate payload claims
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    if (payload.aud !== projectId) return null
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null

    return { uid: payload.sub, email: payload.email ?? '' }
  } catch {
    return null
  }
}

function base64UrlToBuffer(str: string): ArrayBuffer {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
