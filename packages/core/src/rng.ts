import { fnv1a32 } from './hash.ts'
import { imul, log, sincos, sqrt, TWO_PI } from './math/index.ts'

// The seeded RNG (#7): xoshiro128** (Blackman and Vigna 2018) on four 32-bit words, seeded by splitmix32, all through
// imul and shifts so every engine produces the same stream. A stream's position is a pure function of how many calls of
// each kind were made: no spare Gaussian is cached, and forks depend on the parent's seed only, never on its draws.

export interface Rng {
  /** The u32 this stream was created from; fork mixes it, never the current state. */
  readonly seed: number
  /** xoshiro128** output, an integer in [0, 2^32). */
  nextU32(): number
  /** ((a >>> 5) * 2^26 + (b >>> 6)) / 2^53 from two outputs a then b: a double in [0, 1) with 53 random bits. */
  nextF64(): number
  /** One standard normal by Box-Muller: sqrt(-2 log(1 - u1)) cos(2 pi u2), u1 then u2 from nextF64. */
  nextGaussian(): number
  /** Two independent standard normals from the same u1, u2 pair: r cos to out[offset], r sin to out[offset + 1]. */
  gaussianPair(out: Float64Array, offset: number): void
  /** A child stream named by an ASCII name matching /^[a-z0-9._-]+$/ (throws RangeError otherwise). */
  fork(name: string): Rng
}

const GOLDEN_GAMMA = 0x9e3779b9
const TWO_POW_26 = 67108864
const TWO_POW_53 = 9007199254740992
const FORK_NAME = /^[a-z0-9._-]+$/

/** The MurmurHash3 fmix32 finaliser, the splitmix32 output function. */
const fmix32 = (word: number): number => {
  let z = word
  z ^= z >>> 16
  z = imul(z, 0x85ebca6b)
  z ^= z >>> 13
  z = imul(z, 0xc2b2ae35)
  z ^= z >>> 16
  return z >>> 0
}

/** The splitmix32 output after `steps` increments of the state, starting from `state`. */
const splitmix32 = (state: number, steps: number): number => fmix32((state + imul(steps, GOLDEN_GAMMA)) | 0)

const rotl = (word: number, bits: number): number => (word << bits) | (word >>> (32 - bits))

/** seed: an integer in [0, 2^32 - 1]; throws RangeError otherwise. */
export const createRng = (seed: number): Rng => {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError(`RNG seed must be an integer in [0, 2^32 - 1], got ${String(seed)}`)
  }
  let s0 = splitmix32(seed, 1)
  let s1 = splitmix32(seed, 2)
  let s2 = splitmix32(seed, 3)
  let s3 = splitmix32(seed, 4)
  // Allocated once per stream so a Gaussian draw allocates nothing.
  const trig = new Float64Array(2)

  const nextU32 = (): number => {
    const result = imul(rotl(imul(s1, 5), 7), 9) >>> 0
    const t = s1 << 9
    s2 ^= s0
    s3 ^= s1
    s1 ^= s2
    s0 ^= s3
    s2 ^= t
    s3 = rotl(s3, 11)
    return result
  }

  const nextF64 = (): number => {
    const a = nextU32()
    const b = nextU32()
    return ((a >>> 5) * TWO_POW_26 + (b >>> 6)) / TWO_POW_53
  }

  // 1 - u1 lies in (0, 1], so the log is finite; both normals always consume four outputs, kept or not.
  const boxMuller = (): number => {
    const u1 = nextF64()
    const u2 = nextF64()
    sincos(TWO_PI * u2, trig, 0)
    return sqrt(-2 * log(1 - u1))
  }

  return {
    seed,
    nextU32,
    nextF64,
    nextGaussian: () => {
      const radius = boxMuller()
      return radius * (trig[1] ?? 0)
    },
    gaussianPair: (out, offset) => {
      const radius = boxMuller()
      out[offset] = radius * (trig[1] ?? 0)
      out[offset + 1] = radius * (trig[0] ?? 0)
    },
    fork: (name) => {
      if (!FORK_NAME.test(name)) throw new RangeError(`RNG fork name must match ${String(FORK_NAME)}, got '${name}'`)
      return createRng(splitmix32((seed ^ fnv1a32(name)) >>> 0, 1))
    },
  }
}
