import light from './reference-seas/light.json' with { type: 'json' }
import moderate from './reference-seas/moderate.json' with { type: 'json' }
import storm from './reference-seas/storm.json' with { type: 'json' }
// PROTOTYPE (band size, #43): the three Baltic seas of the band size comparison, each with its own seed.
import bothnian from './band-size/bothnian.json' with { type: 'json' }
import gulf from './band-size/gulf.json' with { type: 'json' }
import helsinki from './band-size/helsinki.json' with { type: 'json' }

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
  { name: 'Helsinki archipelago, 8 m/s over 15 km', document: helsinki },
  { name: 'Gulf of Finland, 12 m/s over 80 km', document: gulf },
  { name: 'Bothnian Sea storm, 27 m/s over 194 km', document: bothnian },
]

/** The scenario the tool opens on: the moderate sea, the middle of the three. */
export const OPENING_SHOWCASE = MODERATE
