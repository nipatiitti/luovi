// GPU timestamps around named passes. Readback is asynchronous and lags a few frames; a frame whose readback buffer
// is still mapped simply records nothing, so timing never stalls the frame loop.

export interface PassTimestamps<Name extends string = string> {
  /** The timestamp writes for the named pass. */
  writesFor(name: Name): GPURenderPassTimestampWrites
  /** Resolve this frame's queries; call once per frame after every timed pass is encoded. */
  resolve(encoder: GPUCommandEncoder): void
  /** Call after submit. Updates `latest` when the readback lands. */
  read(): void
  /** Milliseconds per pass name from the newest completed readback, or empty before the first. */
  readonly latest: ReadonlyMap<string, number>
}

/** Undefined when the device lacks `timestamp-query`: the caller shows no GPU timings rather than wrong ones. */
export const createPassTimestamps = <Name extends string>(
  device: GPUDevice,
  enabled: boolean,
  names: readonly Name[],
): PassTimestamps<Name> | undefined => {
  if (!enabled) return undefined
  const count = names.length * 2
  const querySet = device.createQuerySet({ label: 'pass timestamps', type: 'timestamp', count })
  const resolveBuffer = device.createBuffer({
    label: 'timestamp resolve',
    size: count * 8,
    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
  })
  const readBuffer = device.createBuffer({
    label: 'timestamp read',
    size: count * 8,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  })
  const latest = new Map<string, number>()
  let reading = false
  let copied = false

  const readback = async (): Promise<void> => {
    await readBuffer.mapAsync(GPUMapMode.READ)
    const ticks = new BigInt64Array(readBuffer.getMappedRange().slice(0))
    readBuffer.unmap()
    names.forEach((name, i) => {
      const begin = ticks[2 * i]
      const end = ticks[2 * i + 1]
      // Timestamps are nanoseconds; a pass the driver reordered can read end before begin, which is no measurement.
      if (begin !== undefined && end !== undefined && end >= begin) latest.set(name, Number(end - begin) / 1e6)
    })
  }

  return {
    writesFor: (name) => {
      const index = names.indexOf(name)
      return { querySet, beginningOfPassWriteIndex: 2 * index, endOfPassWriteIndex: 2 * index + 1 }
    },
    resolve: (encoder) => {
      encoder.resolveQuerySet(querySet, 0, count, resolveBuffer, 0)
      copied = !reading
      if (copied) encoder.copyBufferToBuffer(resolveBuffer, 0, readBuffer, 0, count * 8)
    },
    read: () => {
      if (!copied) return
      copied = false
      reading = true
      void (async () => {
        try {
          await readback()
        } finally {
          reading = false
        }
      })()
    },
    latest,
  }
}
