/**
 * Reseñas, del lado de la pantalla.
 *
 * Lo que se testea acá es lo que sostiene que una reseña sea evidencia:
 *
 * 1. **Sin reseñas no se dibuja una puntuación.** Cinco estrellas vacías se
 *    leen como un cero, y un promedio sobre cero reseñas es inventado.
 * 2. **El botón de reseñar aparece solo donde corresponde**: un turno que ya
 *    pasó, del lado de quien se tatuó. Y el de cancelar desaparece, porque la
 *    base rechaza cancelar el pasado.
 * 3. **Antes de subir una foto se avisa que se publica.** Después de subirla ya
 *    no sirve avisar.
 *
 * El candado de verdad —quién puede escribir una reseña— no está acá: está en
 * la política de `reviews` y se testea en `supabase/tests/51_reviews.sql`. Un
 * test de pantalla no puede probar autorización.
 */

import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { AppointmentCard } from '@/features/scheduling/AppointmentCard.tsx'

import { LeaveReview } from './LeaveReview.tsx'
import { ReviewList } from './ReviewList.tsx'
import { createReview, fetchReviewSummary, fetchReviews } from './queries.ts'

jest.mock('./queries.ts', () => ({
  fetchReviews: jest.fn(),
  fetchReviewSummary: jest.fn(),
  fetchReviewableAppointments: jest.fn().mockResolvedValue([]),
  createReview: jest.fn(),
  reviewMediaUrl: (path: string) => `https://ejemplo.test/${path}`,
}))

jest.mock('./upload.ts', () => ({
  uploadReviewPhoto: jest.fn(),
}))

jest.mock('@/features/scheduling/queries.ts', () => ({
  ...jest.requireActual('@/features/scheduling/queries.ts'),
  cancelAppointment: jest.fn(),
}))

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}))

const leerReviews = fetchReviews as jest.Mock
const leerResumen = fetchReviewSummary as jest.Mock
const escribir = createReview as jest.Mock

const HACE_UNA_SEMANA = (() => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d
})()

const EN_UNA_SEMANA = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d
})()

beforeEach(() => {
  jest.clearAllMocks()
  leerReviews.mockResolvedValue([])
  leerResumen.mockResolvedValue({ count: 0, average: null })
  escribir.mockResolvedValue(undefined)
})

function render(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">{element}</I18nProvider>
    </QueryClientProvider>,
  )
}

function turno(ends: Date) {
  const starts = new Date(ends)
  starts.setHours(starts.getHours() - 2)
  return {
    id: 'a1',
    startsAt: starts.toISOString(),
    endsAt: ends.toISOString(),
    status: 'scheduled' as const,
    note: null,
    professionalId: 'p1',
    conversationId: 'c1',
  }
}

describe('las reseñas en el perfil', () => {
  it('sin ninguna, lo dice con palabras y no dibuja estrellas', async () => {
    render(<ReviewList professionalId="p1" />)
    await waitFor(() =>
      expect(screen.getByTestId('reviews-empty')).toBeTruthy(),
    )

    // Lo que NO tiene que estar: una puntuación que nadie dio.
    expect(screen.queryByTestId('reviews-average-stars')).toBeNull()
    expect(screen.queryByTestId('reviews-average')).toBeNull()
  })

  it('con reseñas muestra el promedio medido y la fecha del turno', async () => {
    leerResumen.mockResolvedValue({ count: 2, average: 4.5 })
    leerReviews.mockResolvedValue([
      {
        id: 'r1',
        rating: 5,
        body: 'Escuchó lo que quería y lo mejoró',
        mediaPath: null,
        appointmentEndsAt: '2026-08-12T19:00:00Z',
        createdAt: '2026-08-13T10:00:00Z',
        edited: false,
      },
    ])

    render(<ReviewList professionalId="p1" />)
    await waitFor(() => expect(screen.getByTestId('reviews')).toBeTruthy())

    // Con coma, como se escribe acá.
    expect(screen.getByText('4,5 de 5 · 2 reseñas')).toBeTruthy()
    expect(screen.getByText('Escuchó lo que quería y lo mejoró')).toBeTruthy()
    // La fecha del turno, que es lo que da garantía.
    expect(screen.getByText(/Turno del 12 de agosto de 2026/)).toBeTruthy()
  })

  it('una reseña editada lo dice', async () => {
    leerResumen.mockResolvedValue({ count: 1, average: 3 })
    leerReviews.mockResolvedValue([
      {
        id: 'r1',
        rating: 3,
        body: 'Lo pensé mejor',
        mediaPath: null,
        appointmentEndsAt: '2026-08-12T19:00:00Z',
        createdAt: '2026-08-13T10:00:00Z',
        edited: true,
      },
    ])

    render(<ReviewList professionalId="p1" />)
    await waitFor(() => expect(screen.getByTestId('reviews')).toBeTruthy())
    expect(screen.getByText('Editada')).toBeTruthy()
  })
})

describe('el botón de reseñar', () => {
  it('no aparece en un turno que todavía no pasó', () => {
    render(
      <AppointmentCard
        appointment={turno(EN_UNA_SEMANA)}
        reviewable={false}
        userId="u1"
        testID="appointment-a1"
      />,
    )

    expect(screen.queryByTestId('appointment-review')).toBeNull()
    // Ese sí se puede cancelar: todavía no pasó.
    expect(screen.getByTestId('appointment-cancel')).toBeTruthy()
  })

  it('en uno que ya pasó no se ofrece cancelar', () => {
    render(
      <AppointmentCard
        appointment={turno(HACE_UNA_SEMANA)}
        reviewable={false}
        userId="u1"
        testID="appointment-a1"
      />,
    )

    // La base lo rechaza —cancelar el pasado sería borrar una reseña— así que
    // la pantalla no lo ofrece.
    expect(screen.queryByTestId('appointment-cancel')).toBeNull()
  })

  it('aparece en uno que ya pasó y todavía no se reseñó', () => {
    render(
      <AppointmentCard
        appointment={turno(HACE_UNA_SEMANA)}
        reviewable
        userId="u1"
        testID="appointment-a1"
      />,
    )
    expect(screen.getByTestId('appointment-review')).toBeTruthy()
  })

  it('no aparece del lado del artista, que no tiene a quién reseñar', () => {
    render(
      <AppointmentCard
        appointment={turno(HACE_UNA_SEMANA)}
        reviewable
        userId={null}
        testID="appointment-a1"
      />,
    )
    expect(screen.queryByTestId('appointment-review')).toBeNull()
  })
})

describe('dejar una reseña', () => {
  function montar() {
    return render(
      <LeaveReview
        appointmentId="a1"
        professionalId="p1"
        userId="u1"
        onDone={jest.fn()}
        onCancel={jest.fn()}
      />,
    )
  }

  it('sin estrellas no se puede publicar', () => {
    montar()
    expect(
      screen.getByTestId('review-submit').props['accessibilityState'],
    ).toMatchObject({ disabled: true })
  })

  it('avisa que la foto se publica ANTES de subirla', () => {
    montar()
    expect(
      screen.getByText(
        'La foto se va a ver en el perfil del artista, junto con tu reseña.',
      ),
    ).toBeTruthy()
  })

  it('con estrellas y comentario, publica lo que se escribió', async () => {
    montar()

    fireEvent.press(screen.getByTestId('star-4'))
    fireEvent.changeText(screen.getByTestId('review-body'), '  Volvería  ')
    fireEvent.press(screen.getByTestId('review-submit'))

    await waitFor(() =>
      expect(escribir).toHaveBeenCalledWith({
        appointmentId: 'a1',
        professionalId: 'p1',
        userId: 'u1',
        rating: 4,
        // Recortado: un comentario que es solo espacios no es un comentario.
        body: 'Volvería',
        mediaId: null,
      }),
    )
  })

  it('sin comentario manda null, no un string vacío', async () => {
    montar()

    fireEvent.press(screen.getByTestId('star-5'))
    fireEvent.press(screen.getByTestId('review-submit'))

    await waitFor(() =>
      expect(escribir).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 5, body: null }),
      ),
    )
  })

  it('si la publicación falla, lo dice y no se pierde lo escrito', async () => {
    escribir.mockRejectedValue(new Error('sin red'))
    montar()

    fireEvent.press(screen.getByTestId('star-2'))
    fireEvent.changeText(
      screen.getByTestId('review-body'),
      'No fue lo que pedí',
    )
    fireEvent.press(screen.getByTestId('review-submit'))

    await waitFor(() =>
      expect(
        screen.getByText('No se pudo publicar la reseña. Probá de nuevo.'),
      ).toBeTruthy(),
    )
    expect(screen.getByTestId('review-body').props['value']).toBe(
      'No fue lo que pedí',
    )
  })
})
