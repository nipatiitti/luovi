import { hashState, type Input, STATE_HEADER } from '@luovi/core'
import { DEFAULT_PROBE_GRID, probeCount, probeMarkers } from './probe.ts'
import type { FromWorker, ToWorker } from './protocol.ts'
import { type SlotReader, slotReader } from './slots.ts'

/** What the page shows of a load: the Worker's answer without the buffer, which only the reader touches. */
export type Loaded = Omit<Extract<FromWorker, { kind: 'loaded' }>, 'kind' | 'buffer'>

export type Status = Omit<Extract<FromWorker, { kind: 'status' }>, 'kind'>

/** The newest slot as one frame reads it, copied out of the shared buffer. */
export interface Frame {
  readonly tick: number
  /** core's state hash over the copied state region. */
  readonly hash: number
  /** The slot copy: state, derived, then probe heights, per the loaded slot layout. */
  readonly slot: Float64Array
  /** xyz per probe point, the height from the slot; reused across frames. */
  readonly markers: Float32Array<ArrayBuffer>
}

export interface HostEvents {
  loaded(loaded: Loaded): void
  error(message: string): void
  status(status: Status): void
}

export interface Host {
  load(scenario: unknown): void
  play(): void
  pause(): void
  step(): void
  setSpeed(multiplier: number): void
  /** One input to the newest world; the Worker stamps it with the tick it applies at. */
  send(input: Input): void
  /** Reads the newest slot; call once per animation frame. Undefined until a world has loaded. */
  frame(): Frame | undefined
  stop(): void
}

interface Reading {
  readonly loaded: Loaded
  readonly reader: SlotReader
  readonly markers: Float32Array<ArrayBuffer>
}

/** Starts the simulation Worker. Its answers arrive through `events`; frames are pulled with frame(). */
export const startHost = (events: HostEvents): Host => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'simulation' })
  const send = (message: ToWorker): void => {
    worker.postMessage(message)
  }
  let reading: Reading | undefined

  worker.addEventListener('message', (event: MessageEvent<FromWorker>) => {
    const message = event.data
    switch (message.kind) {
      case 'loaded': {
        const { buffer, layout, slot, probe, sea, effectiveScenario, definitionHashes } = message
        const loaded: Loaded = { layout, slot, probe, sea, effectiveScenario, definitionHashes }
        reading = {
          loaded,
          reader: slotReader(buffer, loaded.slot),
          markers: new Float32Array(3 * probeCount(loaded.probe)),
        }
        events.loaded(loaded)
        return
      }
      case 'error':
        events.error(message.message)
        return
      case 'status':
        events.status({ running: message.running, tick: message.tick, msPerTick: message.msPerTick })
    }
  })
  worker.addEventListener('error', (event) => {
    events.error(`The simulation Worker failed: ${event.message}`)
  })

  return {
    load: (scenario) => {
      send({ kind: 'load', scenario, probe: DEFAULT_PROBE_GRID })
    },
    play: () => {
      send({ kind: 'play' })
    },
    pause: () => {
      send({ kind: 'pause' })
    },
    step: () => {
      send({ kind: 'step' })
    },
    setSpeed: (multiplier) => {
      send({ kind: 'speed', multiplier })
    },
    send: (input) => {
      send({ kind: 'input', input })
    },
    frame: () => {
      if (reading === undefined) return undefined
      const { loaded, reader, markers } = reading
      const { slot, probe } = loaded
      const copy = reader.read()
      probeMarkers(probe, copy.subarray(slot.probeOffset, slot.probeOffset + slot.probeLength), markers)
      return {
        tick: copy[STATE_HEADER.tick] ?? 0,
        hash: hashState(copy.subarray(0, slot.stateLength)),
        slot: copy,
        markers,
      }
    },
    stop: () => {
      worker.terminate()
    },
  }
}
