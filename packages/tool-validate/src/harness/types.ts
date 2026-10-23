// The benchmark contract (ADR 0010, spec #26): a module per id with static gates, measured
// through the harness only. Gates are static so a reader sees every target without running.

export type Engine = 'node' | 'chromium' | 'webkit' | 'firefox'

export type Gate =
  /** Passes when |measured - target| <= tolerance * |target|. */
  | { id: string; unit: string; kind: 'relative'; target: number; tolerance: number }
  /** Passes when min <= measured <= max. */
  | { id: string; unit: string; kind: 'band'; min: number; max: number }
  /**
   * With a target, passes when measured is bit-equal to it. Without one, passes when every engine
   * that ran it measured the same bits; a single engine has nothing to compare and passes.
   */
  | { id: string; unit: string; kind: 'exact'; target?: number }

export type GateKind = Gate['kind']

export interface Measurement {
  /** One value per gate id; a missing, NaN or infinite value fails its gate. */
  values: Record<string, number>
  logs: Record<string, number | string>
  /** Per-point rows, for tables such as the polar. */
  details?: Record<string, number | string>[]
}

export interface Benchmark {
  /** Dotted id, e.g. 'ocean.band-hs'; --filter matches a prefix of it. */
  id: string
  /** The build step that introduced it. */
  step: number
  tier: 'quick' | 'full'
  /** Also runs in Chromium, WebKit and Firefox under --engines. */
  engines?: boolean
  /** The base scenario as imported JSON, loaded into the harness before measure; null for none. */
  scenario: unknown
  gates: readonly Gate[]
  measure(harness: Harness): Promise<Measurement>
}

/** What the runner supplies: the clock and file access differ between Node and a browser page. */
export interface HarnessIo {
  /** Milliseconds; injected so harness and benchmark code never read the wall clock. */
  now: () => number
  readBinary: (url: URL) => Promise<ArrayBuffer>
}

export interface Harness {
  /** Loads a scenario into a fresh world; throws ContractError on an invalid one. */
  load(scenario: unknown): void
  step(ticks: number): void
  /** hashState over the world's state buffer. */
  hash(): number
  readBinary: (url: URL) => Promise<ArrayBuffer>
}

/** One benchmark's outcome on one engine. A value is null when missing or not finite. */
export interface Run {
  engine: Engine
  values: Record<string, number | null>
  logs: Record<string, number | string>
  details?: Record<string, number | string>[]
  error?: string
}

export interface GateResult {
  engine: Engine
  measured: number | null
  pass: boolean
}
