/**
 * Test golden del mensaje de contacto.
 *
 * Lo que verifica no es el formato: es que **el mensaje no contenga nada que la
 * persona no haya escrito**. Ese es el innegociable #2 aplicado al único texto
 * de MESH que sale del producto y llega a otra persona.
 */

import { describe, expect, it } from 'vitest'

import {
  composeContactMessage,
  instagramUrl,
  whatsappUrl,
  type ContactLabels,
} from './message.ts'

const labels: ContactLabels = {
  greeting: 'Hola, te escribo por un tatuaje.',
  styles: 'Estilos:',
  budget: 'Presupuesto:',
  timing: 'Cuándo:',
  references: 'Te mando algunas referencias.',
  closing: '¿Te interesa? Gracias.',
}

describe('composeContactMessage', () => {
  it('con todos los datos arma una línea por dato', () => {
    const message = composeContactMessage({
      professionalName: '[Fixture] Aguja Fina',
      projectTitle: 'Rama de olivo en el antebrazo',
      projectDescription: 'Chiquita, línea fina, lado interno.',
      styleNames: ['Línea fina', 'Minimalista'],
      budget: '$60.000 a $90.000',
      timing: 'En las próximas semanas',
      referenceCount: 3,
      labels,
    })

    expect(message).toBe(
      [
        'Hola, te escribo por un tatuaje.',
        'Rama de olivo en el antebrazo',
        'Chiquita, línea fina, lado interno.',
        'Estilos: Línea fina, Minimalista',
        'Presupuesto: $60.000 a $90.000',
        'Cuándo: En las próximas semanas',
        'Te mando algunas referencias.',
        '¿Te interesa? Gracias.',
      ].join('\n\n'),
    )
  })

  it('un dato ausente no deja hueco ni etiqueta vacía', () => {
    // Nada de "Presupuesto: —". Un hueco le pide al artista que lo complete.
    const message = composeContactMessage({
      professionalName: 'X',
      projectTitle: 'Rama de olivo',
      labels,
    })

    expect(message).toBe(
      [
        'Hola, te escribo por un tatuaje.',
        'Rama de olivo',
        '¿Te interesa? Gracias.',
      ].join('\n\n'),
    )
    expect(message).not.toContain('Presupuesto')
    expect(message).not.toContain('Estilos')
    expect(message).not.toContain('Cuándo')
  })

  it('no menciona referencias si no hay ninguna', () => {
    const message = composeContactMessage({
      professionalName: 'X',
      referenceCount: 0,
      labels,
    })
    expect(message).not.toContain('referencias')
  })

  it('trata los strings en blanco como ausentes', () => {
    const message = composeContactMessage({
      professionalName: 'X',
      projectTitle: '   ',
      projectDescription: '',
      budget: '  ',
      styleNames: ['', '  '],
      labels,
    })
    expect(message).toBe(
      ['Hola, te escribo por un tatuaje.', '¿Te interesa? Gracias.'].join(
        '\n\n',
      ),
    )
  })

  it('no repite la descripción si es idéntica al título', () => {
    const message = composeContactMessage({
      professionalName: 'X',
      projectTitle: 'Rama de olivo',
      projectDescription: 'Rama de olivo',
      labels,
    })
    expect(message.split('Rama de olivo')).toHaveLength(2)
  })

  it('NUNCA inventa: solo aparece lo que entró', () => {
    // El test que importa. Se arma un mensaje con un solo dato y se verifica
    // que nada más se haya colado — ni el nombre del artista, ni MESH, ni un
    // estilo inferido, ni una cortesía que la persona no eligió.
    const message = composeContactMessage({
      professionalName: '[Fixture] Aguja Fina',
      projectTitle: 'Rama de olivo',
      labels,
    })

    const permitido = new Set(
      [
        ...Object.values(labels).flatMap((label) => label.split(/\s+/)),
        ...'Rama de olivo'.split(/\s+/),
      ].map((word) => word.toLowerCase()),
    )

    for (const word of message.split(/\s+/)) {
      expect(permitido.has(word.toLowerCase())).toBe(true)
    }
    expect(message).not.toContain('MESH')
    expect(message).not.toContain('Aguja Fina')
  })
})

describe('enlaces', () => {
  it('WhatsApp usa wa.me y saca todo lo que no sea dígito', () => {
    // El esquema nativo falla en silencio si la app no está instalada.
    const url = whatsappUrl('+54 9 11 5555-1234', 'hola mundo')
    expect(url.startsWith('https://wa.me/5491155551234?text=')).toBe(true)
    expect(url).toContain('hola%20mundo')
  })

  it('escapa el mensaje entero, incluidos los saltos de línea', () => {
    const url = whatsappUrl('+5491155551234', 'a\n\nb&c')
    expect(url).toContain('a%0A%0Ab%26c')
  })

  it('Instagram abre el perfil y tolera un @ adelante', () => {
    expect(instagramUrl('@alguien')).toBe('https://instagram.com/alguien')
    expect(instagramUrl('alguien')).toBe('https://instagram.com/alguien')
  })
})
