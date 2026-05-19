export function normalizeImageUrl(url?: string | null): string {
  if (!url) return '';

  if (url.startsWith('http://localhost/uploads/') || url.startsWith('https://localhost/uploads/')) {
    return url.replace(/^https?:\/\/localhost/, '');
  }

  return url;
}

export function shouldBypassImageOptimizer(url?: string | null): boolean {
  const normalized = normalizeImageUrl(url);
  return normalized.startsWith('/uploads/');
}
