/**
 * Entrar con Google.
 *
 * El test que importa es el primero, y verifica algo que **no se ve en la
 * pantalla**: que con sesión anónima se llame a `linkIdentity` y no a
 * `signInWithOAuth`. Las dos abren el mismo navegador y terminan con la persona
 * adentro de la app; la diferencia es que una conserva su `auth.uid()` y la otra
 * la deja en un usuario nuevo, con su perfil de artista abandonado en el
 * anterior.
 *
 * Es exactamente el mismo riesgo que ADR-002 evitó para el correo usando
 * `updateUser()` en vez de `signUp()`, y no hay ninguna pantalla donde se note
 * si se elige mal.
 */

import {
  continueWithGoogle,
  formOutcome,
  isCancelled,
  oauthAction,
  oauthMessageKey,
  parseCallback,
  type OAuthDependencies,
} from './oauth.ts'

const REDIRECT = 'mesh://auth/callback'

function deps(overrides: Partial<OAuthDependencies> = {}): {
  dependencies: OAuthDependencies
  link: jest.Mock
  signIn: jest.Mock
  exchange: jest.Mock
} {
  const link = jest.fn().mockResolvedValue({
    data: { url: 'https://supabase.test/authorize' },
    error: null,
  })
  const signIn = jest.fn().mockResolvedValue({
    data: { url: 'https://supabase.test/authorize' },
    error: null,
  })
  const exchange = jest.fn().mockResolvedValue({ error: null })

  return {
    link,
    signIn,
    exchange,
    dependencies: {
      link,
      signIn,
      exchange,
      openAuth: jest
        .fn()
        .mockResolvedValue({ type: 'success', url: `${REDIRECT}?code=abc123` }),
      redirect: () => REDIRECT,
      ...overrides,
    },
  }
}

describe('vincular o entrar', () => {
  it('con sesión anónima VINCULA, para no cambiar de usuario', async () => {
    // Si esto se rompiera, alguien que cargó su perfil de artista desde la app
    // lo perdería justo al registrarse. Y la pantalla se vería igual.
    const { dependencies, link, signIn } = deps()
    const result = await continueWithGoogle(true, dependencies)

    expect(link).toHaveBeenCalledTimes(1)
    expect(signIn).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
  })

  it('con cuenta ya creada, entra', async () => {
    // Vincular acá fallaría: la identidad ya está donde tiene que estar.
    const { dependencies, link, signIn } = deps()
    await continueWithGoogle(false, dependencies)

    expect(signIn).toHaveBeenCalledTimes(1)
    expect(link).not.toHaveBeenCalled()
  })

  it('la decisión tiene nombre propio y es solo eso', () => {
    expect(oauthAction(true)).toBe('link')
    expect(oauthAction(false)).toBe('signIn')
  })

  it('canjea el código que volvió, no otro', async () => {
    const { dependencies, exchange } = deps()
    await continueWithGoogle(true, dependencies)
    expect(exchange).toHaveBeenCalledWith('abc123')
  })

  it('el navegador vuelve a donde la app escucha', async () => {
    const openAuth = jest
      .fn()
      .mockResolvedValue({ type: 'success', url: `${REDIRECT}?code=x` })
    const { dependencies } = deps({ openAuth })
    await continueWithGoogle(true, dependencies)

    expect(openAuth).toHaveBeenCalledWith(
      'https://supabase.test/authorize',
      REDIRECT,
    )
  })
})

describe('cuando no sale bien', () => {
  it('cancelar no es un error y no muestra nada', async () => {
    // Cerrar la pestaña es una decisión, no una falla. Un cartel rojo ahí
    // convierte "me arrepentí" en "algo se rompió".
    const { dependencies } = deps({
      openAuth: jest.fn().mockResolvedValue({ type: 'cancel' }),
    })
    const result = await continueWithGoogle(true, dependencies)

    expect(isCancelled(result)).toBe(true)
  })

  it('volver sin código ni error también es cancelar', async () => {
    const { dependencies } = deps({
      openAuth: jest.fn().mockResolvedValue({ type: 'success', url: REDIRECT }),
    })
    expect(isCancelled(await continueWithGoogle(true, dependencies))).toBe(true)
  })

  it('esa cuenta de Google ya es de otro: se dice', async () => {
    // El caso real: ya se registró en otro teléfono. No se puede unir a los dos
    // sin la rutina de fusión que ADR-002 evita, así que se avisa en vez de
    // cambiarle el usuario por debajo.
    const { dependencies } = deps({
      link: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Identity is already linked to another user' },
      }),
    })
    const result = await continueWithGoogle(true, dependencies)

    expect(result).toEqual({
      ok: false,
      messageKey: 'auth.error.googleTaken',
    })
  })

  it('un fallo al canjear no deja la pantalla en silencio', async () => {
    const { dependencies } = deps({
      exchange: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
    })
    const result = await continueWithGoogle(true, dependencies)

    expect(result).toEqual({ ok: false, messageKey: 'auth.error.google' })
  })

  it('nunca se muestra el mensaje crudo del servidor', () => {
    // Los mensajes de GoTrue están en inglés y filtran detalles de
    // implementación. Todo sale por una clave de i18n.
    expect(oauthMessageKey('Some internal failure at gotrue')).toBe(
      'auth.error.google',
    )
    expect(oauthMessageKey('over_request_rate_limit')).toBe(
      'auth.error.rateLimited',
    )
  })
})

describe('la URL con la que vuelve el navegador', () => {
  it('saca el código de la query', () => {
    expect(parseCallback(`${REDIRECT}?code=abc`)).toEqual({ code: 'abc' })
  })

  it('lo saca también del fragmento', () => {
    expect(parseCallback(`${REDIRECT}#code=abc`)).toEqual({ code: 'abc' })
  })

  it('prefiere el error cuando el proveedor mandó los dos', () => {
    // No debería pasar, pero si pasa el error es la señal que importa: canjear
    // un código que vino junto a un error termina en una sesión a medias.
    expect(parseCallback(`${REDIRECT}?error=access_denied&code=abc`)).toEqual({
      error: 'access_denied',
    })
  })

  it('devuelve el error cuando no hay código', () => {
    expect(parseCallback(`${REDIRECT}?error=access_denied`)).toEqual({
      error: 'access_denied',
    })
  })

  it('una URL rota no rompe la pantalla', () => {
    expect(parseCallback('no es una url')).toBeNull()
  })
})

describe('lo que llega a la pantalla', () => {
  it('cancelar es null, y null no se muestra', () => {
    expect(formOutcome({ ok: false, cancelled: true })).toBeNull()
  })

  it('entrar es ok', () => {
    expect(formOutcome({ ok: true })).toBe('ok')
  })

  it('un error viaja como clave, no como texto', () => {
    expect(
      formOutcome({ ok: false, messageKey: 'auth.error.googleTaken' }),
    ).toBe('auth.error.googleTaken')
  })
})
