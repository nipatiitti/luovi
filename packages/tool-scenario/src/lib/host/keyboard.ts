import type { Input } from '@luovi/core'

// Keyboard control of a ship (ADR 0003): a key press sends the control's range limit in its direction and a key
// release sends the control's current value from the newest slot, so sim-world's cited rate is the slew and a held key
// is exactly two inputs. Drivers send targets, never rates.

export interface KeyBinding {
  /** KeyboardEvent.code, so the layout of the keyboard does not move the binding. */
  readonly code: string
  readonly ship: string
  readonly control: string
  /** The range limit the key drives toward. */
  readonly limit: number
}

/** Current value of a control in the newest slot, undefined when the slot has no such control. */
export type CurrentValue = (ship: string, control: string) => number | undefined

export const attachKeyboardDriver = (
  target: Window,
  bindings: readonly KeyBinding[],
  send: (input: Input) => void,
  current: CurrentValue,
): (() => void) => {
  const bound = new Map(bindings.map((binding) => [binding.code, binding]))
  const onDown = (event: KeyboardEvent): void => {
    const binding = bound.get(event.code)
    if (binding === undefined || event.repeat) return
    send({ kind: 'control', ship: binding.ship, control: binding.control, target: binding.limit })
  }
  const onUp = (event: KeyboardEvent): void => {
    const binding = bound.get(event.code)
    if (binding === undefined) return
    const value = current(binding.ship, binding.control)
    if (value !== undefined) send({ kind: 'control', ship: binding.ship, control: binding.control, target: value })
  }
  target.addEventListener('keydown', onDown)
  target.addEventListener('keyup', onUp)
  return () => {
    target.removeEventListener('keydown', onDown)
    target.removeEventListener('keyup', onUp)
  }
}
