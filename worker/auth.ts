// Firebase ID token verification via Google's public keys
// We verify the JWT signature using the JWKS from Google.

export interface VerifiedUser {
  uid: string
  email: string
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<VerifiedUser | null> {
  try {
    // Decode header to get kid
    const [headerB64] = token.split('.')
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')))
    const kid: string = header.kid

    // Fetch Google public keys
    const keysRes = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      { cf: { cacheEverything: true, cacheTtl: 3600 } } as RequestInit,
    )
    if (!keysRes.ok) return null
    const keys = await keysRes.json() as Record<string, string>
    const certPem: string | undefined = keys[kid]
    if (!certPem) return null

    // Import key
    const certDer = pemToDer(certPem)
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      certDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Verify signature
    const [, payloadB64, sigB64] = token.split('.')
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    const sig = base64UrlDecode(sigB64)
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data)
    if (!valid) return null

    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))

    // Validate claims
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    if (payload.aud !== projectId) return null
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null

    return { uid: payload.sub, email: payload.email ?? '' }
  } catch {
    return null
  }
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s/g, '')
  return base64UrlDecode(b64, false)
}

function base64UrlDecode(str: string, urlSafe = true): ArrayBuffer {
  let b64 = urlSafe ? str.replace(/-/g, '+').replace(/_/g, '/') : str
  while (b64.length % 4) b64 += '='
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
