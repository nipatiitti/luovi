import type { Harness, HarnessIo } from './types.ts'

const notYet = (): never => {
  throw new Error('not implemented until #29: the harness has no world before sim-world loads scenarios')
}

/** The only Harness implementation. Until sim-world exists it offers file access alone. */
export const createHarness = (io: HarnessIo): Harness => ({
  load: notYet,
  step: notYet,
  hash: notYet,
  readBinary: io.readBinary,
})
