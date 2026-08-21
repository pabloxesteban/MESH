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

// El gate ahora pregunta por la ubicación, así que necesita el módulo del
// sistema. Sin permiso concedido: es el estado de alguien que recién abre.
jest.mock('@/features/location/device.ts', () => ({
  hasDeviceLocationPermission: jest.fn().mockResolvedValue(false),
  currentDeviceLocation: jest.fn().mockResolvedValue(null),
  requestDeviceLocation: jest.fn().mockResolvedValue(null),
}))

import {
  __resetLocationAsked,
  markLocationAsked,
} from '../location/useLocationAsked.ts'
import { __resetSearchLocation } from '../location/useSearchLocation.ts'
import { OnboardingGate } from './OnboardingGate.tsx'
import {
  confirmAdult,
  fetchAccount,
  updateAccount,
} from '../account/queries.ts'

jest.mock('../account/queries.ts', () => ({
  fetchAccount: jest.fn(),
  updateAccount: jest.fn(),
  confirmAdult: jest.fn(),
}))

const fetchMock = fetchAccount as jest.Mock
const updateMock = updateAccount as jest.Mock
const confirmMock = confirmAdult as jest.Mock

/** Una declaración de edad ya hecha, para las cuentas de los fixtures. */
const MAYOR = '2026-08-20T12:00:00.000Z'

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
              <Text role="body" testID="hijos">
                la app
              </Text>
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
  // El store de "ya se preguntó la ubicación" es de módulo, así que se arrastra
  // entre tests si no se limpia: el segundo test vería la respuesta del primero.
  __resetLocationAsked()
  __resetSearchLocation()
  updateMock.mockResolvedValue(undefined)
  confirmMock.mockResolvedValue(undefined)
})

describe('OnboardingGate', () => {
  it('sin respuesta todavía, pregunta antes de mostrar la app', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      adultConfirmedAt: MAYOR,
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
      adultConfirmedAt: MAYOR,
      onboardingIntent: 'looking',
    })
    // Las dos preguntas del onboarding ya contestadas: la intención viene del
    // servidor, la ubicación es local.
    markLocationAsked()
    renderGate()

    await waitFor(() => expect(screen.getByText('la app')).toBeTruthy())
    expect(screen.queryByTestId('screen-onboarding-intent')).toBeNull()
  })

  it('"busco" guarda la intención y deja pasar', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      adultConfirmedAt: MAYOR,
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
      adultConfirmedAt: MAYOR,
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
})

describe('la ubicación se pregunta una sola vez', () => {
  it('viene después de la intención, no antes', async () => {
    // El orden importa: pedir un permiso antes de que alguien entienda para qué
    // es la app es pedirlo a ciegas. Ver ADR-030.
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: null,
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-intent')).toBeTruthy(),
    )
    expect(screen.queryByTestId('screen-onboarding-location')).toBeNull()
  })

  it('con la intención ya elegida, la pregunta', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: 'looking',
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-location')).toBeTruthy(),
    )
    // Las dos salidas son botones: "ahora no" es una respuesta, no un enlace
    // chiquito al pie.
    expect(screen.getByTestId('onboarding-location-allow')).toBeTruthy()
    expect(screen.getByTestId('onboarding-location-skip')).toBeTruthy()
  })

  it('decir que no la deja pasar, y no vuelve a preguntar', async () => {
    // **El test de la decisión.** Antes el pedido volvía en cada sesión hasta
    // que alguien cediera, que es el goteo que la gente aprende a ignorar.
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: 'looking',
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('onboarding-location-skip')).toBeTruthy(),
    )
    fireEvent.press(screen.getByTestId('onboarding-location-skip'))

    await waitFor(() => expect(screen.getByTestId('hijos')).toBeTruthy())
    expect(screen.queryByTestId('screen-onboarding-location')).toBeNull()
  })

  it('la app no pregunta la edad al abrirse', async () => {
    // Se mudó a crear cuenta, y a Perfil para quien no tiene cuenta. La regla
    // la impone `schedule_appointment()`, no una pantalla. Ver ADR-030.
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: null,
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-intent')).toBeTruthy(),
    )
    expect(screen.queryByTestId('screen-onboarding-age')).toBeNull()
    expect(confirmMock).not.toHaveBeenCalled()
  })
})
