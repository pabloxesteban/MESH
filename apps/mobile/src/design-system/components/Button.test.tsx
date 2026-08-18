import { fireEvent, screen } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import { BOTH_THEMES, renderWithProviders } from '../test-utils.tsx'
import { MIN_TOUCH_TARGET } from '../tokens/layout.ts'
import { Button } from './Button.tsx'

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
      const style = getByTestId('btn').props.style
      const flat = Array.isArray(style)
        ? Object.assign({}, ...style.filter(Boolean))
        : style
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
