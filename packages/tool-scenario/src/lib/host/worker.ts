import type { AppliedInput } from '@luovi/core'
import { loadWorld, type World } from '@luovi/sim-world'
import { pace, untilNextTick } from './clock.ts'
import { type ProbeGrid, probeCount, probePoints } from './probe.ts'
import type { FromWorker, ToWorker } from './protocol.ts'
import { createSlotBuffer, type SlotLayout, slotLayoutFor, type SlotWriter, slotWriter } from './slots.ts'

// The simulation host: one dedicated module Worker running sim-world and its CPU environment query, paced on the
// Worker's own clock. Timers and performance.now() are host code; nothing in a sim package reads a clock.

/** Wall milliseconds between status messages while running; the run bar needs no more than a few a second. */
const STATUS_PERIOD = 250

interface Session {
  readonly world: World
  readonly slot: SlotLayout
  readonly writer: SlotWriter
  readonly points: Float64Array
  /** Stride 4 per probe point, as the environment query's water() writes it. */
  readonly water: Float64Array
}

const post = (message: FromWorker): void => {
  self.postMessage(message)
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error))

let session: Session | undefined
let running = false
let speed = 1
let accumulator = 0
let lastWake = 0
let timer: ReturnType<typeof setTimeout> | undefined
// Ticks and the wall time they took since the last status, and the mean of the last period that ran any.
let tickCount = 0
let tickTime = 0
let lastStatus = 0
let msPerTick: number | undefined

/** Fills the unpublished slot with the world's state, derived buffer and probe heights, then publishes it. */
const publish = (current: Session): void => {
  const { world, slot, writer, points, water } = current
  const target = writer.unpublished()
  target.set(world.state, 0)
  target.set(world.derived, slot.derivedOffset)
  world.environment.water(world.tick, points, water)
  for (let i = 0; i < slot.probeLength; i++) target[slot.probeOffset + i] = water[4 * i] ?? 0
  writer.publish(world.tick)
}

// The page draws from the effective scenario and the sea description it last received, so after the tick an edit lands on
// it gets both; the sea, which is the large part, only when a sea input was among them. The renderer uploads it on
// receipt, a frame or so after the slot that first shows the new surface, and that mismatch is accepted (ADR 0003).
const announce = (world: World, applied: readonly AppliedInput[]): void => {
  const seaChanged = applied.some((input) => input.kind === 'environment' && input.block === 'sea')
  post({
    kind: 'environment',
    tick: world.tick,
    effectiveScenario: world.effectiveScenario,
    applied,
    ...(seaChanged ? { sea: world.sea } : {}),
  })
}

const runTick = (current: Session): void => {
  const start = performance.now()
  const applied = current.world.step()
  publish(current)
  tickTime += performance.now() - start
  tickCount += 1
  if (applied.length > 0) announce(current.world, applied)
}

const sendStatus = (now: number): void => {
  if (tickCount > 0) msPerTick = tickTime / tickCount
  tickCount = 0
  tickTime = 0
  lastStatus = now
  post({ kind: 'status', running, tick: session?.world.tick ?? 0, msPerTick })
}

const stopTimer = (): void => {
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined
}

const wake = (): void => {
  timer = undefined
  if (!running || session === undefined) return
  const now = performance.now()
  const due = pace(accumulator, now - lastWake, speed)
  accumulator = due.accumulator
  lastWake = now
  for (let i = 0; i < due.ticks; i++) runTick(session)
  if (now - lastStatus >= STATUS_PERIOD) sendStatus(now)
  timer = setTimeout(wake, untilNextTick(accumulator, speed))
}

const play = (): void => {
  if (running || session === undefined) return
  running = true
  accumulator = 0
  lastWake = performance.now()
  timer = setTimeout(wake, untilNextTick(accumulator, speed))
  sendStatus(lastWake)
}

const pause = (): void => {
  running = false
  stopTimer()
  sendStatus(performance.now())
}

const load = (scenario: unknown, probe: ProbeGrid): void => {
  let world: World
  try {
    world = loadWorld(scenario)
  } catch (error) {
    post({ kind: 'error', message: errorText(error) })
    return
  }
  const slot = slotLayoutFor(world.layout, probeCount(probe))
  const buffer = createSlotBuffer(slot)
  const next: Session = {
    world,
    slot,
    writer: slotWriter(buffer, slot),
    points: probePoints(probe),
    water: new Float64Array(4 * slot.probeLength),
  }
  running = false
  stopTimer()
  msPerTick = undefined
  publish(next)
  session = next
  post({
    kind: 'loaded',
    buffer,
    layout: world.layout,
    slot,
    probe,
    sea: world.sea,
    effectiveScenario: world.effectiveScenario,
    definitionHashes: {},
  })
  sendStatus(performance.now())
}

const handle = (message: ToWorker): void => {
  switch (message.kind) {
    case 'load':
      load(message.scenario, message.probe)
      return
    case 'play':
      play()
      return
    case 'pause':
      pause()
      return
    case 'step':
      if (running) pause()
      if (session !== undefined) runTick(session)
      sendStatus(performance.now())
      return
    case 'speed':
      if (message.multiplier > 0) speed = message.multiplier
      return
    case 'input':
      if (session === undefined) return
      try {
        session.world.applyInput(message.input)
      } catch (error) {
        post({ kind: 'error', message: errorText(error) })
      }
  }
}

self.addEventListener('message', (event: MessageEvent<ToWorker>) => {
  handle(event.data)
})
