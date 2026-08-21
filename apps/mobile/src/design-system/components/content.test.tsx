import { fireEvent, screen } from '@testing-library/react-native'
import { BOTH_THEMES, renderWithProviders } from '../test-utils.tsx'
import { Text } from '../primitives/Text.tsx'
import { MIN_TOUCH_TARGET } from '../tokens/layout.ts'
import { Avatar } from './Avatar.tsx'
import { CollectionTile } from './CollectionTile.tsx'
import { NoticeRow } from './NoticeRow.tsx'
import { SectionHeader } from './SectionHeader.tsx'
import { balanceColumns, StaggeredGrid } from './StaggeredGrid.tsx'

function flatStyle(node: { props: { style?: unknown } }) {
  const style = node.props.style
  return Array.isArray(style)
    ? Object.assign({}, ...style.filter(Boolean))
    : style
}

describe.each(BOTH_THEMES)('Avatar · tema %s', (_name, theme) => {
  it('sin foto dibuja la silueta, nunca una inicial', () => {
    renderWithProviders(<Avatar source={null} testID="avatar" />, { theme })
    // Ningún texto: si hubiera una inicial generada, `getByText` la encontraría.
    expect(screen.queryByText(/./)).toBeNull()
    expect(screen.getByTestId('avatar')).toBeTruthy()
  })

  it('con foto dibuja la imagen', () => {
    renderWithProviders(
      <Avatar source="https://ejemplo.test/foto.jpg" testID="avatar" />,
      { theme },
    )
    expect(screen.getByTestId('avatar').props.source).toEqual([
      { uri: 'https://ejemplo.test/foto.jpg' },
    ])
  })

  it('cargando muestra un círculo de esqueleto, no una silueta', () => {
    renderWithProviders(<Avatar loading testID="avatar" />, { theme })
    expect(screen.getByLabelText('Cargando')).toBeTruthy()
  })

  it('cada tamaño es circular y del diámetro esperado', () => {
    renderWithProviders(<Avatar source={null} size="lg" testID="avatar" />, {
      theme,
    })
    const style = flatStyle(screen.getByTestId('avatar'))
    expect(style.width).toBe(96)
    expect(style.height).toBe(96)
    expect(style.borderRadius).toBe(999)
  })
})

describe.each(BOTH_THEMES)('SectionHeader · tema %s', (_name, theme) => {
  it('se anuncia como encabezado', () => {
    renderWithProviders(<SectionHeader title="Cuenta" testID="section" />, {
      theme,
    })
    const heading = screen.getByText('Cuenta')
    expect(heading.props.accessibilityRole).toBe('header')
  })
})

describe.each(BOTH_THEMES)('NoticeRow · tema %s', (_name, theme) => {
  it('descarta con un botón de al menos 44pt', () => {
    const onDismiss = jest.fn()
    renderWithProviders(
      <NoticeRow
        message="Te llegó un turno nuevo"
        onDismiss={onDismiss}
        dismissAccessibilityLabel="Descartar aviso"
        testID="notice"
      />,
      { theme },
    )

    const dismiss = screen.getByLabelText('Descartar aviso')
    const style = flatStyle(dismiss)
    expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)

    fireEvent.press(dismiss)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('ofrece una acción opcional además de descartar', () => {
    const onAction = jest.fn()
    renderWithProviders(
      <NoticeRow
        message="Completá tu ubicación"
        action={{ label: 'Completar', onPress: onAction }}
        onDismiss={jest.fn()}
        dismissAccessibilityLabel="Descartar aviso"
      />,
      { theme },
    )
    fireEvent.press(screen.getByText('Completar'))
    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('mientras descarta, deshabilita en vez de disparar dos veces', () => {
    const onDismiss = jest.fn()
    renderWithProviders(
      <NoticeRow
        message="Te llegó un turno nuevo"
        onDismiss={onDismiss}
        dismissAccessibilityLabel="Descartar aviso"
        dismissing
      />,
      { theme },
    )
    fireEvent.press(screen.getByLabelText('Descartar aviso'))
    expect(onDismiss).not.toHaveBeenCalled()
  })
})

describe.each(BOTH_THEMES)('CollectionTile · tema %s', (_name, theme) => {
  it('abre la colección al tocar y anuncia nombre y cantidad', () => {
    const onPress = jest.fn()
    renderWithProviders(
      <CollectionTile
        name="Brazo entero"
        countLabel="12 obras"
        thumbnails={['a.jpg', 'b.jpg']}
        onPress={onPress}
        accessibilityLabel="Colección Brazo entero, 12 obras"
        testID="tile"
      />,
      { theme },
    )

    expect(screen.getByText('Brazo entero')).toBeTruthy()
    expect(screen.getByText('12 obras')).toBeTruthy()
    fireEvent.press(screen.getByTestId('tile'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('con menos de cuatro portadas no repite ninguna', () => {
    renderWithProviders(
      <CollectionTile
        name="Solo una"
        countLabel="1 obra"
        thumbnails={['unica.jpg']}
        onPress={jest.fn()}
        accessibilityLabel="Colección Solo una, 1 obra"
        testID="tile"
      />,
      { theme },
    )
    // Una sola fuente en todo el árbol: si se repitiera para llenar el
    // mosaico, esta cuenta daría más de una.
    const imagenes = screen.UNSAFE_getAllByProps({ source: 'unica.jpg' })
    expect(imagenes).toHaveLength(1)
  })

  it('cargando muestra esqueletos con la forma del mosaico', () => {
    renderWithProviders(
      <CollectionTile
        name="Brazo entero"
        countLabel="12 obras"
        thumbnails={[]}
        onPress={jest.fn()}
        accessibilityLabel="Colección Brazo entero, 12 obras"
        loading
        testID="tile"
      />,
      { theme },
    )
    expect(screen.getAllByLabelText('Cargando').length).toBeGreaterThan(0)
    expect(screen.queryByText('Brazo entero')).toBeNull()
  })
})

describe('balanceColumns', () => {
  it('no pierde ni repite ningún elemento', () => {
    const items = ['a', 'b', 'c', 'd', 'e']
    const columnas = balanceColumns(items, 2, () => 1)
    expect(columnas.flat().slice().sort()).toEqual(items.slice().sort())
  })

  it('reparte a la columna más corta, no alternando', () => {
    const items = [
      { id: 'alta', peso: 4 },
      { id: 'b1', peso: 1 },
      { id: 'b2', peso: 1 },
      { id: 'b3', peso: 1 },
    ]
    const [primera, segunda] = balanceColumns(items, 2, (i) => i.peso)
    expect(primera?.map((i) => i.id)).toEqual(['alta'])
    expect(segunda?.map((i) => i.id)).toEqual(['b1', 'b2', 'b3'])
  })

  it('con una sola columna, todo cae en ella en orden', () => {
    const items = [1, 2, 3]
    expect(balanceColumns(items, 1, () => 1)).toEqual([[1, 2, 3]])
  })
})

describe.each(BOTH_THEMES)('StaggeredGrid · tema %s', (_name, theme) => {
  it('renderiza cada elemento exactamente una vez, en dos columnas por defecto', () => {
    const items = [
      { id: 'a', ratio: 1 },
      { id: 'b', ratio: 0.5 },
      { id: 'c', ratio: 2 },
    ]
    renderWithProviders(
      <StaggeredGrid
        items={items}
        ratioOf={(item) => item.ratio}
        keyExtractor={(item) => item.id}
        renderItem={(item) => <Text>{item.id}</Text>}
        testID="grid"
      />,
      { theme },
    )
    for (const item of items) {
      expect(screen.getByText(item.id)).toBeTruthy()
    }
  })
})
