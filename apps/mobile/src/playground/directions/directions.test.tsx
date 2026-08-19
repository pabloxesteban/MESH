/**
 * Las cuatro direcciones visuales renderizan y respetan los innegociables.
 *
 * No se testea que "queden lindas" — eso se mira, y para eso están los
 * prototipos. Lo que sí tiene que valer para las cuatro, porque no es materia
 * de gusto:
 *
 * · Ninguna inventa contenido: todas usan el mismo fixture.
 * · Ninguna muestra un porcentaje de encaje. El brief pide que el encaje no se
 *   lea como puntaje de juego, y las razones de MESH son frases con sustento.
 * · Ninguna promete algo que MESH no puede sostener.
 */

import { render, screen } from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { CreativeMinimal } from './CreativeMinimal.tsx'
import { EditorialDark } from './EditorialDark.tsx'
import { SpatialApple } from './SpatialApple.tsx'
import { WarmGallery } from './WarmGallery.tsx'
import { ARTISTA, GUSTO } from './fixtures.ts'

const DIRECCIONES = [
  ['A · Editorial Dark', EditorialDark],
  ['B · Warm Gallery', WarmGallery],
  ['C · Spatial Apple', SpatialApple],
  ['D · Creative Minimal', CreativeMinimal],
] as const

function renderDireccion(Component: (typeof DIRECCIONES)[number][1]) {
  render(
    <ThemeProvider>
      <MotionProvider>
        <I18nProvider locale="es-AR">
          <Component />
        </I18nProvider>
      </MotionProvider>
    </ThemeProvider>,
  )
}

describe.each(DIRECCIONES)('dirección %s', (_nombre, Component) => {
  it('renderiza las cinco superficies', () => {
    renderDireccion(Component)
    for (const superficie of [
      'DESCUBRIR',
      'PERFIL DE ARTISTA',
      'GUSTO',
      'MATCH',
      'PROYECTO',
    ]) {
      expect(screen.getByText(superficie)).toBeTruthy()
    }
  })

  it('no muestra un porcentaje de encaje', () => {
    renderDireccion(Component)
    // "94% match" convierte una explicación en un puntaje de juego. Las bandas
    // de MESH son palabras —encaje fuerte, buen encaje— y las razones son
    // frases con sustento. Ver ADR-005 y docs/product/matching.md §8.
    expect(screen.queryByText(/\d+\s?%/)).toBeNull()
  })

  it('cada estilo del gusto llega con su sustento', () => {
    renderDireccion(Component)
    for (const entrada of GUSTO) {
      // Un puntaje sin "de cuántas decisiones salió" es una afirmación sin
      // respaldo. Las cuatro direcciones lo muestran, cada una a su manera.
      expect(
        screen.getAllByText(new RegExp(String(entrada.support))).length,
      ).toBeGreaterThan(0)
    }
  })

  it('usa el fixture compartido y no contenido propio', () => {
    renderDireccion(Component)
    // Si una dirección trajera su propio contenido, la comparación mediría el
    // contenido en vez de la composición.
    expect(screen.getAllByText(ARTISTA.nombre).length).toBeGreaterThan(0)
  })
})
