export function safeParseBigInt(value: string): bigint {
  const normalized = value.trim();
  return BigInt(normalized);
}

function toBigInt(us: bigint | number | string): bigint {
  if (typeof us === "bigint") {
    return us;
  }
  if (typeof us === "number") {
    return BigInt(Math.trunc(us));
  }
  return safeParseBigInt(us);
}

export function toMsFromUs(us: bigint | number | string): number {
  const micros = toBigInt(us);
  const millis = micros / 1000n;
  return Number(millis);
}

export function formatMs(ms: number): string {
  return new Date(ms).toISOString();
}
