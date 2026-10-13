// Simple in-memory cookie store (per-session, não persiste entre deploys)
const store = new Map<string, string>();

export function setCookie(domain: string, cookie: string): void {
  store.set(domain, cookie);
}

export function getCookie(domain: string): string {
  return store.get(domain) ?? '';
}

export function parseCookieHeader(domain: string, setCookieHeader: string): void {
  // Store raw Set-Cookie for forwarding
  const existing = getCookie(domain);
  const merged = existing ? `${existing}; ${setCookieHeader.split(';')[0]}` : setCookieHeader.split(';')[0];
  setCookie(domain, merged);
}
