/**
 * El pasamanos de la transición.
 *
 * Los tres candados de este módulo existen por tres formas concretas de
 * romperse, y las tres se ven como "la animación salió de un lugar raro" —
 * un síntoma que nadie va a poder reproducir a mano. Por eso están acá.
 */

import {
  HANDOFF_TTL,
  __resetArtworkHandoff,
  claimArtwork,
  offerArtwork,
  type ArtworkHandoff,
} from './sharedArtwork.ts'

const AHORA = 1_000_000

function entrega(patch: Partial<ArtworkHandoff> = {}): ArtworkHandoff {
  return {
    portfolioItemId: 'pieza-1',
    professionalSlug: 'a-mano',
    scope: 'explore',
    mediaPath: 'a-mano/pieza-1/lg.webp',
    blurhash: null,
    aspectRatio: 0.8,
    from: { x: 20, y: 400, width: 175, height: 219 },
    at: AHORA,
    ...patch,
  }
}

beforeEach(() => {
  __resetArtworkHandoff()
})

describe('el pasamanos de la obra', () => {
  it('el perfil que corresponde la recibe', () => {
    offerArtwork(entrega())
    expect(claimArtwork('a-mano', AHORA + 30)?.portfolioItemId).toBe('pieza-1')
  })

  it('otro perfil no hereda la animación', () => {
    // Tocar una obra, que la navegación falle, y abrir después el perfil de
    // otra persona: sin este candado, la obra de uno crecería adentro del
    // perfil del otro.
    offerArtwork(entrega())
    expect(claimArtwork('otro-artista', AHORA + 30)).toBeNull()
  })

  it('se reclama una sola vez', () => {
    // Volver atrás y entrar de nuevo desde un chat reproduciría la animación
    // desde una posición de scroll que ya no existe.
    offerArtwork(entrega())
    expect(claimArtwork('a-mano', AHORA + 30)).not.toBeNull()
    expect(claimArtwork('a-mano', AHORA + 40)).toBeNull()
  })

  it('un intento fallido tampoco deja el pasamanos esperando', () => {
    offerArtwork(entrega())
    claimArtwork('otro-artista', AHORA + 30)
    expect(claimArtwork('a-mano', AHORA + 40)).toBeNull()
  })

  it('vence: una obra vieja ya no está donde estaba', () => {
    offerArtwork(entrega())
    expect(claimArtwork('a-mano', AHORA + HANDOFF_TTL + 1)).toBeNull()
  })

  it('justo en el límite todavía sirve', () => {
    offerArtwork(entrega())
    expect(claimArtwork('a-mano', AHORA + HANDOFF_TTL)).not.toBeNull()
  })

  it('un reloj que fue para atrás no cuenta como reciente', () => {
    // Cambio de horario o de zona horaria en el medio: `now - at` daría
    // negativo y pasaría el vencimiento sin ser reciente.
    offerArtwork(entrega())
    expect(claimArtwork('a-mano', AHORA - 5000)).toBeNull()
  })

  it('sin nada ofrecido no inventa nada', () => {
    expect(claimArtwork('a-mano', AHORA)).toBeNull()
  })
})
