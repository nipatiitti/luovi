import archipelago from './reference-seas/archipelago.json' with { type: 'json' }
import gulf from './reference-seas/gulf.json' with { type: 'json' }
import sailingDay from './reference-seas/sailing-day.json' with { type: 'json' }
import storm from './reference-seas/storm.json' with { type: 'json' }

/** One entry of the bundled list; the document is loaded as any imported file is, through the Worker's validation. */
export interface Showcase {
  readonly name: string
  readonly document: unknown
}

// The reference seas are copies of tool-validate's (src/benchmarks/reference-seas), which are the ones the band and
// tail benchmarks gate. A tool may not import another tool, so the showcase keeps its own; a change to a reference sea
// is made in both directories.
const SAILING_DAY: Showcase = { name: 'Sailing day', document: sailingDay }

export const SHOWCASE: readonly Showcase[] = [
  { name: 'Archipelago', document: archipelago },
  SAILING_DAY,
  { name: 'Gulf', document: gulf },
  { name: 'Storm', document: storm },
]

/** The scenario the tool opens on: an ordinary summer day on open water, the sea a Baltic sailor meets most. */
export const OPENING_SHOWCASE = SAILING_DAY
