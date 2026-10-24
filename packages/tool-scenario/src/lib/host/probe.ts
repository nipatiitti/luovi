// The probe overlay: a square grid of points at mean water level, centred on the world origin, whose surface heights
// the Worker writes into every slot from the CPU environment query. The Worker answers the heights rather than the main
// thread running a query of its own, so the Worker stays the one host of the environment query (ADR 0003) and the
// heights are by construction those of the published tick.

export interface ProbeGrid {
  /** Points along each side. */
  readonly side: number
  /** m between neighbouring points. */
  readonly spacing: number
}

/** 9 by 9 points 5 m apart: 40 m across, around the point the orbit camera looks at. */
export const DEFAULT_PROBE_GRID: ProbeGrid = { side: 9, spacing: 5 }

export const probeCount = (grid: ProbeGrid): number => grid.side * grid.side

/** World x and y of point i, row-major from the south-west corner. */
const probeXY = (grid: ProbeGrid, i: number): readonly [number, number] => {
  const half = ((grid.side - 1) * grid.spacing) / 2
  return [(i % grid.side) * grid.spacing - half, Math.floor(i / grid.side) * grid.spacing - half]
}

/** The query points, xyz triplets at z = 0 (mean level), in the order the heights are written. */
export const probePoints = (grid: ProbeGrid): Float64Array => {
  const points = new Float64Array(3 * probeCount(grid))
  for (let i = 0; i < probeCount(grid); i++) points.set(probeXY(grid, i), 3 * i)
  return points
}

/** Marker positions for the renderer: each point's x and y with the height the slot carries for it as z. */
export const probeMarkers = (grid: ProbeGrid, heights: Float64Array, out: Float32Array): void => {
  for (let i = 0; i < probeCount(grid); i++) {
    const [x, y] = probeXY(grid, i)
    out[3 * i] = x
    out[3 * i + 1] = y
    out[3 * i + 2] = heights[i] ?? 0
  }
}
