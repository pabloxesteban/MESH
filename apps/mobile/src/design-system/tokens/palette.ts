/**
 * Escalas literales de color.
 *
 * **Este es el único archivo del repositorio con un valor hex.** En cualquier
 * otro lado es un error de lint. Ver ADR-008.
 *
 * Nada fuera de `theme.ts` importa esto: los componentes consumen tokens
 * semánticos (`textSecondary`), nunca literales (`ink500`). Si un componente
 * necesita un literal, a la capa semántica le falta un token.
 *
 * Los neutros son mezclas de tinta y papel, no gris: el sistema se mantiene
 * cálido. Ver docs/design/visual-language.md §4.
 */

export const palette = {
  // Tinta → papel
  ink900: '#0C0C0E',
  ink800: '#1A1A1D',
  ink700: '#2C2B2E',
  ink600: '#3E3C41',
  ink500: '#56545A',
  ink400: '#6F6D74',
  ink300: '#8C8A90',
  paper400: '#B3ABA0',
  paper300: '#C9C2B6',
  paper200: '#E2DCD1',
  paper100: '#F4EFE6',
  paper050: '#FAF7F1',

  /**
   * Acento de marca.
   *
   * `signal` sobre `ink900` mide ≈3,0:1 y NO pasa AA para texto. Por eso
   * existe `signalRaised`: es el mismo rojo, aclarado hasta pasar sobre
   * superficie oscura. No "arreglar" esto usando `signal` igual — el test de
   * contraste lo va a rechazar.
   */
  signal: '#9C2D40',
  signalRaised: '#D2687A',

  // Feedback del sistema. Nunca se usan para me gusta / paso: eso es una UI de
  // juicio y pertenece a las apps de citas. Ver visual-language.md §4.
  positive: '#2F5D3F',
  positiveRaised: '#7FB894',
  negative: '#993122',
  negativeRaised: '#E08C7C',
  warning: '#7A5A12',
  warningRaised: '#D9AE55',

  black: '#000000',
  white: '#FFFFFF',
} as const

export type PaletteToken = keyof typeof palette
