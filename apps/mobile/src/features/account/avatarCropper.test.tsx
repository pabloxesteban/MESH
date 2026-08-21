/**
 * `AvatarCropper`: `computeCrop` como función pura, y los tres botones
 * ("Alejar", "Centrar", "Acercar") como el camino sin gestos que el
 * innegociable 6 exige.
 *
 * **Lo que este archivo NO prueba: el gesto en sí** (pellizcar/arrastrar con
 * los dedos, corriendo en un worklet de Reanimated). Eso no se puede simular
 * de forma significativa en Jest — `react-native-reanimated/mock` no ejecuta
 * lógica de gestos real — y queda como pasada manual en dispositivo. Ver el
 * reporte de QA.
 */

import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '@/design-system/test-utils.tsx'
import { I18nProvider } from '@/i18n/I18nProvider.tsx'
import { MIN_TOUCH_TARGET } from '@/design-system/index.ts'

import { AvatarCropper, computeCrop } from './AvatarCropper.tsx'

function renderCropper(
  props: Partial<React.ComponentProps<typeof AvatarCropper>> = {},
) {
  const onCropChange = jest.fn()
  const utils = renderWithProviders(
    <I18nProvider locale="es-AR">
      <AvatarCropper
        uri="foto.jpg"
        imageWidth={1200}
        imageHeight={800}
        onCropChange={onCropChange}
        testID="cropper"
        {...props}
      />
    </I18nProvider>,
  )
  return { ...utils, onCropChange }
}

describe('computeCrop', () => {
  it('sin zoom ni desplazamiento, el recorte es el cuadrado central en píxeles reales', () => {
    // Imagen 1200x800: el lado más corto es 800, así que la escala base cubre
    // exactamente esa dimensión. El cuadrado de 800x800 queda centrado en X.
    const crop = computeCrop({
      imageWidth: 1200,
      imageHeight: 800,
      userScale: 1,
      translateX: 0,
      translateY: 0,
    })
    expect(crop.side).toBeCloseTo(800)
    expect(crop.originX).toBeCloseTo(200) // (1200 - 800) / 2
    expect(crop.originY).toBeCloseTo(0)
  })

  it('con el doble de zoom, el lado del recorte se achica a la mitad', () => {
    const crop = computeCrop({
      imageWidth: 1200,
      imageHeight: 800,
      userScale: 2,
      translateX: 0,
      translateY: 0,
    })
    expect(crop.side).toBeCloseTo(400)
  })

  it('el origen nunca es negativo, aunque el desplazamiento pedido lo sea', () => {
    const crop = computeCrop({
      imageWidth: 1200,
      imageHeight: 800,
      userScale: 1,
      translateX: 10_000, // mucho más que cualquier límite real
      translateY: 10_000,
    })
    expect(crop.originX).toBeGreaterThanOrEqual(0)
    expect(crop.originY).toBeGreaterThanOrEqual(0)
  })

  it('el origen nunca deja que el cuadrado se salga de la imagen', () => {
    const crop = computeCrop({
      imageWidth: 1200,
      imageHeight: 800,
      userScale: 1,
      translateX: -10_000,
      translateY: -10_000,
    })
    expect(crop.originX + crop.side).toBeLessThanOrEqual(1200 + 0.01)
    expect(crop.originY + crop.side).toBeLessThanOrEqual(800 + 0.01)
  })

  it('una imagen ya cuadrada, sin zoom, recorta la imagen entera', () => {
    const crop = computeCrop({
      imageWidth: 500,
      imageHeight: 500,
      userScale: 1,
      translateX: 0,
      translateY: 0,
    })
    expect(crop.originX).toBeCloseTo(0)
    expect(crop.originY).toBeCloseTo(0)
    expect(crop.side).toBeCloseTo(500)
  })
})

describe('controles sin gesto', () => {
  it('"Acercar" reduce el lado del recorte reportado (más zoom, menos área)', () => {
    const { getByTestId, onCropChange } = renderCropper()
    fireEvent.press(getByTestId('cropper-zoom-in'))

    expect(onCropChange).toHaveBeenCalled()
    const [{ side }] = onCropChange.mock.calls[onCropChange.mock.calls.length - 1]
    expect(side).toBeLessThan(800)
  })

  it('"Alejar" no puede sacar el zoom por debajo del mínimo (1x)', () => {
    const { getByTestId, onCropChange } = renderCropper()
    // Ya está en el mínimo: alejar no debería mover nada más allá del piso.
    fireEvent.press(getByTestId('cropper-zoom-out'))

    const [{ side }] = onCropChange.mock.calls[onCropChange.mock.calls.length - 1]
    expect(side).toBeCloseTo(800)
  })

  it('"Centrar" después de acercar vuelve a reportar el cuadrado central', () => {
    const { getByTestId, onCropChange } = renderCropper()
    fireEvent.press(getByTestId('cropper-zoom-in'))
    fireEvent.press(getByTestId('cropper-zoom-in'))
    fireEvent.press(getByTestId('cropper-center'))

    const [crop] = onCropChange.mock.calls[onCropChange.mock.calls.length - 1]
    expect(crop.side).toBeCloseTo(800)
    expect(crop.originX).toBeCloseTo(200)
    expect(crop.originY).toBeCloseTo(0)
  })

  it('acercar repetido nunca pasa el tope de zoom (lado no baja de VIEWPORT / MAX_USER_SCALE)', () => {
    const { getByTestId, onCropChange } = renderCropper()
    for (let i = 0; i < 20; i += 1) fireEvent.press(getByTestId('cropper-zoom-in'))

    const [{ side }] = onCropChange.mock.calls[onCropChange.mock.calls.length - 1]
    // MAX_USER_SCALE = 4: el lado no puede bajar de 800 / 4 = 200.
    expect(side).toBeGreaterThanOrEqual(200 - 0.5)
  })

  it('los tres controles tienen etiqueta accesible y ≥44pt — el gesto nunca es la única forma', () => {
    const { getByTestId } = renderCropper()
    for (const suffix of ['zoom-out', 'center', 'zoom-in']) {
      const boton = getByTestId(`cropper-${suffix}`)
      expect(boton.props.accessibilityRole).toBe('button')

      const style = Array.isArray(boton.props.style)
        ? Object.assign({}, ...boton.props.style.filter(Boolean))
        : boton.props.style
      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET)
    }
    // Y cada uno tiene un texto real, no solo un glifo: "Alejar", "Centrar",
    // "Acercar" son las etiquetas de `avatarPicker.zoomOut/.center/.zoomIn`.
    expect(getByTestId('cropper-zoom-out')).toHaveTextContent('Alejar')
    expect(getByTestId('cropper-center')).toHaveTextContent('Centrar')
    expect(getByTestId('cropper-zoom-in')).toHaveTextContent('Acercar')
  })
})
