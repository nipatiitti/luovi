import type { StateLayout } from '@luovi/core'

// The handoff of ADR 0003: one SharedArrayBuffer holding an Int32 header, then two slots. The Worker writes the slot
// that is not published and publishes it with an atomic store once its tick is complete; the renderer loads the index
// once per frame, copies that slot and reads only the copy, so a tick landing mid-frame never tears the frame.

/** Int32 words of the header. The tick is stored before the index, so a reader that sees an index sees its tick. */
const HEADER = { index: 0, tick: 1 } as const
// Two Int32 words are exactly the 8 bytes a Float64Array view needs as its byte offset.
const HEADER_BYTES = 8

/** One slot in doubles: core's state and derived regions, then the probe heights the host appends. */
export interface SlotLayout {
  readonly stateLength: number
  readonly derivedOffset: number
  readonly derivedLength: number
  readonly probeOffset: number
  readonly probeLength: number
  readonly length: number
}

export const slotLayoutFor = (layout: StateLayout, probeLength: number): SlotLayout => ({
  stateLength: layout.state.length,
  derivedOffset: layout.slot.derivedOffset,
  derivedLength: layout.derived.length,
  probeOffset: layout.slot.length,
  probeLength,
  length: layout.slot.length + probeLength,
})

export const createSlotBuffer = (slot: SlotLayout): SharedArrayBuffer =>
  new SharedArrayBuffer(HEADER_BYTES + 2 * slot.length * Float64Array.BYTES_PER_ELEMENT)

/** The Worker's side: hands out the unpublished slot to fill, then publishes it. */
export interface SlotWriter {
  /** The slot not currently published; valid until the next publish. */
  unpublished(): Float64Array
  /** Makes the slot last handed out by unpublished() the newest, at this tick. */
  publish(tick: number): void
}

export const slotWriter = (buffer: SharedArrayBuffer, slot: SlotLayout): SlotWriter => {
  const header = new Int32Array(buffer, 0, 2)
  const slots = [0, 1].map(
    (i) => new Float64Array(buffer, HEADER_BYTES + i * slot.length * Float64Array.BYTES_PER_ELEMENT, slot.length),
  )
  const other = (): number => 1 - Atomics.load(header, HEADER.index)
  return {
    unpublished: () => {
      const view = slots[other()]
      if (view === undefined) throw new RangeError('The slot index is out of range.')
      return view
    },
    publish: (tick) => {
      Atomics.store(header, HEADER.tick, tick)
      Atomics.store(header, HEADER.index, other())
    },
  }
}

/** The renderer's side: copies the newest slot into a buffer of its own. */
export interface SlotReader {
  /** Copies the published slot into the reader's own array and returns it; the array is reused on every call. */
  read(): Float64Array
}

export const slotReader = (buffer: SharedArrayBuffer, slot: SlotLayout): SlotReader => {
  const header = new Int32Array(buffer, 0, 2)
  const shared = new Float64Array(buffer, HEADER_BYTES, 2 * slot.length)
  const copy = new Float64Array(slot.length)
  return {
    read: () => {
      const start = Atomics.load(header, HEADER.index) * slot.length
      copy.set(shared.subarray(start, start + slot.length))
      return copy
    },
  }
}
