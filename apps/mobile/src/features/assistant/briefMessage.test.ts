import { briefMessage } from './briefMessage.ts'

describe('briefMessage', () => {
  it('arma el mensaje con el resumen arriba y los rasgos abajo', () => {
    expect(
      briefMessage({
        summary: 'Quiero algo de línea fina en el antebrazo, en negro.',
        labels: ['Línea fina', 'Antebrazo', 'Negro'],
      }),
    ).toBe(
      'Quiero algo de línea fina en el antebrazo, en negro.\n\nLínea fina · Antebrazo · Negro',
    )
  })

  it('manda solo el resumen si el pedido no tiene ningún rasgo', () => {
    // Un pedido con huecos es un pedido válido: no se dibuja una línea vacía ni
    // se rellena con lo más probable.
    expect(
      briefMessage({ summary: 'Todavía no sé bien qué quiero.', labels: [] }),
    ).toBe('Todavía no sé bien qué quiero.')
  })

  it('ignora las etiquetas vacías en vez de dejar separadores sueltos', () => {
    expect(
      briefMessage({ summary: 'Algo chico.', labels: ['Chico', '  ', ''] }),
    ).toBe('Algo chico.\n\nChico')
  })

  it('no manda nada si no hay resumen', () => {
    // Sin esto, el botón mandaría un mensaje en blanco del otro lado.
    expect(briefMessage({ summary: '   ', labels: ['Negro'] })).toBeNull()
  })
})
