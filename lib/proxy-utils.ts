export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function buildProxyUrl(target: string, mode: 'proxy' | 'render' = 'proxy'): string {
  const endpoint = mode === 'render' ? '/api/render' : '/api/proxy';
  return `${endpoint}?url=${encodeURIComponent(target)}`;
}
