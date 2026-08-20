/**
 * La vuelta del enlace de recuperación.
 *
 * El primer test es el que importa, y verifica algo que ninguna pantalla
 * muestra: que el evento `PASSWORD_RECOVERY` se escuche **alrededor** del
 * canje. Llega adentro del `await`, así que un listener registrado después no
 * lo vería nunca — y toda recuperación se leería como un ingreso común: la
 * persona entraría a la app sin que nadie le pida la contraseña nueva, que es
 * exactamente lo que vino a hacer, y se quedaría con la vieja que no recuerda.
 */

import {
  callbackMessageKey,
  completeCallback,
  type CallbackDependencies,
} from './recovery.ts'

const URL_CON_CODIGO = 'mesh://auth/callback?code=abc123'

/**
 * Emite el evento DENTRO del canje, como hace Supabase de verdad. Medido
 * contra una instancia local antes de escribir esto, no supuesto.
 */
function deps(
  overrides: Partial<CallbackDependencies> & { emits?: string } = {},
): { dependencies: CallbackDependencies; sigueEscuchando: () => boolean } {
  const { emits = 'PASSWORD_RECOVERY', ...resto } = overrides
  let listener: ((event: string) => void) | null = null
  let escuchando = false

  return {
    sigueEscuchando: () => escuchando,
    dependencies: {
      onAuthEvent: (fn) => {
        listener = fn
        escuchando = true
        return () => {
          escuchando = false
        }
      },
      exchange: async (_code: string) => {
        if (emits !== '') listener?.(emits)
        return { error: null }
      },
      ...resto,
    },
  }
}

describe('qué era el enlace', () => {
  it('una recuperación se reconoce por el evento, no por la URL', async () => {
    // La URL con la que vuelve la app es solo `?code=…`: no dice `recovery`.
    const { dependencies } = deps()
    expect(await completeCallback(URL_CON_CODIGO, dependencies)).toEqual({
      kind: 'recovery',
    })
  })

  it('sin ese evento es un ingreso común y no pide contraseña nueva', async () => {
    const { dependencies } = deps({ emits: 'SIGNED_IN' })
    expect(await completeCallback(URL_CON_CODIGO, dependencies)).toEqual({
      kind: 'signedIn',
    })
  })

  it('canjea el código que vino en la URL', async () => {
    const exchange = jest.fn().mockResolvedValue({ error: null })
    const { dependencies } = deps({ exchange })
    await completeCallback(URL_CON_CODIGO, dependencies)
    expect(exchange).toHaveBeenCalledWith('abc123')
  })

  it('deja de escuchar cuando termina', async () => {
    const { dependencies, sigueEscuchando } = deps()
    await completeCallback(URL_CON_CODIGO, dependencies)
    expect(sigueEscuchando()).toBe(false)
  })

  it('deja de escuchar aunque el canje explote', async () => {
    // Sin el `finally`, cada enlace fallido dejaría un listener vivo.
    const { dependencies, sigueEscuchando } = deps({
      exchange: jest.fn().mockResolvedValue({ error: { message: 'boom' } }),
    })
    await completeCallback(URL_CON_CODIGO, dependencies)
    expect(sigueEscuchando()).toBe(false)
  })
})

describe('cuando el enlace no anda', () => {
  it('abierto en otro teléfono se dice con esas palabras', async () => {
    // El caso real y el más confuso: pedís el enlace en el teléfono y abrís el
    // correo en la computadora. El mensaje crudo de Supabase habla de un
    // "code verifier", que no le dice nada a nadie.
    const { dependencies } = deps({
      exchange: jest.fn().mockResolvedValue({
        error: { message: 'PKCE code verifier not found in storage' },
      }),
    })
    expect(await completeCallback(URL_CON_CODIGO, dependencies)).toEqual({
      kind: 'error',
      messageKey: 'auth.error.otherDevice',
    })
  })

  it('un enlace vencido no se confunde con uno roto', async () => {
    expect(callbackMessageKey('Email link is invalid or has expired')).toBe(
      'auth.error.linkExpired',
    )
  })

  it('lo demás cae en un mensaje que dice qué hacer', () => {
    expect(callbackMessageKey('algo raro del servidor')).toBe('auth.error.link')
  })

  it('nunca se muestra el texto crudo del servidor', () => {
    // Todos los caminos devuelven una clave de i18n; ninguno el mensaje inglés.
    const claves = [
      callbackMessageKey('PKCE code verifier not found'),
      callbackMessageKey('otp_expired'),
      callbackMessageKey('over_request_rate_limit'),
      callbackMessageKey('vaya uno a saber'),
    ]
    expect(claves.every((clave) => clave.startsWith('auth.error.'))).toBe(true)
  })

  it('el error que vino en la URL no llega a canjearse', async () => {
    const exchange = jest.fn()
    const { dependencies } = deps({ exchange })
    const result = await completeCallback(
      'mesh://auth/callback?error=access_denied',
      dependencies,
    )
    expect(exchange).not.toHaveBeenCalled()
    expect(result).toEqual({ kind: 'error', messageKey: 'auth.error.link' })
  })

  it('una URL sin nada no rompe la pantalla', async () => {
    const { dependencies } = deps()
    expect(
      await completeCallback('mesh://auth/callback', dependencies),
    ).toEqual({ kind: 'error', messageKey: 'auth.error.link' })
  })
})
