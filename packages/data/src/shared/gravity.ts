// Gravity lives here, not in core: g is a modelling choice (the Baltic's local g at 60 N is about 0.13% higher than the
// conventional value), and the sea description reports the cited value its build used.
import type { CitedValue } from '@luovi/core'

/** m/s^2 */
export const standardGravity: CitedValue = {
  value: 9.80665,
  src: '3rd CGPM 1901, Comptes rendus p. 70, the conventional standard acceleration of gravity g_n = 9.80665 m/s^2',
}
