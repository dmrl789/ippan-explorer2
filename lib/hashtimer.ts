export type HashTimerId = string;

const HASH_TIMER_REGEX = /^[0-9a-f]{64}$/;

export function isHashTimerId(value: string): value is HashTimerId {
  return HASH_TIMER_REGEX.test(value.trim());
}

export function shortHashTimer(id: string, size = 8): string {
  const trimmed = id.trim();
  if (trimmed.length <= size * 2) return trimmed;
  return `${trimmed.slice(0, size)}…${trimmed.slice(-size)}`;
}

function seedFromString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash || 0xabcdef01;
}

function nextByte(state: { value: number }): number {
  // Xorshift32
  state.value ^= state.value << 13;
  state.value ^= state.value >>> 17;
  state.value ^= state.value << 5;
  state.value >>>= 0;
  return (state.value >>> 24) & 0xff;
}

export function makeMockHashTimer(seed = "mock-hashtimer", micros?: bigint): HashTimerId {
  const microsValue = micros ?? BigInt(Date.now()) * 1000n;
  const timeHex = microsValue.toString(16).padStart(14, "0").slice(-14);
  const state = { value: seedFromString(`${seed}:${timeHex}`) };
  const bytes = Array.from({ length: 25 }, () => nextByte(state));
  const suffix = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${timeHex}${suffix}`;
}

export function assertHashTimerId(id: string): asserts id is HashTimerId {
  if (!isHashTimerId(id)) {
    throw new Error(`Invalid HashTimer id: ${id}`);
  }
}
