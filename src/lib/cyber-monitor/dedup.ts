// Romania Cyber Monitor - deterministic dedup key derivation.
// Used as a fallback identity when a source doesn't provide a stable
// upstream record ID: SHA-256 over normalised, order-preserving parts.

export async function computeDedupKey(parts: Array<string | null | undefined>): Promise<string> {
  const normalised = parts.map((part) => (part ?? '').trim().toLowerCase()).join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalised);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
