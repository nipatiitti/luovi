import light from './reference-seas/light.json' with { type: 'json' }
import moderate from './reference-seas/moderate.json' with { type: 'json' }
import storm from './reference-seas/storm.json' with { type: 'json' }

/** One entry of the bundled list; the document is loaded as any imported file is, through the Worker's validation. */
export interface Showcase {
  readonly name: string
  readonly document: unknown
}

// The reference seas are copies of tool-validate's (src/benchmarks/reference-seas), which are the ones the band and
// tail benchmarks gate. A tool may not import another tool, so the showcase keeps its own; a change to a reference sea
// is made in both directories.
export const SHOWCASE: readonly Showcase[] = [
  { name: 'Light reference sea', document: light },
  { name: 'Moderate reference sea', document: moderate },
  { name: 'Storm reference sea', document: storm },
]
