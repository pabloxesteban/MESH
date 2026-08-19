/**
 * Tests del modo artista.
 *
 * Lo que NO se testea acá: si un artista puede escribir en el perfil de otro.
 * Eso lo decide RLS, no el cliente, y está en
 * supabase/tests/25_artist_ownership.sql. Un test de componente que "verifica"
 * autorización solo verifica que el cliente se porta bien cuando quiere.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { StudioScreen } from './StudioScreen.tsx'
import { readDeviceGps } from './gps.ts'
import {
  addPiece,
  claimProfessional,
  createOwnProfessional,
  fetchOwnedPieces,
  fetchOwnedProfessional,
  setOwnStyles,
  setStudioLocation,
} from './queries.ts'
import { weightsFor, MAX_STYLES_PER_PIECE } from './weights.ts'

jest.mock('./queries.ts')
jest.mock('./gps.ts')
jest.mock('./upload.ts', () => ({
  uploadPortfolioPiece: jest.fn().mockResolvedValue({
    mediaId: 'm1',
    path: 'briza/m1/lg.jpg',
    byteSize: 1000,
  }),
}))
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest
    .fn()
    .mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///x.jpg' }] }),
}))

const fetchProfileMock = fetchOwnedProfessional as jest.Mock
const fetchPiecesMock = fetchOwnedPieces as jest.Mock
const claimMock = claimProfessional as jest.Mock
const addPieceMock = addPiece as jest.Mock
const setLocationMock = setStudioLocation as jest.Mock
const readGpsMock = readDeviceGps as jest.Mock
const createMock = createOwnProfessional as jest.Mock
const setStylesMock = setOwnStyles as jest.Mock

/** Un perfil propio ya cargado. Los tests que lo pisan solo cambian lo suyo. */
function ownedProfile(patch: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    slug: 'briza',
    displayName: 'Briza Maldonado',
    isPublished: true,
    studioCoordinates: null,
    styleSlugs: [],
    ...patch,
  }
}

function renderStudio() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <StudioScreen userId="u1" onBack={jest.fn()} />
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchPiecesMock.mockResolvedValue([])
})

describe('weightsFor', () => {
  it('siempre suma 1', () => {
    for (let n = 1; n <= MAX_STYLES_PER_PIECE; n += 1) {
      const slugs = Array.from({ length: n }, (_, i) => `s${i}`)
      const total = weightsFor(slugs).reduce((sum, w) => sum + w.weight, 0)
      // La base exige 1 ± 0,001. Acá se pide exacto: los repartos son
      // constantes escritas a mano, no una división.
      expect(total).toBe(1)
    }
  })

  it('el primero pesa más que el segundo', () => {
    const [primero, segundo] = weightsFor(['a', 'b'])
    expect(primero?.weight).toBeGreaterThan(segundo?.weight ?? 0)
  })

  it('rechaza más estilos de los permitidos', () => {
    expect(() => weightsFor(['a', 'b', 'c', 'd'])).toThrow()
  })
})

describe('StudioScreen', () => {
  it('sin perfil ofrece crear el propio y también canjear un código', async () => {
    fetchProfileMock.mockResolvedValue(null)
    renderStudio()
    await waitFor(() => expect(screen.getByTestId('studio-create')).toBeTruthy())
    expect(screen.getByTestId('studio-claim')).toBeTruthy()
  })

  it('un código inválido no muestra el error crudo de la base', async () => {
    fetchProfileMock.mockResolvedValue(null)
    claimMock.mockRejectedValue(
      new Error('el código no es válido (P0002) at claim_professional'),
    )
    renderStudio()
    await waitFor(() => expect(screen.getByTestId('studio-claim')).toBeTruthy())

    fireEvent.changeText(screen.getByTestId('studio-claim-code'), 'BRIZA123')
    fireEvent.press(screen.getByTestId('studio-claim-submit'))

    await waitFor(() => expect(claimMock).toHaveBeenCalledWith('BRIZA123'))
    await waitFor(() =>
      expect(screen.getByText(/no es válido o ya se usó/i)).toBeTruthy(),
    )
    expect(screen.queryByText(/P0002/)).toBeNull()
    expect(screen.queryByText(/claim_professional/)).toBeNull()
  })

  it('normaliza el código a mayúsculas y sin símbolos', async () => {
    fetchProfileMock.mockResolvedValue(null)
    renderStudio()
    await waitFor(() => expect(screen.getByTestId('studio-claim')).toBeTruthy())

    const input = screen.getByTestId('studio-claim-code')
    fireEvent.changeText(input, 'briza-123')
    expect(input.props.value).toBe('BRIZA123')
  })

  describe('alta propia', () => {
    beforeEach(() => {
      fetchProfileMock.mockResolvedValue(null)
    })

    it('no deja crear sin nombre ni sin un canal de contacto', async () => {
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-create')).toBeTruthy(),
      )

      const submit = screen.getByTestId('studio-create-submit')
      expect(submit.props.accessibilityState.disabled).toBe(true)

      // Con nombre pero sin contacto sigue bloqueado: la base rechaza un perfil
      // publicado al que no se le puede escribir, y enterarse recién al tocar
      // sería enterarse tarde.
      fireEvent.changeText(
        screen.getByTestId('studio-create-name'),
        'Pablo Esteban',
      )
      expect(submit.props.accessibilityState.disabled).toBe(true)

      fireEvent.changeText(
        screen.getByTestId('studio-create-instagram'),
        'pablo.tattoo',
      )
      expect(submit.props.accessibilityState.disabled).toBe(false)
    })

    it('manda el nombre y el contacto, y saca la arroba del handle', async () => {
      createMock.mockResolvedValue('pablo-esteban')
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-create')).toBeTruthy(),
      )

      fireEvent.changeText(
        screen.getByTestId('studio-create-name'),
        'Pablo Esteban',
      )
      fireEvent.changeText(
        screen.getByTestId('studio-create-instagram'),
        '@pablo.tattoo',
      )
      fireEvent.press(screen.getByTestId('studio-create-submit'))

      await waitFor(() => expect(createMock).toHaveBeenCalled())
      expect(createMock.mock.calls[0]?.[0]).toEqual({
        displayName: 'Pablo Esteban',
        instagram: 'pablo.tattoo',
      })
    })

    it('un error de la base no se muestra crudo', async () => {
      createMock.mockRejectedValue(
        new Error('duplicate key value violates unique constraint (23505)'),
      )
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-create')).toBeTruthy(),
      )

      fireEvent.changeText(screen.getByTestId('studio-create-name'), 'Pablo')
      fireEvent.changeText(
        screen.getByTestId('studio-create-whatsapp'),
        '+5491100000000',
      )
      fireEvent.press(screen.getByTestId('studio-create-submit'))

      await waitFor(() =>
        expect(screen.getByTestId('studio-create-error')).toBeTruthy(),
      )
      expect(screen.queryByText(/23505/)).toBeNull()
      expect(screen.queryByText(/unique constraint/)).toBeNull()
    })
  })

  describe('estilos propios', () => {
    it('sin cambios no muestra el botón de guardar', async () => {
      fetchProfileMock.mockResolvedValue(
        ownedProfile({ styleSlugs: ['fine-line'] }),
      )
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-own-styles')).toBeTruthy(),
      )
      // Un botón siempre visible sobre algo ya guardado invita a tocarlo por
      // las dudas, y cada toque es una escritura.
      expect(screen.queryByTestId('studio-styles-save')).toBeNull()
    })

    it('guarda los estilos en el orden en que se tocaron', async () => {
      fetchProfileMock.mockResolvedValue(ownedProfile())
      setStylesMock.mockResolvedValue(undefined)
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-own-styles')).toBeTruthy(),
      )

      fireEvent.press(screen.getByTestId('studio-own-style-blackwork'))
      fireEvent.press(screen.getByTestId('studio-own-style-fine-line'))
      fireEvent.press(screen.getByTestId('studio-styles-save'))

      await waitFor(() => expect(setStylesMock).toHaveBeenCalled())
      expect(setStylesMock.mock.calls[0]?.[0]).toEqual([
        'blackwork',
        'fine-line',
      ])
    })

    it('los estilos de la pieza son otro selector, y no se pisan', async () => {
      fetchProfileMock.mockResolvedValue(ownedProfile())
      addPieceMock.mockResolvedValue('pieza-1')
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-content')).toBeTruthy(),
      )

      fireEvent.press(screen.getByTestId('studio-own-style-blackwork'))
      fireEvent.press(screen.getByTestId('studio-style-lettering'))
      fireEvent.press(screen.getByTestId('studio-pick'))

      await waitFor(() => expect(addPieceMock).toHaveBeenCalled())
      expect(addPieceMock.mock.calls[0]?.[0]).toMatchObject({
        styleSlugsInOrder: ['lettering'],
      })
      expect(setStylesMock).not.toHaveBeenCalled()
    })
  })

  it('no deja subir sin elegir al menos un estilo', async () => {
    fetchProfileMock.mockResolvedValue(ownedProfile())
    renderStudio()
    await waitFor(() =>
      expect(screen.getByTestId('studio-content')).toBeTruthy(),
    )
    // Una pieza sin estilos no aparece en el mazo: el feed la trae, pero no
    // aporta nada al gusto de nadie. Subirla sería trabajo perdido.
    expect(
      screen.getByTestId('studio-pick').props.accessibilityState.disabled,
    ).toBe(true)
  })

  it('sube y etiqueta en el orden en que se tocaron los estilos', async () => {
    fetchProfileMock.mockResolvedValue(ownedProfile())
    addPieceMock.mockResolvedValue('pieza-1')
    renderStudio()
    await waitFor(() =>
      expect(screen.getByTestId('studio-content')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('studio-style-lettering'))
    fireEvent.press(screen.getByTestId('studio-style-traditional'))
    fireEvent.press(screen.getByTestId('studio-pick'))

    await waitFor(() => expect(addPieceMock).toHaveBeenCalled())
    expect(addPieceMock.mock.calls[0]?.[0]).toMatchObject({
      professionalId: 'p1',
      mediaId: 'm1',
      // El orden es información: lettering se tocó primero, así que pesa más.
      styleSlugsInOrder: ['lettering', 'traditional'],
    })
  })

  it('muestra las piezas ya subidas con sus estilos', async () => {
    fetchProfileMock.mockResolvedValue(ownedProfile())
    fetchPiecesMock.mockResolvedValue([
      {
        id: 'pieza-1',
        mediaPath: 'briza/m1/lg.jpg',
        isFeatured: true,
        styleSlugs: ['traditional', 'lettering'],
      },
    ])
    renderStudio()
    await waitFor(() =>
      expect(screen.getByTestId('studio-pieces')).toBeTruthy(),
    )
    // Acotado a la pieza: "Tradicional" también está arriba, en el selector de
    // estilos, y un `getByText` suelto encontraría los dos.
    const pieza = within(screen.getByTestId('studio-piece-pieza-1'))
    expect(pieza.getByText('Tradicional')).toBeTruthy()
    expect(pieza.getByText('Lettering')).toBeTruthy()
  })

  describe('ubicación del estudio', () => {
    beforeEach(() => {
      fetchProfileMock.mockResolvedValue(ownedProfile())
    })

    it('sin permiso muestra el error, sin pasar a confirmación', async () => {
      readGpsMock.mockResolvedValue({
        granted: false,
        coordinates: null,
        neighborhoodSlug: null,
      })
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-content')).toBeTruthy(),
      )

      fireEvent.press(screen.getByTestId('studio-location-request'))

      await waitFor(() =>
        expect(screen.getByTestId('studio-location-error')).toBeTruthy(),
      )
      expect(screen.queryByTestId('studio-location-confirm')).toBeNull()
      expect(setLocationMock).not.toHaveBeenCalled()
    })

    it('con permiso pide confirmación antes de publicar, y cancelar no publica nada', async () => {
      readGpsMock.mockResolvedValue({
        granted: true,
        coordinates: { lat: -34.5875, lng: -58.4371 },
        neighborhoodSlug: 'palermo',
      })
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-content')).toBeTruthy(),
      )

      fireEvent.press(screen.getByTestId('studio-location-request'))
      await waitFor(() =>
        expect(screen.getByTestId('studio-location-confirm')).toBeTruthy(),
      )

      fireEvent.press(screen.getByTestId('studio-location-cancel'))
      await waitFor(() =>
        expect(screen.getByTestId('studio-location-request')).toBeTruthy(),
      )
      expect(setLocationMock).not.toHaveBeenCalled()
    })

    it('confirmar publica exactamente las coordenadas leídas del GPS', async () => {
      readGpsMock.mockResolvedValue({
        granted: true,
        coordinates: { lat: -34.5875, lng: -58.4371 },
        neighborhoodSlug: 'palermo',
      })
      setLocationMock.mockResolvedValue(undefined)
      renderStudio()
      await waitFor(() =>
        expect(screen.getByTestId('studio-content')).toBeTruthy(),
      )

      fireEvent.press(screen.getByTestId('studio-location-request'))
      await waitFor(() =>
        expect(screen.getByTestId('studio-location-confirm')).toBeTruthy(),
      )
      fireEvent.press(screen.getByTestId('studio-location-confirm-submit'))

      await waitFor(() =>
        expect(setLocationMock).toHaveBeenCalledWith(
          { lat: -34.5875, lng: -58.4371 },
          // El barrio va junto con las coordenadas: es lo que puntúa el
          // componente de Ubicación del matching, y sin esto un artista que se
          // dio de alta solo nunca lo tendría.
          'palermo',
        ),
      )
    })
  })
})
