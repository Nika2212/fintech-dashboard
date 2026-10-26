/** Used instead of 0, which would lock xorshift into producing zeros forever. */
export const FALLBACK_SEED: u32 = 0x9e3779b9;

let state: u32 = FALLBACK_SEED;

/** Restarts the sequence. The same seed always produces the same numbers. */
export function seedRandom(seed: u32): void {
  state = seed == 0 ? FALLBACK_SEED : seed;
}

/** xorshift32: returns the next pseudo-random unsigned 32-bit integer. */
export function nextU32(): u32 {
  let x: u32 = state;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state = u32(x);
  return state;
}

/** Returns a pseudo-random integer in [0, bound). `bound` must be positive. */
export function nextInt(bound: i32): i32 {
  return i32(nextU32() % u32(bound));
}

/** Returns true or false with equal probability. */
export function nextBool(): bool {
  return (nextU32() & 1) == 1;
}
