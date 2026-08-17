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
  sans: 'InstrumentSans-Regular',
  sansMedium: 'InstrumentSans-Medium',
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
  /** Revelación del gusto, momentos de marca. */
  display: {
    fontFamily: fontFamily.serif,
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
  /** Metadatos, epígrafes, etiquetas de botón. */
  label: {
    fontFamily: fontFamily.sansMedium,
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
