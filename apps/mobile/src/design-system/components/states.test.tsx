/**
 * Los cuatro estados.
 *
 * Todo componente que renderiza datos remotos se testea para carga, vacío,
 * error + reintentar, y éxito. Es mecánico, aburrido, y es lo que más
 * confiablemente se pudre — por eso está automatizado y no en una checklist.
 */

import { fireEvent, screen } from '@testing-library/react-native'
import { BOTH_THEMES, renderWithProviders } from '../test-utils.tsx'
import { EmptyState } from './EmptyState.tsx'
import { ErrorState } from './ErrorState.tsx'
import { Skeleton } from './Skeleton.tsx'
import { Toast } from './Toast.tsx'

describe.each(BOTH_THEMES)('EmptyState · tema %s', (_name, theme) => {
  it('dice qué es cierto y ofrece una salida', () => {
    const onPress = jest.fn()
    renderWithProviders(
      <EmptyState
        title="Todavía no encontramos a alguien que encaje"
        body="Seguí explorando y vamos a ir entendiendo mejor tu gusto."
        action={{ label: 'Seguir explorando', onPress }}
      />,
      { theme },
    )

    expect(
      screen.getByText('Todavía no encontramos a alguien que encaje'),
    ).toBeTruthy()

    fireEvent.press(screen.getByText('Seguir explorando'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('admite una segunda salida', () => {
    const secondary = jest.fn()
    renderWithProviders(
      <EmptyState
        title="Sin proyectos"
        action={{ label: 'Crear proyecto', onPress: jest.fn() }}
        secondaryAction={{ label: 'Ver artistas', onPress: secondary }}
      />,
      { theme },
    )

    fireEvent.press(screen.getByText('Ver artistas'))
    expect(secondary).toHaveBeenCalledTimes(1)
  })
})

describe.each(BOTH_THEMES)('ErrorState · tema %s', (_name, theme) => {
  it('muestra la causa y reintenta', () => {
    const onRetry = jest.fn()
    renderWithProviders(<ErrorState cause="offline" onRetry={onRetry} />, {
      theme,
    })

    expect(screen.getByText('Sin conexión')).toBeTruthy()
    fireEvent.press(screen.getByText('Reintentar'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('no filtra existencia: permiso y no-encontrado dicen lo mismo', () => {
    // Decir "no tenés permiso" confirma que el recurso existe, y eso convierte
    // un enlace en una herramienta para sondear qué hay.
    // Ver docs/security/threat-model.md §T7.
    const notFound = renderWithProviders(<ErrorState cause="notFound" />, {
      theme,
    })
    const notFoundText = screen.getByText('No encontramos esto')
    expect(notFoundText).toBeTruthy()
    notFound.unmount()

    renderWithProviders(<ErrorState cause="permission" />, { theme })
    expect(screen.getByText('No encontramos esto')).toBeTruthy()
  })

  it('nunca muestra un mensaje crudo de base de datos', () => {
    renderWithProviders(<ErrorState cause="server" onRetry={jest.fn()} />, {
      theme,
    })
    for (const leak of ['relation', 'column', 'permission denied', 'PGRST']) {
      expect(screen.queryByText(new RegExp(leak, 'i'))).toBeNull()
    }
  })
})

describe.each(BOTH_THEMES)('Skeleton · tema %s', (_name, theme) => {
  it('se anuncia como carga', () => {
    renderWithProviders(<Skeleton height={200} testID="sk" />, { theme })
    expect(screen.getByLabelText('Cargando')).toBeTruthy()
  })

  it('con movimiento reducido no pulsa', () => {
    renderWithProviders(<Skeleton height={200} testID="sk" />, {
      theme,
      reduceMotion: true,
    })
    const style = screen.getByTestId('sk').props.style
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style
    expect(flat.opacity).toBe(0.5)
  })
})

describe.each(BOTH_THEMES)('Toast · tema %s', (_name, theme) => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('se cierra solo', () => {
    const onDismiss = jest.fn()
    renderWithProviders(
      <Toast message="Guardado" onDismiss={onDismiss} durationMs={4000} />,
      { theme },
    )

    expect(onDismiss).not.toHaveBeenCalled()
    jest.advanceTimersByTime(4000)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('se puede cerrar a mano antes de que se vaya solo', () => {
    const onDismiss = jest.fn()
    renderWithProviders(<Toast message="Guardado" onDismiss={onDismiss} />, {
      theme,
    })

    fireEvent.press(screen.getByLabelText('Cerrar aviso'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('ofrece deshacer cuando se le pasa una acción', () => {
    const onPress = jest.fn()
    renderWithProviders(
      <Toast
        message="Pasaste este trabajo"
        action={{ label: 'Deshacer', onPress }}
        onDismiss={jest.fn()}
      />,
      { theme },
    )

    fireEvent.press(screen.getByText('Deshacer'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
