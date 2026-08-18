import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { Professional } from '@mesh/domain'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ContactScreen } from './ContactScreen.tsx'

jest.mock('@/features/profile/queries.ts', () => ({ fetchProfile: jest.fn() }))

import { fetchProfile } from '@/features/profile/queries.ts'
const fetchMock = fetchProfile as jest.MockedFunction<typeof fetchProfile>

function professional(overrides: Partial<Professional> = {}): Professional {
  return {
    id: 'p1',
    slug: 'aguja-fina',
    categorySlug: 'tattoo',
    displayName: '[Fixture] Aguja Fina',
    bio: null,
    location: null,
    travels: false,
    styles: [],
    price: null,
    availability: null,
    instagramHandle: null,
    whatsappE164: null,
    isFixture: true,
    ...overrides,
  }
}

function render(overrides: Partial<Professional> = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const openUrl = jest.fn().mockResolvedValue(true)
  const copyToClipboard = jest.fn().mockResolvedValue(true)
  fetchMock.mockResolvedValue({
    professional: professional(overrides),
    pieces: [],
  })

  renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <ContactScreen
          slug="aguja-fina"
          onBack={jest.fn()}
          openUrl={openUrl}
          copyToClipboard={copyToClipboard}
        />
      </I18nProvider>
    </QueryClientProvider>,
  )
  return { openUrl, copyToClipboard }
}

beforeEach(() => jest.clearAllMocks())

describe('ContactScreen', () => {
  it('cambia el CTA en vez de fingir un canal', async () => {
    // Un perfil sin contacto es un callejón, y decirlo es más útil que un botón
    // que no hace nada.
    render()
    await waitFor(() =>
      expect(screen.getByTestId('contact-no-channel')).toBeTruthy(),
    )
    expect(screen.queryByTestId('contact-whatsapp')).toBeNull()
    expect(screen.queryByTestId('contact-instagram')).toBeNull()
  })

  it('muestra el mensaje editable antes de mandarlo', async () => {
    render({ whatsappE164: '+5491155551234' })
    await waitFor(() =>
      expect(screen.getByTestId('contact-content')).toBeTruthy(),
    )

    const field = screen.getByTestId('contact-message')
    expect(field.props.value).toContain('Hola, te escribo por un tatuaje.')

    fireEvent.changeText(field, 'Mi propio mensaje')
    expect(screen.getByTestId('contact-message').props.value).toBe(
      'Mi propio mensaje',
    )
  })

  it('manda por WhatsApp lo que quedó escrito, no la plantilla', async () => {
    const { openUrl } = render({ whatsappE164: '+54 9 11 5555-1234' })
    await waitFor(() =>
      expect(screen.getByTestId('contact-content')).toBeTruthy(),
    )

    fireEvent.changeText(
      screen.getByTestId('contact-message'),
      'Mi propio mensaje',
    )
    fireEvent.press(screen.getByTestId('contact-whatsapp'))

    expect(openUrl).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/5491155551234?text='),
    )
    expect(openUrl.mock.calls[0]?.[0]).toContain('Mi%20propio%20mensaje')
  })

  it('con Instagram copia primero y abre después', async () => {
    // Si abriera primero, la app pasa a segundo plano y el portapapeles puede
    // no llegar a escribirse.
    const { openUrl, copyToClipboard } = render({ instagramHandle: 'aguja' })
    await waitFor(() =>
      expect(screen.getByTestId('contact-content')).toBeTruthy(),
    )

    fireEvent.press(screen.getByTestId('contact-instagram'))
    expect(copyToClipboard).toHaveBeenCalled()
    expect(openUrl).toHaveBeenCalledWith('https://instagram.com/aguja')
    // Se espera el aviso: además de evitar el warning de act(), verifica que la
    // persona se entere de que el mensaje quedó copiado.
    await waitFor(() =>
      expect(screen.getByTestId('contact-copied')).toBeTruthy(),
    )
    expect(copyToClipboard.mock.invocationCallOrder[0]).toBeLessThan(
      openUrl.mock.invocationCallOrder[0] as number,
    )
  })

  it('avisa de antemano que Instagram no lleva el mensaje escrito', async () => {
    render({ instagramHandle: 'aguja' })
    await waitFor(() =>
      expect(screen.getByTestId('contact-content')).toBeTruthy(),
    )
    expect(screen.getByText(/no deja mandar el mensaje escrito/i)).toBeTruthy()
  })

  it('el mensaje no menciona a MESH ni al artista', async () => {
    // Sonaría como una plataforma con la que el artista tiene una relación que
    // no tiene. Ver el test golden de packages/domain.
    render({ whatsappE164: '+5491155551234' })
    await waitFor(() =>
      expect(screen.getByTestId('contact-content')).toBeTruthy(),
    )

    const value = screen.getByTestId('contact-message').props.value as string
    expect(value).not.toContain('MESH')
    expect(value).not.toContain('Aguja Fina')
  })
})
