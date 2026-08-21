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

/** La declaración de edad ya hecha. Sin esto, el gate pregunta la edad primero
 *  y ninguno de los tests de intención llega a su pantalla. Ver ADR-025. */
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

describe('la puerta de edad', () => {
  it('pregunta la edad antes que nada, incluso antes de la intención', async () => {
    // El orden importa: es la única pregunta con una consecuencia física del
    // otro lado. Ver ADR-025.
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: null,
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-age')).toBeTruthy(),
    )
    expect(screen.queryByTestId('screen-onboarding-intent')).toBeNull()
  })

  it('no pide la fecha de nacimiento ni ningún documento', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: null,
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-age')).toBeTruthy(),
    )
    // Dos botones y ningún campo: con una fecha de nacimiento tendríamos un
    // dato sensible para calcular un booleano que ya nos dieron.
    expect(screen.getByTestId('age-yes')).toBeTruthy()
    expect(screen.getByTestId('age-no')).toBeTruthy()
    expect(screen.queryByLabelText(/nacimiento/i)).toBeNull()
  })

  it('guarda la declaración cuando dice que sí', async () => {
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: null,
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() => expect(screen.getByTestId('age-yes')).toBeTruthy())
    fireEvent.press(screen.getByTestId('age-yes'))

    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
  })

  it('**no guarda nada cuando dice que no**, y lo deja pasar igual', async () => {
    // Guardar "declaró ser menor" sería armar un registro de menores de edad.
    // Y un muro completo empuja a mentir, que es el resultado contrario.
    fetchMock.mockResolvedValue({
      displayName: null,
      onboardingIntent: null,
      adultConfirmedAt: null,
    })
    renderGate()

    await waitFor(() => expect(screen.getByTestId('age-no')).toBeTruthy())
    fireEvent.press(screen.getByTestId('age-no'))

    expect(screen.getByTestId('age-minor')).toBeTruthy()
    fireEvent.press(screen.getByTestId('age-minor-continue'))

    await waitFor(() =>
      expect(screen.getByTestId('screen-onboarding-intent')).toBeTruthy(),
    )
    expect(confirmMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ adultConfirmedAt: expect.anything() }),
    )
  })
})
