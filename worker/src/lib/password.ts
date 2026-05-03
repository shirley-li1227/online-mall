function u8ToB64(u8: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < u8.byteLength; i++) binary += String.fromCharCode(u8[i]!)
  return btoa(binary)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder().encode(password)
  const key = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  )
  const hashBytes = new Uint8Array(bits)
  return `${u8ToB64(salt)}.${u8ToB64(hashBytes)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split('.')
  if (!saltB64 || !hashB64) return false
  const salt = fromB64(saltB64)
  const expected = fromB64(hashB64)
  const enc = new TextEncoder().encode(password)
  const key = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256
  )
  const out = new Uint8Array(bits)
  if (out.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < out.length; i++) diff |= out[i]! ^ expected[i]!
  return diff === 0
}
