// What the run bar shows and offers, kept out of the component so the component is markup and bindings.

/** Multipliers on real time the speed control offers. */
export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const

/** core's state hash as the eight hex digits of its 32 bits. */
export const formatHash = (hash: number): string => hash.toString(16).padStart(8, '0')

export const formatMsPerTick = (ms: number | undefined): string =>
  ms === undefined ? 'not measured yet' : `${ms.toFixed(3)} ms`

/** A scenario file's document, or why it is not JSON; the Worker validates the document itself. */
export const readScenarioFile = async (
  file: File,
): Promise<{ readonly document: unknown } | { readonly problem: string }> => {
  const text = await file.text()
  try {
    const document: unknown = JSON.parse(text)
    return { document }
  } catch (error) {
    return { problem: `${file.name} is not JSON: ${error instanceof Error ? error.message : String(error)}` }
  }
}
