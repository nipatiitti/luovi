import light from '@luovi/tool-validate/reference-seas/light.json' with { type: 'json' }
import moderate from '@luovi/tool-validate/reference-seas/moderate.json' with { type: 'json' }
import storm from '@luovi/tool-validate/reference-seas/storm.json' with { type: 'json' }

/** One entry of the bundled list; the document is loaded as any imported file is, through the Worker's validation. */
export interface Showcase {
  readonly name: string
  readonly document: unknown
}

// The reference seas are tool-validate's benchmark scenarios, bundled from there so the tool shows exactly the seas the
// band and tail benchmarks gate and no second copy has to be kept in step by hand.
export const SHOWCASE: readonly Showcase[] = [
  { name: 'Light reference sea', document: light },
  { name: 'Moderate reference sea', document: moderate },
  { name: 'Storm reference sea', document: storm },
]
