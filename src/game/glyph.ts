/** Amplitude at which the |ψ⟩ flavour text first appears beside the counter. */
export const KET_FIRST = 1e12;

/**
 * Bra-ket notation that grows with the number: a state vector, then an inner
 * product, then an expectation value. Flavour only; it never replaces the real number.
 */
export function ketFor(amplitude: number): string | null {
  if (!(amplitude >= KET_FIRST)) return null;
  if (amplitude >= 1e36) return '⟨ψ|Ĥ|ψ⟩';
  if (amplitude >= 1e24) return '⟨ψ|ψ⟩';
  return '|ψ⟩';
}
