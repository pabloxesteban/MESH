/**
 * Composición del mensaje de contacto.
 *
 * Es una función pura, vive en `packages/domain` y tiene un test golden por una
 * razón concreta: **el mensaje no puede contener nada que la persona no haya
 * escrito.** Ni un estilo "inferido", ni un presupuesto "estimado", ni una
 * referencia a MESH que la haga sonar como una plataforma con la que el artista
 * tiene una relación que no tiene.
 *
 * Lo único que MESH aporta son los conectores del armado. Todo lo demás entra
 * como dato, y si un dato falta, la línea entera desaparece — no queda un
 * "Presupuesto: —" que le pide al artista que complete el hueco.
 *
 * El mensaje se le muestra a la persona para que lo edite antes de enviarlo. No
 * es una formalidad: es la última verificación de que dice lo que quiere decir.
 */

export interface ContactMessageInput {
  /** Nombre del artista, como está publicado. */
  readonly professionalName: string
  /** Lo que la persona escribió del proyecto. Nunca se genera. */
  readonly projectTitle?: string | undefined
  readonly projectDescription?: string | undefined
  /** Nombres visibles de los estilos que la persona ELIGIÓ, no los inferidos. */
  readonly styleNames?: readonly string[] | undefined
  /** Presupuesto ya formateado. Solo si la persona lo declaró. */
  readonly budget?: string | undefined
  /** Urgencia ya traducida. Solo si la persona la eligió. */
  readonly timing?: string | undefined
  /** Cuántas imágenes de referencia va a mandar aparte. */
  readonly referenceCount?: number | undefined
  /** Plantillas de i18n ya resueltas. El dominio no conoce idiomas. */
  readonly labels: ContactLabels
}

export interface ContactLabels {
  readonly greeting: string
  readonly styles: string
  readonly budget: string
  readonly timing: string
  readonly references: string
  readonly closing: string
}

/**
 * Arma el mensaje.
 *
 * Una línea por dato presente, en orden fijo. Las ausentes no dejan hueco.
 */
export function composeContactMessage(input: ContactMessageInput): string {
  const lines: string[] = [input.labels.greeting]

  const title = trimmed(input.projectTitle)
  const description = trimmed(input.projectDescription)

  if (title != null) lines.push(title)
  if (description != null && description !== title) lines.push(description)

  const styles = (input.styleNames ?? []).filter(
    (name) => trimmed(name) != null,
  )
  if (styles.length > 0)
    lines.push(`${input.labels.styles} ${styles.join(', ')}`)

  const budget = trimmed(input.budget)
  if (budget != null) lines.push(`${input.labels.budget} ${budget}`)

  const timing = trimmed(input.timing)
  if (timing != null) lines.push(`${input.labels.timing} ${timing}`)

  if (input.referenceCount != null && input.referenceCount > 0) {
    lines.push(input.labels.references)
  }

  lines.push(input.labels.closing)

  return lines.join('\n\n')
}

function trimmed(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const result = value.trim()
  return result.length === 0 ? undefined : result
}

/**
 * Enlace de WhatsApp.
 *
 * `wa.me` y no `whatsapp://`: el esquema nativo falla en silencio si la app no
 * está instalada, y el enlace https abre el navegador con instrucciones. Que la
 * persona vea una página es mejor que un toque que no hace nada.
 */
export function whatsappUrl(e164: string, message: string): string {
  const digits = e164.replace(/[^\d]/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/**
 * Enlace de Instagram.
 *
 * Instagram **no acepta un mensaje prellenado** desde un enlace. Se abre el
 * perfil y el mensaje queda en el portapapeles, y la pantalla lo dice: prometer
 * que va a aparecer escrito sería mentir sobre lo que hace el botón.
 */
export function instagramUrl(handle: string): string {
  return `https://instagram.com/${handle.replace(/^@/, '')}`
}
