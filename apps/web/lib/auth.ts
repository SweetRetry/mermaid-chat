export const AUTH_COOKIE_NAME = "site-auth"
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 天

const TOKEN_SALT = "mermaid-chat-auth-v1"

export async function generateAuthToken(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(TOKEN_SALT)
  const keyData = encoder.encode(password)

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", key, data)

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyAuthToken(token: string, password: string): Promise<boolean> {
  const expectedToken = await generateAuthToken(password)
  return token === expectedToken
}
