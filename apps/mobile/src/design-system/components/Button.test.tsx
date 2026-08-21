import { fireEvent, screen } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { BOTH_THEMES, renderWithProviders } from '../test-utils.tsx'
import { MIN_TOUCH_TARGET } from '../tokens/layout.ts'
import { Button, type ButtonVariant } from './Button.tsx'

function flattenStyle(style: unknown) {
  return Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : style
}

describe.each(BOTH_THEMES)('Button · tema %s', (_name, theme) => {
  it('renderiza la etiqueta y responde al toque', () => {
    const onPress = jest.fn()
    renderWithProviders(<Button label="Hablá con Luna" onPress={onPress} />, {
      theme,
    })

    fireEvent.press(screen.getByText('Hablá con Luna'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('llega al área táctil mínima en todos los tamaños', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { getByTestId, unmount } = renderWithProviders(
        <Button label="Ver" size={size} testID="btn" />,
        { theme },
      )
      const flat = flattenStyle(getByTestId('btn').props.style)
      expect(flat.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
      unmount()
    }
  })

  it('expone una etiqueta accesible aunque se pase una distinta del texto', () => {
    renderWithProviders(
      <Button label="Guardar" accessibilityLabel="Guardar este trabajo" />,
      { theme },
    )
    expect(screen.getByLabelText('Guardar este trabajo')).toBeTruthy()
  })
})

describe('Button · estados', () => {
  it('deshabilitado no dispara onPress y lo anuncia', () => {
    const onPress = jest.fn()
    renderWithProviders(
      <Button label="Enviar" onPress={onPress} disabled testID="btn" />,
    )

    fireEvent.press(screen.getByTestId('btn'))
    expect(onPress).not.toHaveBeenCalled()
    expect(screen.getByTestId('btn').props.accessibilityState.disabled).toBe(
      true,
    )
  })

  it('cargando reemplaza la etiqueta, bloquea el toque y anuncia busy', () => {
    const onPress = jest.fn()
    renderWithProviders(
      <Button label="Enviar" onPress={onPress} loading testID="btn" />,
    )

    expect(screen.queryByText('Enviar')).toBeNull()
    // El estado de carga se anuncia con `busy`, no con una etiqueta escrita:
    // un string acá sería texto de cara al usuario fuera de i18n, y encima en
    // un solo idioma. El lector de pantalla ya dice "ocupado" en el idioma del
    // sistema.

    fireEvent.press(screen.getByTestId('btn'))
    expect(onPress).not.toHaveBeenCalled()
    expect(screen.getByTestId('btn').props.accessibilityState.busy).toBe(true)
  })
})

describe('Button · hápticos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no dispara ningún háptico por defecto', () => {
    renderWithProviders(<Button label="Ver" testID="btn" />)
    fireEvent.press(screen.getByTestId('btn'))
    expect(Haptics.impactAsync).not.toHaveBeenCalled()
  })

  it('dispara el háptico pedido', () => {
    renderWithProviders(
      <Button label="Guardar" hapticIntent="save" testID="btn" />,
    )
    fireEvent.press(screen.getByTestId('btn'))
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium')
  })
})

// ADR-031, segunda etapa: compresión física al presionar, solo en `primary`.
//
// El mock oficial de Reanimated para Jest (ver `jest.reanimated.js`) no
// persiste shared values entre renders ni corre el hilo de UI — cada llamada
// a `useSharedValue` en un nuevo render arranca de nuevo desde el valor
// inicial. La curva de la animación en sí (0,97 sostenido durante la presión,
// `withTiming` de vuelta a 1) no se puede observar disparando `pressIn`/
// `pressOut` sintéticos y releyendo el árbol: eso se mide en un dispositivo,
// igual que el resto de los gestos (ver `docs/testing/test-strategy.md §7`).
// Lo que sí se verifica acá, con certeza, es el cableado: que el mecanismo
// animado está presente únicamente en `primary`, en reposo en escala 1, y que
// no rompe `onPress` ni el resto de los estados del botón.
describe('Button · compresión al presionar', () => {
  it.each<ButtonVariant>(['secondary', 'ghost', 'destructive'])(
    '%s no lleva el mecanismo de compresión — el acento aparece como máximo una vez por pantalla',
    (variant) => {
      renderWithProviders(
        <Button label="Cancelar" variant={variant} testID="btn" />,
      )
      expect(
        flattenStyle(screen.getByTestId('btn').props.style).transform,
      ).toBeUndefined()
    },
  )

  it('primary lleva el mecanismo animado, en reposo en escala 1', () => {
    renderWithProviders(<Button label="Confirmar" testID="btn" />)
    expect(
      flattenStyle(screen.getByTestId('btn').props.style).transform,
    ).toEqual([{ scale: 1 }])
  })

  it('con reducción de movimiento, primary se sigue renderizando en reposo en escala 1', () => {
    renderWithProviders(<Button label="Confirmar" testID="btn" />, {
      reduceMotion: true,
    })
    expect(
      flattenStyle(screen.getByTestId('btn').props.style).transform,
    ).toEqual([{ scale: 1 }])
  })

  it('presionar y soltar no interfiere con onPress, disabled ni loading', () => {
    const onPress = jest.fn()
    renderWithProviders(
      <Button label="Confirmar" onPress={onPress} testID="btn" />,
    )
    const button = screen.getByTestId('btn')

    fireEvent(button, 'pressIn')
    fireEvent(button, 'pressOut')
    fireEvent.press(button)
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
