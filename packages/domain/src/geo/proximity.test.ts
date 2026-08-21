import {
  DISTANCE_BANDS_KM,
  distanceBand,
  sortByNeighborhood,
  sortByProximity,
} from './proximity.ts'

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

describe('sortByNeighborhood', () => {
  const artista = (slug: string, neighborhoodSlug: string | null) => ({
    slug,
    neighborhoodSlug,
  })

  it('sin barrio elegido devuelve todo como vino', () => {
    // No hay desde dónde medir. Reordenar sería inventar un criterio.
    const items = [artista('a', 'palermo'), artista('b', 'boedo')]
    expect(sortByNeighborhood(items, null)).toBe(items)
  })

  it('el mismo barrio va primero, después la comuna, después la ciudad', () => {
    const items = [
      artista('lejos', 'la-plata'),
      artista('ciudad', 'boedo'),
      artista('mismo', 'palermo'),
    ]
    expect(
      sortByNeighborhood(items, 'palermo').map((item) => item.slug),
    ).toEqual(['mismo', 'ciudad', 'lejos'])
  })

  it('quien no declaró barrio aparece igual, al final', () => {
    // Esconderlo sería castigarlo por no haber compartido dónde trabaja.
    const items = [artista('sin', null), artista('con', 'palermo')]
    expect(sortByNeighborhood(items, 'palermo').map((i) => i.slug)).toEqual([
      'con',
      'sin',
    ])
  })

  it('un barrio que no está en la taxonomía no rompe: va al final', () => {
    const items = [artista('raro', 'inventado'), artista('real', 'palermo')]
    expect(sortByNeighborhood(items, 'palermo').map((i) => i.slug)).toEqual([
      'real',
      'raro',
    ])
  })

  it('dentro del mismo nivel conserva el orden en que vino', () => {
    // Es la mezcla estable por usuario que hizo la base: reordenarla acá le
    // daría siempre el mismo primer puesto al mismo artista.
    const items = [
      artista('uno', 'boedo'),
      artista('dos', 'flores'),
      artista('tres', 'caballito'),
    ]
    expect(sortByNeighborhood(items, 'palermo').map((i) => i.slug)).toEqual([
      'uno',
      'dos',
      'tres',
    ])
  })

  it('no anota ninguna distancia', () => {
    // Los barrios de la taxonomía no tienen coordenadas, y el centro de
    // Palermo tampoco sería donde está la persona. Ordenar sí; decir "a 2 km"
    // sería inventarlo.
    const [primero] = sortByNeighborhood([artista('a', 'palermo')], 'palermo')
    expect(primero).not.toHaveProperty('distanceKm')
  })
})

describe('anillos de distancia', () => {
  it('quien está igual de lejos en la práctica queda empatado', () => {
    // Cien metros de diferencia no cambian el viaje de nadie, y en un catálogo
    // chico ordenar por el kilómetro exacto le regala el primer puesto de por
    // vida a quien lo tenga.
    expect(distanceBand(0.4)).toBe(distanceBand(1.9))
    expect(distanceBand(2.1)).toBe(distanceBand(4.8))
  })

  it('pero un anillo más lejos sigue yendo después', () => {
    expect(distanceBand(1.9)).toBeLessThan(distanceBand(2.1))
    expect(distanceBand(9)).toBeLessThan(distanceBand(11))
    expect(distanceBand(19)).toBeLessThan(distanceBand(40))
  })

  it('los cortes están en el límite, no después', () => {
    for (const corte of DISTANCE_BANDS_KM) {
      expect(distanceBand(corte)).toBeLessThan(distanceBand(corte + 0.001))
    }
  })

  it('el orden dentro del anillo es el que trajo la base', () => {
    // **El test de la decisión.** La base manda una mezcla nueva en cada
    // sesión; el dominio no puede pisarla reordenando por el kilómetro exacto,
    // porque ahí se pierde todo el azar.
    const cerca = { lat: -34.5885, lng: -58.4381 } // ~0,15 km de PALERMO
    const masCerca = { lat: -34.5876, lng: -58.4372 } // ~0,015 km

    const primero = sortByProximity(
      [artista('b', cerca), artista('a', masCerca)],
      PALERMO,
    ).map((e) => e.item.nombre)
    expect(primero).toEqual(['b', 'a'])

    // La misma pareja al revés: el orden lo sigue decidiendo quién vino
    // primero, no cuál está a quince metros menos.
    const segundo = sortByProximity(
      [artista('a', masCerca), artista('b', cerca)],
      PALERMO,
    ).map((e) => e.item.nombre)
    expect(segundo).toEqual(['a', 'b'])
  })

  it('la distancia que se muestra sigue siendo la real, no la del anillo', () => {
    const [primero] = sortByProximity([artista('a', SAN_TELMO)], PALERMO)
    expect(primero?.distanceKm).toBeCloseTo(7.2, 0)
  })
})
