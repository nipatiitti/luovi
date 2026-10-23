// Every committed golden vector reproduced bit for bit (ADR 0002): the deterministic math in
// @luovi/core/math against FDLIBM 5.3 built by packages/core/scripts/generate-golden-vectors.sh.

import { acos, asin, atan, atan2, cos, rem_pio2, scalbn, sin, sincos, tan } from '@luovi/core/math'
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
  /** Writes the outputs for the inputs in record[0, inputs) to out[0, outputs). */
  evaluate: (record: Float64Array, out: Float64Array) => void
}

const at = (a: Float64Array, i: number): number => a[i] ?? 0

const unary =
  (f: (x: number) => number) =>
  (record: Float64Array, out: Float64Array): void => {
    out[0] = f(at(record, 0))
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
    evaluate: (record, out) => {
      out[0] = atan2(at(record, 0), at(record, 1))
    },
  },
  {
    name: 'cos',
    url: new URL('../../../core/golden/cos.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(cos),
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
    name: 'tan',
    url: new URL('../../../core/golden/tan.f64', import.meta.url),
    inputs: 1,
    outputs: 1,
    evaluate: unary(tan),
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

const hexOf = (x: number): string => {
  scratch.setFloat64(0, x, true)
  const word = (i: number): string => scratch.getUint32(i, true).toString(16).padStart(8, '0')
  return `0x${word(4)}${word(0)}`
}

/** Mismatching records of one function, and a description of the first. */
const compare = (v: Vectors, file: DataView, records: number): { mismatches: number; first: string | null } => {
  const record = new Float64Array(v.inputs)
  const out = new Float64Array(v.outputs)
  const stride = (v.inputs + v.outputs) * 8
  let mismatches = 0
  let first: string | null = null
  for (let r = 0; r < records; r++) {
    const base = r * stride
    for (let i = 0; i < v.inputs; i++) record[i] = file.getFloat64(base + i * 8, true)
    v.evaluate(record, out)
    let ok = true
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
