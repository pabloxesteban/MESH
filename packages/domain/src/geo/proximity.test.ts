import { sortByProximity } from './proximity.ts'

const PALERMO = { lat: -34.5875, lng: -58.4371 }
const SAN_TELMO = { lat: -34.6212, lng: -58.3731 }
const LEJOS = { lat: -34.7, lng: -58.6 }

function artista(nombre: string, coords: { lat: number; lng: number } | null) {
  return { nombre, studioCoordinates: coords }
}

describe('sortByProximity', () => {
  it('ordena de más cerca a más lejos', () => {
    const orden = sortByProximity(
      [artista('lejos', LEJOS), artista('cerca', SAN_TELMO)],
      PALERMO,
    ).map((entrada) => entrada.item.nombre)

    expect(orden).toEqual(['cerca', 'lejos'])
  })

  it('anota la distancia real, no una estimación', () => {
    const [primero] = sortByProximity([artista('a', SAN_TELMO)], PALERMO)
    // Palermo → San Telmo, verificado contra Google Maps en distance.test.ts.
    expect(primero?.distanceKm).toBeCloseTo(7.2, 0)
  })

  it('quien no publicó su ubicación va al final, no se esconde', () => {
    const orden = sortByProximity(
      [artista('sin-ubicacion', null), artista('con-ubicacion', LEJOS)],
      PALERMO,
    ).map((entrada) => entrada.item.nombre)

    // Esconderlo sería castigarlo por no compartir su ubicación, y publicarla
    // es voluntario.
    expect(orden).toEqual(['con-ubicacion', 'sin-ubicacion'])
    expect(orden).toHaveLength(2)
  })

  it('sin la ubicación de quien mira no inventa ninguna distancia', () => {
    const resultado = sortByProximity(
      [artista('a', SAN_TELMO), artista('b', LEJOS)],
      null,
    )

    expect(resultado.map((e) => e.item.nombre)).toEqual(['a', 'b'])
    expect(resultado.every((e) => e.distanceKm == null)).toBe(true)
  })

  it('es estable: dos sin coordenadas conservan el orden que traían', () => {
    const orden = sortByProximity(
      [artista('primero', null), artista('segundo', null)],
      PALERMO,
    ).map((entrada) => entrada.item.nombre)

    // El orden que traían es la mezcla estable por usuario que hizo la base.
    // Reordenarlo acá dejaría a alguien último para siempre.
    expect(orden).toEqual(['primero', 'segundo'])
  })

  it('no muta la lista que recibe', () => {
    const lista = [artista('lejos', LEJOS), artista('cerca', SAN_TELMO)]
    sortByProximity(lista, PALERMO)
    expect(lista.map((a) => a.nombre)).toEqual(['lejos', 'cerca'])
  })
})
