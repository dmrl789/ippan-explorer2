export function isHashTimerId(value: string): boolean {
  return /^ht-[a-fA-F0-9]+$/i.test(value.trim());
}

export function isTxHash(value: string): boolean {
  const trimmed = value.trim();
  return /^(0x)?[a-fA-F0-9]{64}$/.test(trimmed) || /^0x[a-zA-Z0-9]{64}$/.test(trimmed);
}

export function isBlockHeight(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function isHandle(value: string): boolean {
  return /^@[A-Za-z0-9._-]+\.(?:ipn|ai)$/.test(value.trim());
}

export function isAddress(value: string): boolean {
  return /^0x[a-zA-Z0-9]{20,}$/.test(value.trim());
}

export function routeForQuery(query: string): string {
  const value = query.trim();
  if (!value) return "/";

  if (isHashTimerId(value)) {
    return `/hashtimers/${value}`;
  }

  if (isTxHash(value)) {
    return `/tx/${value}`;
  }

  if (isBlockHeight(value)) {
    return `/blocks/${value}`;
  }

  if (isHandle(value)) {
    return `/handles?query=${encodeURIComponent(value)}`;
  }

  if (isAddress(value)) {
    return `/accounts/${value}`;
  }

  return `/accounts/${value}`;
}
