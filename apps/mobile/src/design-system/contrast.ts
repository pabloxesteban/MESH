/**
 * Contraste WCAG 2.1.
 *
 * Existe para que el contraste se verifique en un test y no a ojo. El acento de
 * la marca no pasa AA sobre superficie oscura — un error invisible para alguien
 * con buena vista en una buena pantalla, y obvio para un test. Ver ADR-008.
 *
 * Puro: sin React, sin react-native. Se puede testear sin simulador.
 */

/** Relación de contraste mínima para texto de cuerpo. */
export const AA_TEXT = 4.5

/**
 * Relación mínima para texto grande (≥24px, o ≥19px en peso medio o mayor) y
 * para elementos gráficos que portan significado.
 */
export const AA_LARGE = 3

export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** Acepta `#rgb` y `#rrggbb`. */
export function parseHex(hex: string): Rgb {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Color inválido: "${hex}"`)
  }

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

function channelLuminance(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Luminancia relativa, WCAG 2.1. */
export function relativeLuminance(color: string): number {
  const { r, g, b } = parseHex(color)
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  )
}

/** Relación de contraste entre dos colores opacos. De 1 a 21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsContrast(
  foreground: string,
  background: string,
  minimum: number = AA_TEXT,
): boolean {
  return contrastRatio(foreground, background) >= minimum
}

/**
 * Compone un color translúcido (`#rrggbbaa`, u opaco `#rrggbb`/`#rgb`) sobre
 * un fondo opaco, y devuelve el resultado como `#rrggbb`.
 *
 * La mezcla es en sRGB codificado (no en luz lineal): es el espacio en el que
 * compone de verdad la GPU un `LinearGradient` sobre una superficie, así que
 * es el que hay que usar para que un test de contraste sobre un degradado
 * (`heroGlow`, ADR-032) refleje lo que se ve en pantalla y no una
 * aproximación.
 */
export function blendOverBackground(
  foregroundWithAlpha: string,
  background: string,
): string {
  const value = foregroundWithAlpha.replace('#', '')
  const hasAlpha = value.length === 8 || value.length === 4
  const opaqueLength = value.length === 8 ? 6 : value.length === 4 ? 3 : value.length
  const alphaHex = hasAlpha ? value.slice(opaqueLength) : null
  const alpha = alphaHex == null ? 1 : Number.parseInt(alphaHex, 16) / (alphaHex.length === 1 ? 15 : 255)

  const fg = parseHex(`#${value.slice(0, opaqueLength)}`)
  const bg = parseHex(background)

  const mix = (f: number, b: number) => Math.round(alpha * f + (1 - alpha) * b)

  return (
    '#' +
    [mix(fg.r, bg.r), mix(fg.g, bg.g), mix(fg.b, bg.b)]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
  )
}
