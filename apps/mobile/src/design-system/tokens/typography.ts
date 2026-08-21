/**
 * Escala tipográfica.
 *
 * Dos familias, cada una en su rol: **la serif nunca por debajo de 24px, la
 * sans nunca por encima de 20px.** Esa única restricción las mantiene en su
 * lugar sin discutir el manual de estilo en cada pantalla, y está verificada
 * por un test.
 *
 * Los pesos están fijados en los archivos de fuente, no en los estilos: React
 * Native no expone los ejes de una variable font. Ver
 * tools/brand/src/build-fonts.py.
 *
 * Los nombres de familia son las claves con las que `expo-font` registra cada
 * archivo en app/_layout.tsx. Si no coinciden, el sistema cae al tipo por
 * defecto y nadie se entera.
 */

export const fontFamily = {
  serif: 'Fraunces-Regular',
  // ADR-031. Mismos ejes que el logotipo (wght 600, opsz 144) — reutiliza el
  // peso que la propia marca ya validó, en vez de importar una voz nueva.
  // Solo el rol `display` lo usa: el veredicto sobre un Fraunces más pesado a
  // 24px (`title`/`titleLg`) ya se probó y se descartó, y sigue siendo válido
  // a ese tamaño. Ver tools/brand/src/build-fonts.py.
  serifDisplay: 'Fraunces-SemiBold',
  sans: 'InstrumentSans-Regular',
  sansMedium: 'InstrumentSans-Medium',
  // ADR-031. Para la etiqueta de los botones primarios y las pestañas
  // activas — donde antes corría `sansMedium`. Sigue siendo tamaño `label`
  // (13px): cambia el peso en un lugar puntual, no la escala.
  sansBold: 'InstrumentSans-Bold',
} as const

export interface TextRoleStyle {
  readonly fontFamily: string
  readonly fontSize: number
  readonly lineHeight: number
  readonly letterSpacing?: number
  readonly textTransform?: 'uppercase'
}

/**
 * Roles de texto. `Text` toma uno de estos por nombre y no tiene prop
 * `fontSize`: no se puede pedir un tamaño que no exista.
 */
export const textRoles = {
  /**
   * Revelación del gusto, momentos de marca. Fraunces SemiBold (ADR-031):
   * los mismos ejes que el logotipo, así que el texto más grande de la
   * pantalla pesa lo mismo que la propia marca.
   */
  display: {
    fontFamily: fontFamily.serifDisplay,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.4,
  },
  /** Títulos de pantalla, nombre del artista en el perfil. */
  titleLg: {
    fontFamily: fontFamily.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  /** Encabezados de sección. */
  title: {
    fontFamily: fontFamily.serif,
    fontSize: 24,
    lineHeight: 30,
  },
  /** Bios, descripciones de proyecto. */
  bodyLg: {
    fontFamily: fontFamily.sans,
    fontSize: 17,
    lineHeight: 26,
  },
  /** Por defecto. */
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  /** Metadatos, epígrafes, etiquetas de botón secundario/ghost/destructivo. */
  label: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  /**
   * Mismo tamaño que `label` (13px) — cambia el peso, no la escala. Solo para
   * la etiqueta del botón `primary` (ADR-031): el único elemento con permiso
   * de llevar el acento de marca se gana también el peso más audaz de la
   * escala sans. No es un reemplazo de `label`: el resto de los botones y
   * todo metadato se quedan en `sansMedium`.
   */
  labelBold: {
    fontFamily: fontFamily.sansBold,
    fontSize: 13,
    lineHeight: 18,
  },
  /** Etiquetas de estilo, antetítulos. Siempre en mayúsculas. */
  micro: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextRoleStyle>

export type TextRole = keyof typeof textRoles

/**
 * Escala máxima de tipografía dinámica.
 *
 * Se respeta hasta el tamaño accesible más grande — el texto envuelve, nunca se
 * recorta. El tope existe porque por encima de ~1,6× los layouts de tarjeta
 * dejan de tener sentido aun con flujo; a partir de ahí el usuario tiene el
 * zoom del sistema, que es mejor herramienta que una tarjeta rota.
 */
export const MAX_FONT_SCALE = 1.6
