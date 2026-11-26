interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues: (array: Uint8Array) => Uint8Array;
}

function getCrypto(): CryptoLike | null {
  const scope = globalThis as unknown as { crypto?: CryptoLike };
  return scope.crypto ?? null;
}

export function newId(): string {
  const c = getCrypto();
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c) c.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function nowMs(): number {
  return Date.now();
}
