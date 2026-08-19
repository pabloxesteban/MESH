/**
 * Desde dónde se mira.
 *
 * Lo que importa verificar acá no es que el selector se vea: es que **lo que la
 * pantalla dice coincida con lo que hace**. Un encabezado que dice "cerca de
 * Palermo" mientras ordena por otra cosa es peor que no tener encabezado.
 *
 * Y una promesa que se repite en los tres modos: la ubicación **ordena y nunca
 * filtra**. Nadie desaparece de la lista por estar lejos.
 */

import { fireEvent, render, screen } from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { esAR } from '@/i18n/index.ts'

import { SearchLocationHeader, label } from './SearchLocationHeader.tsx'
import { SearchLocationScreen } from './SearchLocationScreen.tsx'
import {
  DEFAULT_SEARCH_LOCATION,
  normalizeSearchLocation,
  type SearchLocation,
} from './useSearchLocation.ts'

function t(key: string, params?: Record<string, string>): string {
  const raw = (esAR as Record<string, string>)[key] ?? key
  if (params == null) return raw
  return Object.entries(params).reduce(
    (acc, [name, value]) => acc.replaceAll(`{${name}}`, value),
    raw,
  )
}

const traducir = t as Parameters<typeof label>[3]

describe('normalizeSearchLocation', () => {
  it('sin nada guardado usa el GPS, que es lo que la app hacía antes', () => {
    // Estrenar la preferencia no puede cambiarle el orden a nadie sin avisar.
    expect(normalizeSearchLocation(null)).toEqual(DEFAULT_SEARCH_LOCATION)
    expect(normalizeSearchLocation('basura')).toEqual(DEFAULT_SEARCH_LOCATION)
  })

  it('conserva un barrio que existe', () => {
    expect(
      normalizeSearchLocation({
        mode: 'neighborhood',
        neighborhoodSlug: 'palermo',
      }),
    ).toEqual({ mode: 'neighborhood', neighborhoodSlug: 'palermo' })
  })

  it('descarta un barrio que ya no está en la taxonomía', () => {
    // Quedaría en un modo que no puede ordenar nada, y nadie entendería por qué
    // la lista dejó de tener sentido.
    expect(
      normalizeSearchLocation({
        mode: 'neighborhood',
        neighborhoodSlug: 'un-barrio-que-no-existe',
      }),
    ).toEqual(DEFAULT_SEARCH_LOCATION)
  })

  it('"sin ubicación" es una opción de primera clase y se conserva', () => {
    // No es el castigo por negar el permiso: quien no quiere compartir dónde
    // está tiene que poder usar la app sin que se lo vuelvan a pedir.
    expect(normalizeSearchLocation({ mode: 'none' })).toEqual({
      mode: 'none',
      neighborhoodSlug: null,
    })
  })
})

describe('el rótulo del encabezado', () => {
  const gps: SearchLocation = { mode: 'device', neighborhoodSlug: null }

  it('con GPS y barrio resuelto, nombra el barrio', () => {
    expect(label(gps, 'palermo', true, traducir)).toBe('Cerca de Palermo')
  })

  it('con GPS sin barrio resuelto, no inventa uno', () => {
    // El GPS da coordenadas, no siempre un barrio conocido.
    expect(label(gps, null, true, traducir)).toBe('Cerca de donde estás')
  })

  it('con GPS elegido pero sin permiso, dice la verdad', () => {
    // El caso que más importa: no se sabe dónde está, así que no se dice
    // "cerca de donde estás".
    expect(label(gps, null, false, traducir)).toBe('Sin ubicación')
  })

  it('con un barrio elegido, lo nombra', () => {
    expect(
      label(
        { mode: 'neighborhood', neighborhoodSlug: 'boedo' },
        null,
        false,
        traducir,
      ),
    ).toBe('Cerca de Boedo')
  })

  it('sin ubicación, lo dice', () => {
    expect(
      label(
        { mode: 'none', neighborhoodSlug: null },
        'palermo',
        true,
        traducir,
      ),
    ).toBe('Sin ubicación')
  })
})

function renderConProviders(node: React.ReactElement) {
  render(
    <ThemeProvider>
      <MotionProvider>
        <I18nProvider locale="es-AR">{node}</I18nProvider>
      </MotionProvider>
    </ThemeProvider>,
  )
}

describe('el encabezado', () => {
  it('el control de cambiar lleva al selector', () => {
    const onChange = jest.fn()
    renderConProviders(
      <SearchLocationHeader
        value={DEFAULT_SEARCH_LOCATION}
        deviceNeighborhoodSlug="palermo"
        deviceReady
        onChange={onChange}
      />,
    )

    fireEvent.press(screen.getByTestId('search-location-change'))
    expect(onChange).toHaveBeenCalled()
  })
})

describe('el selector', () => {
  function renderSelector(
    value: SearchLocation = DEFAULT_SEARCH_LOCATION,
    onChange = jest.fn(),
    deviceStatus: 'granted' | 'denied' | 'unrequested' = 'granted',
    onRequestDevice = jest.fn(),
  ) {
    renderConProviders(
      <SearchLocationScreen
        value={value}
        onChange={onChange}
        onClose={jest.fn()}
        deviceStatus={deviceStatus}
        onRequestDevice={onRequestDevice}
      />,
    )
    return { onChange, onRequestDevice }
  }

  it('dice que ordena y no esconde, arriba de todo', () => {
    renderSelector()
    // Es lo que más se malinterpreta de un control de ubicación: en casi todas
    // las apps, elegir un lugar filtra.
    expect(screen.getByText(/Nunca esconde a nadie/i)).toBeTruthy()
  })

  it('cada opción dice qué le hace a la lista', () => {
    renderSelector()
    expect(screen.getByText(/distancia real/i)).toBeTruthy()
    expect(screen.getByText(/no se ordena por cercanía/i)).toBeTruthy()
    // Y la que más se podría malinterpretar: elegir un barrio no da kilómetros.
    expect(
      screen.getByText(/no se puede decir a cuántos kilómetros/i),
    ).toBeTruthy()
  })

  it('elegir un barrio lo devuelve con su slug', () => {
    const { onChange } = renderSelector()
    fireEvent.press(screen.getByTestId('search-location-palermo'))
    expect(onChange).toHaveBeenCalledWith({
      mode: 'neighborhood',
      neighborhoodSlug: 'palermo',
    })
  })

  it('elegir el GPS sin permiso lo pide', () => {
    const { onChange, onRequestDevice } = renderSelector(
      { mode: 'none', neighborhoodSlug: null },
      jest.fn(),
      'unrequested',
    )
    fireEvent.press(screen.getByTestId('search-location-device'))
    expect(onRequestDevice).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith({
      mode: 'device',
      neighborhoodSlug: null,
    })
  })

  it('con el permiso denegado lo dice, en vez de fallar callado', () => {
    renderSelector(DEFAULT_SEARCH_LOCATION, jest.fn(), 'denied')
    expect(screen.getByText(/permiso está denegado/i)).toBeTruthy()
  })

  it('el buscador filtra sin acentos', () => {
    renderSelector()
    fireEvent.changeText(screen.getByTestId('search-location-query'), 'nunez')
    // Nadie escribe "Núñez" con la tilde justa.
    expect(screen.getByTestId('search-location-nunez')).toBeTruthy()
    expect(screen.queryByTestId('search-location-palermo')).toBeNull()
  })

  it('sin resultados lo dice', () => {
    renderSelector()
    fireEvent.changeText(
      screen.getByTestId('search-location-query'),
      'zzzzzzzz',
    )
    expect(screen.getByTestId('search-location-empty')).toBeTruthy()
  })

  it('lo elegido se puede saber sin ver el punto', () => {
    // Una lista de cincuenta opciones donde un lector de pantalla no puede
    // saber cuál está activa no es una lista, es una adivinanza.
    renderSelector({ mode: 'neighborhood', neighborhoodSlug: 'boedo' })
    expect(
      screen.getByTestId('search-location-boedo').props.accessibilityState
        .selected,
    ).toBe(true)
    expect(
      screen.getByTestId('search-location-palermo').props.accessibilityState
        .selected,
    ).toBe(false)
  })
})
