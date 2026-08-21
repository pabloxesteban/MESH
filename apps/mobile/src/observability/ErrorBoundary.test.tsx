/**
 * La red que evita la pantalla en blanco.
 *
 * Sin esto, un error de render deja a la persona mirando el fondo del tema, sin
 * nada que tocar y sin forma de volver — y nosotros sin enterarnos.
 */

import { fireEvent, screen } from '@testing-library/react-native'
import { useState } from 'react'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'

import { ErrorBoundary } from './ErrorBoundary.tsx'
import { reportError } from './report.ts'

jest.mock('./report.ts', () => ({ reportError: jest.fn() }))

const reportar = reportError as jest.Mock

/** Explota en el primer render y anda en el segundo, como un fallo de datos. */
function Inestable({ falla }: { falla: boolean }) {
  if (falla) throw new Error('se rompió al dibujar')
  return null
}

function Envuelto() {
  const [falla, setFalla] = useState(true)
  return (
    <>
      <ErrorBoundary surface="prueba">
        <Inestable falla={falla} />
      </ErrorBoundary>
      {/* Arreglar el dato desde afuera, como haría un refetch. */}
      <TestButton onPress={() => setFalla(false)} />
    </>
  )
}

function TestButton({ onPress }: { onPress: () => void }) {
  const { Pressable, Text } = jest.requireActual('react-native') as {
    Pressable: React.ComponentType<Record<string, unknown>>
    Text: React.ComponentType<Record<string, unknown>>
  }
  return (
    <Pressable testID="arreglar" onPress={onPress}>
      <Text>arreglar</Text>
    </Pressable>
  )
}

function render(element: React.ReactElement) {
  return renderWithProviders(
    <I18nProvider locale="es-AR">{element}</I18nProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  // React escribe el error en consola aunque lo atrapemos. No es una falla del
  // test y ensucia la salida hasta hacerla ilegible.
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('muestra una salida en vez de una pantalla en blanco', () => {
    render(
      <ErrorBoundary surface="prueba">
        <Inestable falla />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('error-boundary')).toBeTruthy()
  })

  it('reporta el error como fatal, con la superficie donde estaba puesta', () => {
    render(
      <ErrorBoundary surface="perfil">
        <Inestable falla />
      </ErrorBoundary>,
    )

    expect(reportar).toHaveBeenCalledWith(expect.any(Error), {
      surface: 'perfil',
      fatal: true,
    })
  })

  it('reintentar vuelve a montar: si el error era de datos, se arregla solo', () => {
    render(<Envuelto />)
    expect(screen.getByTestId('error-boundary')).toBeTruthy()

    fireEvent.press(screen.getByTestId('arreglar'))
    // El botón de reintentar del `ErrorState`, por su etiqueta: el design
    // system no le pone testID a las acciones.
    fireEvent.press(screen.getByText('Reintentar'))

    expect(screen.queryByTestId('error-boundary')).toBeNull()
  })
})
