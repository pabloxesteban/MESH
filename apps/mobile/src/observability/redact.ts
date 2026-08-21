/**
 * Sacarle a un texto todo lo que pueda identificar a alguien.
 *
 * Ver ADR-026. Es un módulo puro y sin dependencias a propósito: es la pieza de
 * la que depende que un reporte de error no sea una filtración, así que tiene
 * que poder leerse entera de una sentada y testearse sin montar nada.
 *
 * ## Por qué hace falta, si nosotros elegimos qué mandar
 *
 * Porque el `message` de un error no lo escribimos nosotros. Postgres lo arma
 * con los valores de la fila:
 *
 *     duplicate key value violates unique constraint "profiles_email_key"
 *     Key (email)=(alguien@ejemplo.com) already exists.
 *
 * Ese texto es útil para arreglar un bug y es un correo ajeno viajando a un
 * servidor de terceros. Las dos cosas a la vez.
 *
 * ## Cómo está pensado
 *
 * **Lista negra por forma, no por contenido.** No intenta adivinar si algo es
 * personal: reemplaza todo lo que TENGA FORMA de dato personal —un correo, un
 * uuid, un teléfono, algo entre comillas, algo después de un `=`— aunque en ese
 * caso puntual fuera inofensivo. Un reemplazo de más cuesta un poco de contexto
 * al depurar; uno de menos cuesta un dato de una persona.
 *
 * El orden importa: primero lo más específico (correos), después lo más
 * general (paréntesis y comillas). Al revés, un correo adentro de comillas ya
 * habría sido tapado por la regla genérica y nunca sabríamos que era un correo.
 */

/** Tope de lo que viaja. Un mensaje más largo que esto ya no se está leyendo. */
export const MAX_MESSAGE = 200

const REGLAS: readonly { patron: RegExp; reemplazo: string }[] = [
  // Correos. Primero que nada: es el dato personal más común en un error de
  // base y el más fácil de reconocer.
  { patron: /[\w.+-]+@[\w-]+\.[\w.-]+/g, reemplazo: '[correo]' },

  // UUID. Identifican a una persona, a una conversación o a una obra; cuál de
  // las tres no se sabe desde acá, así que se tapan todos.
  {
    patron:
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    reemplazo: '[id]',
  },

  // Teléfonos en E.164 y cualquier corrida larga de dígitos. Siete es el piso
  // de un teléfono argentino sin característica; por debajo de eso hay códigos
  // de error y números de línea que sí conviene conservar.
  { patron: /\+\d[\d\s-]{7,}\d/g, reemplazo: '[número]' },
  { patron: /\b\d{7,}\b/g, reemplazo: '[número]' },

  // El valor de una clave, que es como Postgres reporta un choque de unicidad.
  // Se conserva el nombre de la columna, que es lo que sirve para depurar.
  { patron: /\)=\([^)]*\)/g, reemplazo: ')=([valor])' },

  // Cualquier cosa entre comillas. Barre los nombres de tabla —que no molesta
  // perder— y también los valores que Postgres cita.
  { patron: /"[^"]*"/g, reemplazo: '"[texto]"' },
  { patron: /'[^']*'/g, reemplazo: "'[texto]'" },

  // La query de una URL. Un token de recuperación viaja ahí.
  { patron: /(https?:\/\/[^\s?]+)\?[^\s]*/g, reemplazo: '$1?[query]' },
]

/**
 * Devuelve el texto sin nada que identifique a nadie, recortado.
 *
 * Nunca lanza: recibe `unknown` porque el `message` de un error puede ser
 * cualquier cosa, incluido un objeto.
 */
export function redact(value: unknown): string {
  if (typeof value !== 'string' || value === '') return ''

  let salida = value
  for (const { patron, reemplazo } of REGLAS) {
    salida = salida.replace(patron, reemplazo)
  }

  salida = salida.trim()
  return salida.length <= MAX_MESSAGE
    ? salida
    : `${salida.slice(0, MAX_MESSAGE - 1).trimEnd()}…`
}

/** Tope de cuadros de pila que viajan. Más abajo ya es React llamándose a sí mismo. */
export const MAX_FRAMES = 12

/**
 * La pila, reducida a lo que sirve: dónde pasó.
 *
 * De cada línea queda **el nombre de la función y el archivo**, sin la ruta
 * completa y sin los argumentos. La ruta completa de un bundle no ayuda a
 * nadie, y los argumentos son exactamente donde viajaría el contenido de un
 * mensaje.
 */
export function redactStack(stack: unknown): readonly string[] {
  if (typeof stack !== 'string' || stack === '') return []

  return stack
    .split('\n')
    .slice(1, MAX_FRAMES + 1)
    .map((linea) => linea.trim())
    .filter((linea) => linea !== '')
    .map((linea) => {
      // `at algo (ruta/larga/archivo.tsx:12:3)` → `algo (archivo.tsx:12)`
      const sinAt = linea.replace(/^at\s+/, '')
      return redact(
        sinAt
          .replace(/\(([^)]*[/\\])?([^/\\)]+):(\d+):\d+\)/, '($2:$3)')
          .replace(/([^\s(]*[/\\])([^/\\\s]+):(\d+):\d+/, '$2:$3'),
      )
    })
}
