/**
 * `justCreated.ts`: la señal de "esta colección se acaba de crear".
 *
 * Mismo criterio que `sharedArtwork.test.ts` — es estado global mutable de un
 * solo fotograma, así que lo que importa verificar es que se reclama una sola
 * vez y que una colección no hereda la marca de otra.
 */

import {
  __resetJustCreated,
  claimJustCreated,
  offerJustCreated,
} from './justCreated.ts'

beforeEach(() => {
  __resetJustCreated()
})

describe('la señal de colección recién creada', () => {
  it('la colección que corresponde la reclama', () => {
    offerJustCreated('col-1')
    expect(claimJustCreated('col-1')).toBe(true)
  })

  it('otra colección no hereda la marca', () => {
    offerJustCreated('col-1')
    expect(claimJustCreated('col-2')).toBe(false)
  })

  it('se reclama una sola vez', () => {
    offerJustCreated('col-1')
    expect(claimJustCreated('col-1')).toBe(true)
    expect(claimJustCreated('col-1')).toBe(false)
  })

  it('un intento fallido tampoco deja la señal esperando', () => {
    offerJustCreated('col-1')
    claimJustCreated('col-2')
    expect(claimJustCreated('col-1')).toBe(false)
  })

  it('sin nada ofrecido no inventa nada', () => {
    expect(claimJustCreated('col-1')).toBe(false)
  })
})
