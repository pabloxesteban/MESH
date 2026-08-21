/**
 * El pedido, convertido en el primer mensaje de un chat.
 *
 * **Es una plantilla, no una generación.** Ninguna de estas líneas la escribe un
 * modelo: el resumen lo escribió la persona en la pantalla de revisión, y los
 * rasgos son slugs de la taxonomía traducidos por i18n. Por eso este módulo es
 * puro y vive fuera de la pantalla — se puede leer entero y verificar que no hay
 * ningún lugar por donde entre texto inventado.
 *
 * Contra el ghosteo, esto es la mitad que importa: el tatuador abre el chat y ya
 * tiene qué, dónde, de qué tamaño y en qué paleta. No tiene que preguntar cinco
 * cosas para poder cotizar, que es donde mueren las conversaciones.
 *
 * Lo que la plantilla NO pone, a propósito:
 * · ningún precio, ni el presupuesto de la persona — eso lo abre ella si quiere;
 * · ninguna fecha ni urgencia;
 * · ninguna fórmula de cortesía inventada en su nombre.
 */

export interface BriefMessageInput {
  /** El pedido en palabras, tal como quedó después de que la persona lo editó. */
  readonly summary: string
  /** Etiquetas ya traducidas: estilo primero, después los rasgos. */
  readonly labels: readonly string[]
}

/**
 * Devuelve el mensaje, o `null` si no hay nada que mandar.
 *
 * `null` y no un texto vacío: la pantalla tiene que poder no ofrecer el botón,
 * y un string vacío que igual se manda es un mensaje en blanco del otro lado.
 */
export function briefMessage(input: BriefMessageInput): string | null {
  const summary = input.summary.trim()
  if (summary === '') return null

  const labels = input.labels
    .map((label) => label.trim())
    .filter((label) => label !== '')

  // Los rasgos van en una sola línea abajo del resumen: son la referencia
  // rápida, no el mensaje. Un tatuador lee el párrafo y confirma con la línea.
  return labels.length === 0 ? summary : `${summary}\n\n${labels.join(' · ')}`
}
