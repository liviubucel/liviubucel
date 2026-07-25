interface TokenRecord {
  token: string;
  expiresAt: number;
  email: string;
}

const validTokens: Map<string, TokenRecord> = new Map();

export function registerToken(token: string, expiresAt: number, email: string): void {
  validTokens.set(token, { token, expiresAt, email });
}

export function isTokenValid(token: string): boolean {
  const record = validTokens.get(token);
  if (!record) {
    return false;
  }

  if (Date.now() > record.expiresAt) {
    validTokens.delete(token);
    return false;
  }

  return true;
}

export function consumeToken(token: string): void {
  validTokens.delete(token);
}
