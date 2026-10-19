// Makes a passphrase of random words. Pure and safe to run in the browser: the randomness comes from the device's own secure generator (crypto.getRandomValues), never Math.random,
// and a word is picked without the slight bias that "random number modulo list size" would cause.
export const TARGET_BITS = 50; // roughly what an 8-character random password has; with rate limiting this is far beyond what anyone can guess online

export const bitsPerWord = (listSize: number): number => Math.log2(listSize);
/** How many words are needed from a list of this size to reach the target strength (never fewer than 4, so it always looks and feels like a passphrase). */
export function wordsNeeded(listSize: number, target = TARGET_BITS): number {
  if (!Number.isFinite(listSize) || listSize < 2) throw new Error("The word list is too small.");
  return Math.max(4, Math.ceil(target / bitsPerWord(listSize)));
}
export const entropyBits = (listSize: number, words: number): number => words * bitsPerWord(listSize);

/** A uniformly random whole number from 0 to max-1, with no modulo bias. */
export function secureInt(max: number, fill: (a: Uint32Array) => Uint32Array = (a) => crypto.getRandomValues(a)): number {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) throw new Error("Bad range.");
  const limit = Math.floor(0x100000000 / max) * max; const buf = new Uint32Array(1);
  for (;;) { fill(buf); if (buf[0] < limit) return buf[0] % max; } // values above the limit are thrown away and drawn again
}
export function makePassphrase(list: readonly string[], pick: (max: number) => number = secureInt, words = wordsNeeded(list.length)): string {
  return Array.from({ length: words }, () => list[pick(list.length)]).join("-");
}
