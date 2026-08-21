/**
 * Entrar con Apple: lo que se puede verificar sin un iPhone.
 *
 * **Lo que este archivo NO prueba, y hay que decirlo:** la hoja del sistema.
 * `AppleAuthentication.signInAsync()` no se puede correr acá — necesita iOS y
 * una cuenta de Apple Developer configurada. Lo que sí se prueba es todo lo que
 * la rodea, que es donde están las decisiones:
 *
 * · **Vincular o entrar.** Es *la* decisión: elegir mal no falla, solo deja los
 *   datos de la persona atrás en un usuario que nadie va a abrir de nuevo.
 * · **Cancelar no es un error.** Cerrar la hoja no puede pintar un cartel rojo.
 * · **Los mensajes.** Que "esa cuenta ya es de otro" se distinga de "se rompió".
 *
 * Ver `apple.ts` y ADR-015.
 */

import {
  appleMessageKey,
  continueWithApple,
  isAppleCancel,
  type AppleDependencies,
} from './apple.ts'

function dependencias(
  patch: Partial<AppleDependencies> = {},
): AppleDependencies & { link: jest.Mock; signIn: jest.Mock } {
  const base = {
    available: jest.fn().mockResolvedValue(true),
    authorize: jest.fn().mockResolvedValue({ identityToken: 'token-de-apple' }),
    link: jest.fn().mockResolvedValue({ error: null }),
    signIn: jest.fn().mockResolvedValue({ error: null }),
  }
  return { ...base, ...patch } as AppleDependencies & {
    link: jest.Mock
    signIn: jest.Mock
  }
}

describe('vincular o entrar', () => {
  it('con sesión anónima VINCULA: el auth.uid() no cambia', async () => {
    // **El test de la decisión.** Si esto llamara a `signIn`, alguien que cargó
    // su perfil de artista sin cuenta lo perdería al registrarse con Apple.
    const deps = dependencias()
    const resultado = await continueWithApple(true, deps)

    expect(resultado).toEqual({ ok: true })
    expect(deps.link).toHaveBeenCalledWith('token-de-apple')
    expect(deps.signIn).not.toHaveBeenCalled()
  })

  it('con sesión real ENTRA', async () => {
    const deps = dependencias()
    await continueWithApple(false, deps)

    expect(deps.signIn).toHaveBeenCalledWith('token-de-apple')
    expect(deps.link).not.toHaveBeenCalled()
  })
})

describe('cancelar no es un error', () => {
  it('cerrar la hoja del sistema no muestra nada', async () => {
    const deps = dependencias({
      authorize: jest.fn().mockRejectedValue({ code: 'ERR_REQUEST_CANCELED' }),
    })
    const resultado = await continueWithApple(true, deps)

    expect(resultado).toEqual({ ok: false, cancelled: true })
    expect(deps.link).not.toHaveBeenCalled()
  })

  it('una hoja que vuelve sin token tampoco: es indistinguible de cerrarla', async () => {
    const deps = dependencias({
      authorize: jest.fn().mockResolvedValue({ identityToken: null }),
    })
    expect(await continueWithApple(true, deps)).toEqual({
      ok: false,
      cancelled: true,
    })
  })

  it('pero una falla de verdad sí se dice', async () => {
    const deps = dependencias({
      authorize: jest.fn().mockRejectedValue(new Error('se rompió')),
    })
    expect(await continueWithApple(true, deps)).toEqual({
      ok: false,
      messageKey: 'auth.error.apple',
    })
  })

  it('reconoce los dos códigos de cancelación de iOS, y nada más', () => {
    expect(isAppleCancel({ code: 'ERR_REQUEST_CANCELED' })).toBe(true)
    expect(isAppleCancel({ code: 'ERR_CANCELED' })).toBe(true)
    expect(isAppleCancel({ code: 'ERR_INVALID_RESPONSE' })).toBe(false)
    expect(isAppleCancel(new Error('cualquier cosa'))).toBe(false)
    expect(isAppleCancel(null)).toBe(false)
  })
})

describe('cuando el teléfono no lo tiene', () => {
  it('lo dice y ofrece los otros dos caminos, sin abrir nada', async () => {
    const deps = dependencias({
      available: jest.fn().mockResolvedValue(false),
    })
    expect(await continueWithApple(true, deps)).toEqual({
      ok: false,
      messageKey: 'auth.error.appleUnavailable',
    })
    expect(deps.link).not.toHaveBeenCalled()
  })
})

describe('los mensajes', () => {
  it('distingue "esa cuenta ya es de otro" de "se rompió"', () => {
    // Es la diferencia entre "andá a entrar con esa cuenta" y "probá de nuevo".
    expect(appleMessageKey('Identity is already linked to another user')).toBe(
      'auth.error.appleTaken',
    )
    expect(appleMessageKey('identity_already_exists')).toBe(
      'auth.error.appleTaken',
    )
    expect(appleMessageKey('manual_linking_disabled')).toBe(
      'auth.error.appleTaken',
    )
  })

  it('y el límite de intentos, que se arregla esperando', () => {
    expect(appleMessageKey('Rate limit exceeded')).toBe(
      'auth.error.rateLimited',
    )
  })

  it('lo que no sabe leer cae en el genérico, nunca en el crudo', () => {
    expect(appleMessageKey('AUTH-9912 upstream boom')).toBe('auth.error.apple')
  })
})
