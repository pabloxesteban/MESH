import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import { MotionProvider, ThemeProvider } from '@/design-system/index.ts'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { Text } from '@/design-system/index.ts'

import { OnboardingGate } from './OnboardingGate.tsx'
import { fetchAccount, updateAccount } from '../account/queries.ts'

jest.mock('../account/queries.ts', () => ({
  fetchAccount: jest.fn(),
  updateAccount: jest.fn(),
}))

const fetchMock = fetchAccount as jest.Mock
const updateMock = updateAccount as jest.Mock

function renderGate(onOffering = jest.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MotionProvider>
          <I18nProvider locale="es-AR">
            <OnboardingGate onOffering={onOffering}>
              <Text role="body">la app</Text>
            </OnboardingGate>
          </I18nProvider>
        </MotionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return { onOffering }
}

beforeEach(() => {
  jest.clearAllMocks()
  updateMock.mockResolvedValue(undefined)
})

// ADR-033: la pregunta de edad se mudó de acá a `cuenta/crear.tsx` /
// `cuenta/edad.tsx`. `OnboardingGate` ya no la muestra en ningún caso —ni
// siquiera con `adultConfirmedAt: null`— así que el arranque frío va directo
// a "busco o ofrezco". Esa cobertura vive ahora en `edad.test.tsx`.
describe('OnboardingGate', () => {
  it('sin respuesta todavía, pregunta antes de mostrar la app', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      adultConfirmedAt: null,
      onboardingIntent: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-intent')).toBeTruthy(),
    )
    expect(screen.queryByText('la app')).toBeNull()
  })

  it('con respuesta, no vuelve a preguntar', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      adultConfirmedAt: null,
      onboardingIntent: 'looking',
    })
    renderGate()

    await waitFor(() => expect(screen.getByText('la app')).toBeTruthy())
    expect(screen.queryByTestId('screen-onboarding-intent')).toBeNull()
  })

  it('"busco" guarda la intención y deja pasar', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      adultConfirmedAt: null,
      onboardingIntent: null,
    })
    const { onOffering } = renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-looking')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('onboarding-looking'))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ onboardingIntent: 'looking' }),
    )
    // "Busco" no manda a ningún lado: la app abre donde abre siempre.
    expect(onOffering).not.toHaveBeenCalled()
  })

  it('"ofrezco" lleva al canje del código, no da de alta a nadie', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      adultConfirmedAt: null,
      onboardingIntent: null,
    })
    const { onOffering } = renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-offering')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('onboarding-offering'))

    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ onboardingIntent: 'offering' }),
    )
    await waitFor(() => expect(onOffering).toHaveBeenCalled())
  })

  it('un error no deja la app en blanco: ofrece reintentar', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-error')).toBeTruthy(),
    )
  })

  it('nunca muestra la pregunta de edad, ni siquiera sin declarar', async () => {
    // Antes de ADR-033 esto disparaba `screen-onboarding-age`. Ahora la
    // pregunta vive en `cuenta/edad.tsx` y acá no se monta nunca.
    fetchMock.mockResolvedValue({
      displayName: null,
      adultConfirmedAt: null,
      onboardingIntent: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-intent')).toBeTruthy(),
    )
    expect(screen.queryByTestId('screen-onboarding-age')).toBeNull()
  })
})
