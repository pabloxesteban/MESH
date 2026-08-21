/**
 * Tu pedido, arriba de Inicio.
 *
 * Lo que se testea es lo que hace que la app conteste algo: que después de
 * publicar un pedido haya una pantalla que diga en qué anda. Antes se publicaba
 * y desaparecía.
 *
 * Los cuatro estados, y en cada uno lo que no se puede inventar.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { RequestBand } from './RequestBand.tsx'
import { fetchProjects, setProjectOpen } from '../projects/queries.ts'
import { fetchSearchInterests } from '../demand/interests.ts'

jest.mock('../projects/queries.ts', () => ({
  fetchProjects: jest.fn(),
  setProjectOpen: jest.fn(),
}))
jest.mock('../demand/interests.ts', () => ({
  fetchSearchInterests: jest.fn(),
  dismissInterest: jest.fn(),
}))

const leerPedidos = fetchProjects as jest.Mock
const abrirCerrar = setProjectOpen as jest.Mock
const leerPropuestas = fetchSearchInterests as jest.Mock

const PEDIDO = {
  id: 'p1',
  title: 'Línea fina en el antebrazo',
  description: 'Algo chico, en negro.',
  status: 'active' as const,
  timing: null,
  budget: null,
  locationSlug: null,
  styles: [{ styleSlug: 'fine-line', weight: 1 }],
  referenceCount: 0,
  openToProfessionals: true,
}

const PROPUESTA = {
  interestId: 'i1',
  projectId: 'p1',
  projectTitle: PEDIDO.title,
  professionalId: 'pro-1',
  professionalSlug: 'ana',
  professionalName: 'Ana',
  createdAt: '2026-08-20T10:00:00Z',
  priceMinCents: 8000000,
  priceMaxCents: 12000000,
  priceCurrency: 'ARS',
  sessions: 1,
  note: null,
  sampleMediaPath: null,
}

const acciones = {
  onSearchByPhotos: jest.fn(),
  onSearchByWords: jest.fn(),
  onOpenArtist: jest.fn(),
  onExploreStyle: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  leerPedidos.mockResolvedValue([])
  leerPropuestas.mockResolvedValue([])
  abrirCerrar.mockResolvedValue(undefined)
})

function pantalla(userId: string | null = 'u1') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <RequestBand userId={userId} {...acciones} />
      </I18nProvider>
    </QueryClientProvider>,
  )
}

describe('tu pedido', () => {
  it('sin ninguno, invita con los dos caminos que existen', async () => {
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('request-empty')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('request-empty-photos'))
    expect(acciones.onSearchByPhotos).toHaveBeenCalled()

    fireEvent.press(screen.getByTestId('request-empty-words'))
    expect(acciones.onSearchByWords).toHaveBeenCalled()
  })

  it('sin sesión no pide nada ni muestra nada', () => {
    pantalla(null)

    expect(screen.queryByTestId('request-empty')).toBeNull()
    expect(leerPedidos).not.toHaveBeenCalled()
  })

  it('publicado y sin respuestas, lo dice sin estimar cuándo', async () => {
    leerPedidos.mockResolvedValue([PEDIDO])
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('request-waiting')).toBeTruthy()
    })

    // Innegociable 2: nada de "suelen contestar en 24 horas" ni de un número
    // de tatuadores alcanzados. Lo único que se afirma es lo que ya pasó.
    expect(screen.queryByText(/hora|día|semana/i)).toBeNull()
  })

  it('cerrado, dice que no le llegó a nadie y se puede abrir', async () => {
    leerPedidos.mockResolvedValue([{ ...PEDIDO, openToProfessionals: false }])
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('request-closed')).toBeTruthy()
    })
    expect(screen.queryByTestId('request-waiting')).toBeNull()

    // La vuelta atrás que ADR-014 no tenía: la decisión se tomaba al publicar
    // y quedaba clavada.
    fireEvent.press(screen.getByTestId('request-open'))
    await waitFor(() => {
      expect(abrirCerrar).toHaveBeenCalledWith('p1', true)
    })
  })

  it('con propuestas, muestra las que volvieron y no el cartel de espera', async () => {
    leerPedidos.mockResolvedValue([PEDIDO])
    leerPropuestas.mockResolvedValue([PROPUESTA])
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('interest-list')).toBeTruthy()
    })
    expect(screen.queryByTestId('request-waiting')).toBeNull()
  })

  it('el estilo del pedido lleva a Explorar filtrado', async () => {
    leerPedidos.mockResolvedValue([PEDIDO])
    pantalla()

    await waitFor(() => {
      expect(screen.getByTestId('request-explore-style')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('request-explore-style'))
    expect(acciones.onExploreStyle).toHaveBeenCalledWith('fine-line')
  })
})
