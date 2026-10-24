import light from './reference-seas/light.json' with { type: 'json' }
import moderate from './reference-seas/moderate.json' with { type: 'json' }
import storm from './reference-seas/storm.json' with { type: 'json' }
// PROTOTYPE (#41): seas either side of the coverage law's 4.23 m/s offset, and one at early whitecaps.
import wind40 from './foam-prototype/wind-4.0.json' with { type: 'json' }
import wind45 from './foam-prototype/wind-4.5.json' with { type: 'json' }
import wind60 from './foam-prototype/wind-6.0.json' with { type: 'json' }

/** One entry of the bundled list; the document is loaded as any imported file is, through the Worker's validation. */
export interface Showcase {
  readonly name: string
  readonly document: unknown
}

// The reference seas are copies of tool-validate's (src/benchmarks/reference-seas), which are the ones the band and
// tail benchmarks gate. A tool may not import another tool, so the showcase keeps its own; a change to a reference sea
// is made in both directories.
const MODERATE: Showcase = { name: 'Moderate reference sea', document: moderate }

export const SHOWCASE: readonly Showcase[] = [
  { name: 'Light reference sea', document: light },
  MODERATE,
  { name: 'Storm reference sea', document: storm },
  { name: 'Below onset, 4.0 m/s', document: wind40 },
  { name: 'Above onset, 4.5 m/s', document: wind45 },
  { name: 'Early whitecaps, 6.0 m/s', document: wind60 },
]

/** The scenario the tool opens on: the moderate sea, the middle of the three. */
export const OPENING_SHOWCASE = MODERATE
