/**
 * El valor de un campo, un rato después de la última tecla.
 *
 * Existe por una sola razón: sin esto, escribir "delfina" son siete consultas
 * a la base y seis de ellas ya no le importan a nadie. El campo responde
 * enseguida —lo que se ve al escribir es el valor crudo— y lo que sale a la
 * red es este.
 *
 * 250ms es el número: por debajo se siguen yendo consultas de más, y por
 * encima el resultado llega después de que la persona ya dejó de escribir y
 * empezó a esperar.
 */

import { useEffect, useState } from 'react'

export const SEARCH_DEBOUNCE_MS = 250

export function useDebounced<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [quieto, setQuieto] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setQuieto(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return quieto
}
