/**
 * El color de estilo es información, no decoración. Estas son sus reglas.
 */

import { STYLES } from '@mesh/domain'

import { AA_LARGE, AA_TEXT, contrastRatio } from '../contrast.ts'
import { palette } from './palette.ts'
import { STYLE_FAMILIES, STYLE_FAMILY, styleColor } from './style-colors.ts'
import { darkTheme, lightTheme } from './theme.ts'

const BOTH = [darkTheme, lightTheme]

describe('cobertura de la taxonomía', () => {
  it('todo estilo de la taxonomía tiene familia', () => {
    // Un estilo sin color quedaría gris entre chips de colores y se leería como
    // deshabilitado. Agregar un estilo obliga a pasar por acá.
    const huerfanos = STYLES.filter(
      (style) => STYLE_FAMILY[style.slug] == null,
    ).map((style) => style.slug)
    expect(huerfanos).toEqual([])
  })

  it('no hay familias asignadas a estilos que ya no existen', () => {
    const conocidos = new Set(STYLES.map((style) => style.slug))
    const sobrantes = Object.keys(STYLE_FAMILY).filter(
      (slug) => !conocidos.has(slug),
    )
    expect(sobrantes).toEqual([])
  })

  it('todas las familias declaradas se usan', () => {
    const usadas = new Set(Object.values(STYLE_FAMILY))
    const sinUsar = STYLE_FAMILIES.filter((family) => !usadas.has(family))
    expect(sinUsar).toEqual([])
  })
})

describe.each(BOTH.map((theme) => [theme.name, theme] as const))(
  'contraste · tema %s',
  (_name, theme) => {
    it('el texto de todo estilo llega a AA sobre la superficie elevada', () => {
      // La superficie elevada es la exigente: es donde vive una tarjeta, y una
      // tarjeta es donde vive un chip.
      const flojos = STYLES.filter(
        (style) =>
          contrastRatio(
            styleColor(style.slug, theme).text,
            theme.surfaceRaised,
          ) < AA_TEXT,
      ).map((style) => style.slug)
      expect(flojos).toEqual([])
    })

    it('el texto de todo estilo llega a AA también sobre la superficie base', () => {
      const flojos = STYLES.filter(
        (style) =>
          contrastRatio(styleColor(style.slug, theme).text, theme.surface) <
          AA_TEXT,
      ).map((style) => style.slug)
      expect(flojos).toEqual([])
    })

    it('todo relleno de estilo lleva su texto con AA', () => {
      const flojos = STYLES.filter((style) => {
        const color = styleColor(style.slug, theme)
        return contrastRatio(color.onVivid, color.vivid) < AA_TEXT
      }).map((style) => style.slug)
      expect(flojos).toEqual([])
    })

    it('todo relleno se distingue de la superficie como objeto gráfico', () => {
      // Un punto de color que se funde con el fondo no comunica nada.
      const flojos = STYLES.filter(
        (style) =>
          contrastRatio(styleColor(style.slug, theme).vivid, theme.surface) <
          AA_LARGE,
      ).map((style) => style.slug)
      expect(flojos).toEqual([])
    })
  },
)

describe('las familias se distinguen entre sí', () => {
  it('ningún par de familias comparte color vívido', () => {
    const vividos = STYLE_FAMILIES.map(
      (family) =>
        styleColor(
          Object.keys(STYLE_FAMILY).find(
            (slug) => STYLE_FAMILY[slug] === family,
          ) as string,
          darkTheme,
        ).vivid,
    )
    expect(new Set(vividos).size).toBe(STYLE_FAMILIES.length)
  })

  it('estilos de la misma familia comparten color a propósito', () => {
    // `fine-line` y `minimalist` son la misma idea con distinto nombre.
    expect(styleColor('fine-line', darkTheme).vivid).toBe(
      styleColor('minimalist', darkTheme).vivid,
    )
    expect(styleColor('fine-line', darkTheme).vivid).not.toBe(
      styleColor('blackwork', darkTheme).vivid,
    )
  })
})

describe('estilo desconocido', () => {
  it('cae en el acento de marca en vez de romper o quedar invisible', () => {
    // Pasa cuando el catálogo tiene un estilo más nuevo que el bundle
    // instalado. Un chip del color de la marca es raro pero legible; uno
    // transparente no se ve.
    const color = styleColor('estilo-del-futuro', darkTheme)
    expect(color.text).toBe(darkTheme.accent)
    expect(color.vivid).toBe(darkTheme.accentFill)
    expect(contrastRatio(color.onVivid, color.vivid)).toBeGreaterThanOrEqual(
      AA_TEXT,
    )
  })
})

describe('la paleta es la generada', () => {
  it('no quedó ningún hex viejo del acento anterior', () => {
    // Si alguien vuelve a pegar `#9C2D40` a mano, el generador y el archivo se
    // separan y `brand:palette:check` falla en CI. Esto lo dice acá también,
    // que es donde alguien lo va a leer.
    expect(JSON.stringify(palette)).not.toContain('9C2D40')
  })
})
