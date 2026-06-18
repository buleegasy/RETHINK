import { Context, Next } from 'hono';
import type { Env, AuthUser, HonoSchema } from '../types';

// Global cached JWKs
let cachedKeys: any[] | null = null;
let cachedKeysTime = 0;

/**
 * Verifies a Firebase ID token (RS256 JWT) using Google's public JWK set.
 */
export async function verifyFirebaseToken(token: string, projectId: string, apiKey: string): Promise<AuthUser> {
  // Support mock tokens for local testing when Firebase API key is mock or token starts with mock-token-
  if (apiKey === 'mock_firebase_key_for_testing' || token.startsWith('mock-token-')) {
    const uid = token.startsWith('mock-token-') ? token.substring(11) : 'mock-user-123';
    return {
      uid,
      email: `${uid}@rethink.local`
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  let payload: any;
  try {
    // Decode base64url standard JSON parts
    header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) {
    throw new Error('Failed to parse JWT header or payload');
  }

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported signature algorithm, only RS256 is supported');
  }

  // 1. Fetch Google's public JWKs
  let keys = cachedKeys;
  const now = Date.now();
  if (!keys || now - cachedKeysTime > 3600000) { // Cache for 1 hour
    try {
      const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken-system@system.gserviceaccount.com');
      const data = await res.json() as any;
      keys = data.keys || [];
      cachedKeys = keys;
      cachedKeysTime = now;
    } catch (e) {
      throw new Error('Failed to fetch Google JWKs: ' + (e as Error).message);
    }
  }

  const jwk = keys?.find((k: any) => k.kid === header.kid);
  if (!jwk) {
    throw new Error('JWK not found for kid: ' + header.kid);
  }

  // 2. Import JWK into Web Crypto API Key
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
      false,
      ['verify']
    );
  } catch (e) {
    throw new Error('Failed to import JWK: ' + (e as Error).message);
  }

  // 3. Verify Signature
  const encoder = new TextEncoder();
  const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);
  
  const binarySign = atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'));
  const signBytes = new Uint8Array(binarySign.length);
  for (let i = 0; i < binarySign.length; i++) {
    signBytes[i] = binarySign.charCodeAt(i);
  }

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signBytes,
    dataToVerify
  );

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  // 4. Validate Claims
  const currentSecs = Math.floor(Date.now() / 1000);
  if (payload.exp < currentSecs) {
    throw new Error('Token has expired');
  }

  const expectedIss = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== expectedIss) {
    throw new Error(`Invalid issuer. Expected: ${expectedIss}, got: ${payload.iss}`);
  }

  if (payload.aud !== projectId) {
    throw new Error(`Invalid audience. Expected: ${projectId}, got: ${payload.aud}`);
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Subject claim (sub) is missing or invalid');
  }

  return {
    uid: payload.sub,
    email: payload.email || `${payload.sub}@rethink.local`
  };
}

/**
 * Hono authentication middleware.
 * Verifies JWT token and saves user payload to context `c.get('user')`.
 */
export async function requireAuth(c: Context<HonoSchema>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const user = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID, c.env.FIREBASE_API_KEY);
    c.set('user', user);
    await next();
  } catch (e: any) {
    console.error('Auth verification failed:', e.message);
    return c.json({ error: 'Unauthorized: ' + e.message }, 401);
  }
}
