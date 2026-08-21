import { fireEvent, screen } from '@testing-library/react-native'
import { BOTH_THEMES, renderWithProviders } from '../test-utils.tsx'
import { MIN_TOUCH_TARGET } from '../tokens/layout.ts'
import { darkTheme, lightTheme } from '../tokens/theme.ts'
import { FilterChip } from './FilterChip.tsx'
import { Input } from './Input.tsx'
import { Tag } from './Tag.tsx'

function flatStyle(node: { props: { style?: unknown } }) {
  const style = node.props.style
  return Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : style
}

describe.each(BOTH_THEMES)('FilterChip · tema %s', (_name, theme) => {
  it('alterna y expone el estado de selección al lector de pantalla', () => {
    const onToggle = jest.fn()
    renderWithProviders(
      <FilterChip
        label="Fine Line"
        selected={false}
        onToggle={onToggle}
        testID="chip"
      />,
      { theme },
    )

    const chip = screen.getByTestId('chip')
    expect(chip.props.accessibilityState.selected).toBe(false)

    fireEvent.press(chip)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('la selección no se comunica solo con color', () => {
    renderWithProviders(
      <FilterChip
        label="Blackwork"
        selected
        onToggle={jest.fn()}
        testID="chip"
      />,
      { theme },
    )
    const chip = screen.getByTestId('chip')
    expect(chip.props.accessibilityState.selected).toBe(true)
    expect(chip.props.accessibilityState.checked).toBe(true)
  })

  it('llega al área táctil mínima', () => {
    renderWithProviders(
      <FilterChip
        label="Dotwork"
        selected={false}
        onToggle={jest.fn()}
        testID="chip"
      />,
      { theme },
    )
    expect(
      flatStyle(screen.getByTestId('chip')).minHeight,
    ).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
  })

  // ADR-032: la selección pasa a ser acento de estado — accentFill/accent en
  // vez de textPrimary/borderSubtle. Es un chip de filtro, no una acción: no
  // usa relleno grande, solo borde y etiqueta.
  it('seleccionado usa el acento de estado (ADR-032), no textPrimary', () => {
    renderWithProviders(
      <FilterChip
        label="Old School"
        selected
        onToggle={jest.fn()}
        testID="chip"
      />,
      { theme },
    )
    const chipTheme = theme === 'dark' ? darkTheme : lightTheme
    const style = flatStyle(screen.getByTestId('chip'))
    expect(style.borderColor).toBe(chipTheme.accentFill)
    expect(style.backgroundColor).toBe('transparent')
  })

  it('deshabilitado no alterna', () => {
    const onToggle = jest.fn()
    renderWithProviders(
      <FilterChip
        label="Realism"
        selected={false}
        onToggle={onToggle}
        disabled
        testID="chip"
      />,
      { theme },
    )
    fireEvent.press(screen.getByTestId('chip'))
    expect(onToggle).not.toHaveBeenCalled()
  })
})

describe.each(BOTH_THEMES)('Tag · tema %s', (_name, theme) => {
  it('muestra el nombre traducido, nunca el slug', () => {
    renderWithProviders(<Tag label="Fine Line" />, { theme })
    // El componente recibe la etiqueta ya traducida; que acá aparezca un slug
    // significaría que alguien saltó la capa de i18n. El texto se guarda tal
    // cual: las mayúsculas son un estilo, no una transformación del contenido,
    // así un lector de pantalla lee "Fine Line" y no "F I N E  L I N E".
    expect(screen.getByText('Fine Line')).toBeTruthy()
    expect(screen.queryByText('fine-line')).toBeNull()
  })

  it('aplica las mayúsculas como estilo, no cambiando el texto', () => {
    renderWithProviders(<Tag label="Fine Line" />, { theme })
    const style = screen.getByText('Fine Line').props.style
    const flat = Array.isArray(style)
      ? Object.assign({}, ...style.filter(Boolean))
      : style
    expect(flat.textTransform).toBe('uppercase')
  })
})

describe.each(BOTH_THEMES)('Input · tema %s', (_name, theme) => {
  it('usa una etiqueta real, no un placeholder como etiqueta', () => {
    renderWithProviders(
      <Input label="Título" placeholder="Tatuaje botánico" />,
      {
        theme,
      },
    )
    expect(screen.getByText('Título')).toBeTruthy()
    expect(screen.getByLabelText('Título')).toBeTruthy()
  })

  it('muestra la ayuda y la reemplaza por el error', () => {
    const { rerender } = renderWithProviders(
      <Input label="Título" hint="Cómo lo llamarías" />,
      { theme },
    )
    expect(screen.getByText('Cómo lo llamarías')).toBeTruthy()

    rerender(
      <Input
        label="Título"
        hint="Cómo lo llamarías"
        error="No puede estar vacío"
      />,
    )
    expect(screen.getByText('No puede estar vacío')).toBeTruthy()
    expect(screen.queryByText('Cómo lo llamarías')).toBeNull()
  })

  it('marca el campo como inválido, no solo con el borde rojo', () => {
    renderWithProviders(<Input label="Título" error="No puede estar vacío" />, {
      theme,
    })
    const field = screen.getByLabelText('Título')
    expect(field.props['aria-invalid']).toBe(true)
    expect(field.props.accessibilityHint).toBe('No puede estar vacío')
  })

  it('cuenta caracteres cuando se lo pide', () => {
    renderWithProviders(
      <Input label="Título" value="Botánico" maxLength={120} showCounter />,
      { theme },
    )
    expect(screen.getByText('8/120')).toBeTruthy()
  })

  // ADR-032: el borde de foco pasa a ser acento de estado (accentFill), no
  // textPrimary — es el mismo registro que un chip seleccionado o el tab
  // activo, no una acción.
  it('el borde de foco usa el acento de estado (ADR-032)', () => {
    const inputTheme = theme === 'dark' ? darkTheme : lightTheme
    renderWithProviders(<Input label="Título" />, { theme })
    const field = screen.getByLabelText('Título')

    expect(flatStyle(field).borderColor).toBe(inputTheme.borderSubtle)
    fireEvent(field, 'focus')
    expect(flatStyle(field).borderColor).toBe(inputTheme.accentFill)
  })
})
