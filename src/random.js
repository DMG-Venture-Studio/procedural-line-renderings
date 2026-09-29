/* Seeded randomness. Every drawing is a pure function of its seed. */

/** Mulberry32 generator. Same seed, same sequence, same drawing. */
export function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string to a 32-bit seed. Feed it the clock for a per-visit drawing. */
export function hashSeed(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** A seed derived from the current clock and a label, so sibling elements differ. */
export function clockSeed(label) {
  return hashSeed(String(Date.now()) + (label || ''));
}

/** Pick one element of an array with the given generator. */
export function pick(r, arr) {
  return arr[Math.floor(r() * arr.length)];
}
