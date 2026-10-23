// The one index buffer every ring draws from. A ring is a square grid of cells + 1 vertices a side whose positions the
// vertex shader computes from the vertex index, so no vertex buffer exists. The ring inside fills a hole of half the
// side that sits up to one cell off centre, since each ring snaps to its own grid; the nine hole positions and the
// holeless innermost ring are ten ranges of one buffer.

/** A range of the ring index buffer, for drawIndexed. */
export interface IndexRange {
  readonly first: number
  readonly count: number
}

export interface RingMesh {
  readonly indices: Uint32Array<ArrayBuffer>
  /** The innermost ring, no hole. */
  readonly full: IndexRange
  /** The ring with its hole offset by (dx, dy) cells, each -1, 0 or 1. */
  holed(dx: number, dy: number): IndexRange
}

/**
 * Cells are listed in square blocks rather than whole rows, so the vertices a triangle shares with its recent neighbours
 * are still in the GPU's post-transform cache and the band sum runs about once per vertex. Sixteen measured about a fifth
 * cheaper than whole rows on an M1 Pro, with eight and four no better.
 */
const block = 16

/**
 * Every cell is split along the same diagonal, from (i, j) to (i + 1, j + 1). The morph collapses each odd vertex onto
 * the even one below it, which turns every second cell of a 2 by 2 block into that block's coarse cell, split along the
 * same diagonal as the ring outside, so a fully morphed ring and the next ring draw identical triangles.
 */
const pushCell = (out: number[], side: number, i: number, j: number): void => {
  const a = j * side + i
  const b = a + 1
  const c = a + side
  const d = c + 1
  out.push(a, b, d, a, d, c)
}

export const ringMesh = (cells: number): RingMesh => {
  if (cells % 4 !== 0) throw new RangeError(`Ring cells must be a multiple of four, got ${String(cells)}`)
  const side = cells + 1
  const quarter = cells / 4
  const grid = (hole: readonly [number, number] | undefined): number[] => {
    const out: number[] = []
    for (let blockJ = 0; blockJ < cells; blockJ += block) {
      for (let blockI = 0; blockI < cells; blockI += block) {
        for (let j = blockJ; j < Math.min(cells, blockJ + block); j += 1) {
          for (let i = blockI; i < Math.min(cells, blockI + block); i += 1) {
            const inHole =
              hole !== undefined &&
              i >= quarter + hole[0] &&
              i < 3 * quarter + hole[0] &&
              j >= quarter + hole[1] &&
              j < 3 * quarter + hole[1]
            if (!inHole) pushCell(out, side, i, j)
          }
        }
      }
    }
    return out
  }
  const variants = [undefined, ...[-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as const))].map(grid)
  const indices = new Uint32Array(variants.reduce((total, variant) => total + variant.length, 0))
  const ranges: IndexRange[] = []
  let first = 0
  for (const variant of variants) {
    indices.set(variant, first)
    ranges.push({ first, count: variant.length })
    first += variant.length
  }
  const [full, ...holed] = ranges
  if (full === undefined) throw new Error('unreachable: the variant list is never empty')
  return {
    indices,
    full,
    holed: (dx, dy) => {
      const range = holed[(dy + 1) * 3 + (dx + 1)]
      if (range === undefined) throw new RangeError(`No ring hole at offset (${String(dx)}, ${String(dy)})`)
      return range
    },
  }
}
