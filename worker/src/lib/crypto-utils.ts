/**
 * Compares two strings in constant time to prevent timing attacks.
 */
export function secureCompare(a: string | undefined | null, b: string | undefined | null): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  if (a.length !== b.length) {
    return false; // While this leaks length, it prevents out-of-bounds access. The token length itself is not sensitive.
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
