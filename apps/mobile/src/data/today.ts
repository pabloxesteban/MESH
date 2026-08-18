/**
 * La fecha de hoy, en ISO.
 *
 * Existe como un módulo propio, y no como un `new Date()` suelto, porque es el
 * único lugar de la app que le da la hora al motor de match. `packages/domain`
 * tiene prohibido leer el reloj (ADR-008) justamente para que el matching sea
 * reproducible: la fecha entra por parámetro, y este archivo es el borde donde
 * el reloj real se convierte en un dato.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
