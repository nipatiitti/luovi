// Every committed golden vector reproduced bit for bit (ADR 0002): the deterministic math in
// @luovi/core/math against FDLIBM 5.3 built by packages/core/scripts/generate-golden-vectors.sh,
// and powInt twice: against exact BigInt arithmetic where no partial product rounds, and against
// the generator's C left-to-right squaring where they all do, which pins the order of squaring.

import {
  acos,
  asin,
  atan,
  atan2,
  atanh,
  cbrt,
  cos,
  cosh,
  exp,
  expm1,
  hypot,
  log,
  log10,
  log1p,
  pow,
  powInt,
  rem_pio2,
  remainder,
  scalbn,
  sin,
  sincos,
  sinh,
  tan,
  tanh,
} from '@luovi/core/math'
import type { Benchmark, Gate, Harness, Measurement } from '../harness/types.ts'

interface Vectors {
  name: string
  // One literal URL per file so a bundler sees and emits each; src/ and dist/ sit at the same
  // depth, so the relative path holds for both.
  url: URL
  inputs: number
  outputs: number
  /** Index of an output that is an integer count and compares by value, not by bits. */
  integerOutput?: number
  /**
   * Writes the outputs for the inputs in record[0, inputs) to out[0, outputs), or to out[0] for a
   * function whose file holds inputs only (outputs 0).
   */
  evaluate: (record: Float64Array, out: Float64Array) => void
  /** The expected value for a function whose file holds inputs only, computed here exactly. */
  oracle?: (record: Float64Array) => number
}

const at = (a: Float64Array, i: number): number => a[i] ?? 0

const unary =
  (f: (x: number) => number) =>
  (record: Float64Array, out: Float64Array): void => {
    out[0] = f(at(record, 0))
  }

const binary =
  (f: (a: number, b: number) => number) =>
  (record: Float64Array, out: Float64Array): void => {
    out[0] = f(at(record, 0), at(record, 1))
  }

// ---- powInt's oracle ----
//
// The committed powInt inputs are restricted (golden-vectors.c, powint_base) so that every partial
// product of left-to-right squaring is exact and normal: x = +-m 2^e with m odd and m^|n| < 2^53,
// and |x|^|n| in [2^-1022, 2^1024). The exact result x^n is then formed in BigInt and rounded once
// to the nearest double, ties to even, which is bit for bit what powInt must return: a positive
// power with no rounding at all, a negative one with the single rounding of its final division.
// The fixed edge records outside that restriction (2^1024, 0.5^1075, the unit bases with int32
// extreme exponents) are chosen so the same holds; zero, infinite and NaN bases follow C99 pow for
// integer exponents, spelled out in specialPowInt. Exact inputs cannot tell one order of squaring
// from another, so the powIntRounded file holds inputs whose partial products round and the C
// result for them.

const wordView = new DataView(new ArrayBuffer(8))

/** x = (-1)^negative * odd * 2^exponent for a finite non-zero x. */
const decompose = (x: number): { negative: boolean; odd: bigint; exponent: number } => {
  wordView.setFloat64(0, x, true)
  const hi = wordView.getUint32(4, true)
  const lo = wordView.getUint32(0, true)
  const biased = (hi >>> 20) & 0x7ff
  const fraction = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo)
  let odd = biased === 0 ? fraction : fraction | (1n << 52n)
  let exponent = biased === 0 ? -1074 : biased - 1075
  while ((odd & 1n) === 0n) {
    odd >>= 1n
    exponent += 1
  }
  return { negative: hi >>> 31 === 1, odd, exponent }
}

/** base^power for power >= 0 by repeated squaring; exact, so the order does not matter. */
const bigPow = (base: bigint, power: bigint): bigint => {
  let result = 1n
  let b = base
  for (let p = power; p > 0n; p >>= 1n) {
    if ((p & 1n) === 1n) result *= b
    b *= b
  }
  return result
}

const bitLength = (v: bigint): number => v.toString(2).length

/** The double nearest (num / den) 2^shift for positive num and den, ties to even. */
const roundRational = (num: bigint, den: bigint, shift: number): number => {
  // floor(log2(num / den)), so the value lies in [2^top, 2^(top + 1)).
  let top = bitLength(num) - bitLength(den)
  if (top >= 0 ? num < den << BigInt(top) : num << BigInt(-top) < den) top -= 1
  if (top + shift >= 1024) return Infinity
  // The weight of the last kept bit: 53 significant bits for a normal result, 2^-1074 below.
  const ulp = top + shift - 52 < -1074 ? -1074 : top + shift - 52
  const scale = shift - ulp
  const n = scale >= 0 ? num << BigInt(scale) : num
  const d = scale >= 0 ? den : den << BigInt(-scale)
  let q = n / d
  const twiceRest = (n % d) * 2n
  if (twiceRest > d || (twiceRest === d && (q & 1n) === 1n)) q += 1n
  // q <= 2^53 converts exactly, and scalbn scales an exactly representable result exactly.
  return scalbn(Number(q), ulp)
}

/** C99 pow for an integer exponent n != 0 and a zero, infinite or NaN base. */
const specialPowInt = (x: number, n: number): number => {
  if (Number.isNaN(x)) return NaN
  const negativeOdd = (n & 1) === 1 && (x < 0 || 1 / x < 0)
  const large = (x === 0) === n < 0
  if (large) return negativeOdd ? -Infinity : Infinity
  return negativeOdd ? -0 : 0
}

const exactPowInt = (record: Float64Array): number => {
  const x = at(record, 0)
  const n = at(record, 1)
  if (n === 0) return 1
  if (x === 0 || !Number.isFinite(x)) return specialPowInt(x, n)
  const { negative, odd, exponent } = decompose(x)
  const magnitude = n < 0 ? -n : n
  const power = bigPow(odd, BigInt(magnitude))
  const value = n < 0 ? roundRational(1n, power, -exponent * magnitude) : roundRational(power, 1n, exponent * magnitude)
  return negative && (n & 1) === 1 ? -value : value
}

const vectors: readonly Vectors[] = [
  {
    name: 'acos',
    url: new URL('../../../core/golden/acos.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(acos),
  },
  {
    name: 'asin',
    url: new URL('../../../core/golden/asin.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(asin),
  },
  {
    name: 'atan',
    url: new URL('../../../core/golden/atan.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(atan),
  },
  {
    name: 'atan2',
    url: new URL('../../../core/golden/atan2.f64', import.meta.url),
    inputs: 2,
    outputs: 1,
    evaluate: binary(atan2),
  },
  {
    name: 'atanh',
    url: new URL('../../../core/golden/atanh.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(atanh),
  },
  {
    name: 'cbrt',
    url: new URL('../../../core/golden/cbrt.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(cbrt),
  },
  {
    name: 'cos',
    url: new URL('../../../core/golden/cos.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(cos),
  },
  {
    name: 'cosh',
    url: new URL('../../../core/golden/cosh.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(cosh),
  },
  {
    name: 'exp',
    url: new URL('../../../core/golden/exp.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(exp),
  },
  {
    name: 'expm1',
    url: new URL('../../../core/golden/expm1.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(expm1),
  },
  {
    name: 'hypot',
    url: new URL('../../../core/golden/hypot.f64', import.meta.url),
    inputs: 2,
    outputs: 1,
    evaluate: binary(hypot),
  },
  {
    name: 'log',
    url: new URL('../../../core/golden/log.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(log),
  },
  {
    name: 'log10',
    url: new URL('../../../core/golden/log10.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(log10),
  },
  {
    name: 'log1p',
    url: new URL('../../../core/golden/log1p.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(log1p),
  },
  {
    name: 'pow',
    url: new URL('../../../core/golden/pow.f64', import.meta.url),
    inputs: 2,
    outputs: 1,
    evaluate: binary(pow),
  },
  {
    name: 'powInt',
    url: new URL('../../../core/golden/powInt.f64', import.meta.url),
    inputs: 2,
    outputs: 0,
    evaluate: binary(powInt),
    oracle: exactPowInt,
  },
  {
    name: 'powIntRounded',
    url: new URL('../../../core/golden/powIntRounded.f64', import.meta.url),
    inputs: 2,
    outputs: 1,
    evaluate: binary(powInt),
  },
  {
    name: 'rem_pio2',
    url: new URL('../../../core/golden/rem_pio2.f64', import.meta.url),
    inputs: 1,
    outputs: 3,
    integerOutput: 0,
    evaluate: (record, out) => {
      out[0] = rem_pio2(at(record, 0), out, 1)
    },
  },
  {
    name: 'remainder',
    url: new URL('../../../core/golden/remainder.f64', import.meta.url),
    inputs: 2,
    outputs: 1,
    evaluate: binary(remainder),
  },
  {
    name: 'scalbn',
    url: new URL('../../../core/golden/scalbn.f64', import.meta.url),
    inputs: 2,
    outputs: 1,
    evaluate: (record, out) => {
      out[0] = scalbn(at(record, 0), at(record, 1))
    },
  },
  {
    name: 'sin',
    url: new URL('../../../core/golden/sin.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(sin),
  },
  {
    name: 'sincos',
    url: new URL('../../../core/golden/sincos.f64', import.meta.url),
    inputs: 1,
    outputs: 2,
    evaluate: (record, out) => {
      sincos(at(record, 0), out, 0)
    },
  },
  {
    name: 'sinh',
    url: new URL('../../../core/golden/sinh.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(sinh),
  },
  {
    name: 'tan',
    url: new URL('../../../core/golden/tan.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(tan),
  },
  {
    name: 'tanh',
    url: new URL('../../../core/golden/tanh.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(tanh),
  },
]

const manifestUrl = new URL('../../../core/golden/manifest.json', import.meta.url)

interface ManifestEntry {
  name: string
  file: string
  inputs: number
  outputs: number
  records: number
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

const isManifestEntry = (v: unknown): v is ManifestEntry =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.file === 'string' &&
  typeof v.inputs === 'number' &&
  typeof v.outputs === 'number' &&
  typeof v.records === 'number'

const parseManifest = (bytes: ArrayBuffer): ManifestEntry[] => {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.functions)) {
    throw new Error('golden manifest is not version 1 with a functions array')
  }
  const functions: unknown[] = parsed.functions
  return functions.map((entry) => {
    if (!isManifestEntry(entry)) throw new Error(`malformed golden manifest entry ${JSON.stringify(entry)}`)
    return entry
  })
}

// Bit comparison through one scratch view: === would equate -0 with +0, and NaN with nothing.
const scratch = new DataView(new ArrayBuffer(8))
const sameBits = (actual: number, file: DataView, byteOffset: number): boolean => {
  scratch.setFloat64(0, actual, true)
  return (
    scratch.getUint32(0, true) === file.getUint32(byteOffset, true) &&
    scratch.getUint32(4, true) === file.getUint32(byteOffset + 4, true)
  )
}
const oracleBits = new DataView(new ArrayBuffer(8))
const sameAsOracle = (actual: number, expected: number): boolean => {
  // Any NaN matches a NaN, as for the files.
  if (Number.isNaN(expected)) return Number.isNaN(actual)
  oracleBits.setFloat64(0, expected, true)
  return sameBits(actual, oracleBits, 0)
}

const hexOf = (x: number): string => {
  scratch.setFloat64(0, x, true)
  const word = (i: number): string => scratch.getUint32(i, true).toString(16).padStart(8, '0')
  return `0x${word(4)}${word(0)}`
}

/** Mismatching records of one function, and a description of the first. */
const compare = (v: Vectors, file: DataView, records: number): { mismatches: number; first: string | null } => {
  const record = new Float64Array(v.inputs)
  const out = new Float64Array(v.outputs === 0 ? 1 : v.outputs)
  const stride = (v.inputs + v.outputs) * 8
  let mismatches = 0
  let first: string | null = null
  for (let r = 0; r < records; r++) {
    const base = r * stride
    for (let i = 0; i < v.inputs; i++) record[i] = file.getFloat64(base + i * 8, true)
    v.evaluate(record, out)
    let ok = v.oracle === undefined || sameAsOracle(at(out, 0), v.oracle(record))
    for (let o = 0; o < v.outputs; o++) {
      const offset = base + (v.inputs + o) * 8
      const expected = file.getFloat64(offset, true)
      const actual = at(out, o)
      // Hardware and typed arrays choose NaN payloads freely, so any NaN matches a NaN.
      if (Number.isNaN(expected)) ok &&= Number.isNaN(actual)
      else if (o === v.integerOutput) ok &&= actual === expected
      else ok &&= sameBits(actual, file, offset)
    }
    if (!ok) {
      mismatches++
      if (first === null) {
        const inputs = Array.from(record, hexOf).join(', ')
        const got = Array.from(out, hexOf).join(', ')
        first = `record ${String(r)}: (${inputs}) gave (${got})`
      }
    }
  }
  return { mismatches, first }
}

const measure = async (harness: Harness): Promise<Measurement> => {
  const manifest = parseManifest(await harness.readBinary(manifestUrl))
  const values: Record<string, number> = {}
  const logs: Record<string, number | string> = {}
  let unmatched = 0
  for (const entry of manifest) {
    if (!vectors.some((v) => v.name === entry.name)) {
      unmatched++
      logs[`manifest.${entry.name}`] = 'in the manifest but has no function here'
    }
  }
  for (const v of vectors) {
    const entry = manifest.find((e) => e.name === v.name)
    if (entry === undefined) {
      unmatched++
      logs[`${v.name}.problem`] = 'no manifest entry'
      continue
    }
    if (entry.file !== `${v.name}.f64` || entry.inputs !== v.inputs || entry.outputs !== v.outputs) {
      unmatched++
      logs[`${v.name}.problem`] =
        `manifest layout ${entry.file} ${String(entry.inputs)}+${String(entry.outputs)} disagrees`
      continue
    }
    const bytes = await harness.readBinary(v.url)
    if (bytes.byteLength !== entry.records * (v.inputs + v.outputs) * 8) {
      unmatched++
      logs[`${v.name}.problem`] = `${String(bytes.byteLength)} bytes for ${String(entry.records)} records`
      continue
    }
    const { mismatches, first } = compare(v, new DataView(bytes), entry.records)
    values[`${v.name}.mismatches`] = mismatches
    logs[`${v.name}.records`] = entry.records
    if (first !== null) logs[`${v.name}.firstMismatch`] = first
  }
  values['manifest.unmatched'] = unmatched
  return { values, logs }
}

const gates: readonly Gate[] = [
  ...vectors.map((v): Gate => ({ id: `${v.name}.mismatches`, unit: 'count', kind: 'exact', target: 0 })),
  { id: 'manifest.unmatched', unit: 'count', kind: 'exact', target: 0 },
]

export const benchmark: Benchmark = {
  id: 'engine.golden-vectors',
  step: 1,
  tier: 'quick',
  engines: true,
  scenario: null,
  gates,
  measure,
}
