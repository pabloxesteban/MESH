import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { confirmAdult } from '@/features/account/queries.ts'

import AgeGateScreen from './edad.tsx'

jest.mock('@/features/account/queries.ts', () => ({
  confirmAdult: jest.fn(),
}))

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  router: { back: (...args: unknown[]) => mockBack(...args) },
}))

const confirmMock = confirmAdult as jest.Mock

function render() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <I18nProvider locale="es-AR">
        <AgeGateScreen />
      </I18nProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  confirmMock.mockResolvedValue(undefined)
})

// ADR-033: la pregunta de edad se mudó de `OnboardingGate` a esta ruta, que
// solo se llega desde el `onDone` de `cuenta/crear.tsx` (con `replace`, no
// `push`). Estos tres casos reemplazan a los que antes vivían en
// `onboarding.test.tsx`, sobre el gate viejo.
describe('/cuenta/edad', () => {
  it('carga con la pregunta, sin pedir fecha de nacimiento', () => {
    render()
    expect(screen.getByTestId('screen-onboarding-age')).toBeTruthy()
    expect(screen.getByTestId('age-yes')).toBeTruthy()
    expect(screen.getByTestId('age-no')).toBeTruthy()
    expect(screen.queryByLabelText(/nacimiento/i)).toBeNull()
  })

  it('confirmar guarda la declaración y vuelve a lo que había antes', async () => {
    render()
    fireEvent.press(screen.getByTestId('age-yes'))

    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1))
  })

  it('"todavía no" no dispara ninguna mutación y vuelve igual', async () => {
    render()
    fireEvent.press(screen.getByTestId('age-no'))

    expect(screen.getByTestId('age-minor')).toBeTruthy()
    fireEvent.press(screen.getByTestId('age-minor-continue'))

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1))
    expect(confirmMock).not.toHaveBeenCalled()
  })
})
