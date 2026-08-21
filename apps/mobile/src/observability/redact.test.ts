import { MAX_MESSAGE, redact, redactStack } from './redact.ts'

/**
 * Estos tests son la garantía de ADR-026: si alguno se cae, un dato de una
 * persona está viajando a un servidor de terceros.
 *
 * Cada caso es un mensaje de error REAL que MESH puede producir, no un ejemplo
 * inventado.
 */
describe('redact', () => {
  it('tapa el correo que Postgres pone en un choque de unicidad', () => {
    const real =
      'duplicate key value violates unique constraint "profiles_email_key" Key (email)=(alguien@ejemplo.com) already exists.'
    const salida = redact(real)

    expect(salida).not.toMatch(/alguien@ejemplo\.com/)
    expect(salida).not.toMatch(/@/)
    // Y conserva lo que sirve para arreglarlo.
    expect(salida).toMatch(/duplicate key value/)
  })

  it('tapa los uuid, que identifican a una persona o a una conversación', () => {
    const salida = redact(
      'new row violates row-level security policy for table "messages" (conversation_id=aaaaaaaa-1111-2222-3333-444444444444)',
    )
    expect(salida).not.toMatch(/aaaaaaaa-1111/)
    expect(salida).toMatch(/\[id\]/)
  })

  it('tapa un teléfono', () => {
    expect(redact('no se pudo escribir a +54 9 11 5555 4444')).not.toMatch(
      /5555/,
    )
  })

  it('tapa el texto que alguien escribió, aunque venga entre comillas', () => {
    const salida = redact(
      `check constraint failed: body = 'quiero taparme una cicatriz del brazo'`,
    )
    expect(salida).not.toMatch(/cicatriz/)
  })

  it('tapa la query de una URL, que es donde viaja un token', () => {
    const salida = redact(
      'fetch failed: https://mesh.test/auth/callback?access_token=abcdef&type=recovery',
    )
    expect(salida).not.toMatch(/abcdef/)
    expect(salida).toMatch(/https:\/\/mesh\.test\/auth\/callback/)
  })

  it('deja pasar un mensaje que no tiene nada personal', () => {
    expect(redact('Network request failed')).toBe('Network request failed')
  })

  it('recorta lo muy largo en vez de mandarlo entero', () => {
    const salida = redact('x'.repeat(500))
    expect(salida.length).toBeLessThanOrEqual(MAX_MESSAGE)
  })

  it('no se rompe con lo que no es un texto', () => {
    // El `message` de un error puede ser cualquier cosa.
    expect(redact(undefined)).toBe('')
    expect(redact({ a: 1 })).toBe('')
    expect(redact(null)).toBe('')
  })
})

describe('redactStack', () => {
  it('deja el archivo y la línea, y tira la ruta completa', () => {
    const stack = [
      'Error: algo',
      '    at ProfileScreen (/var/mobile/Containers/Bundle/app/src/features/profile/ProfileScreen.tsx:120:15)',
      '    at renderWithHooks (/node_modules/react/index.js:9:1)',
    ].join('\n')

    const frames = redactStack(stack)
    expect(frames[0]).toBe('ProfileScreen (ProfileScreen.tsx:120)')
    expect(frames[0]).not.toMatch(/Containers/)
  })

  it('corta la pila en vez de mandarla entera', () => {
    const stack = ['Error: x', ...Array(40).fill('    at f (a.ts:1:1)')].join(
      '\n',
    )
    expect(redactStack(stack).length).toBeLessThanOrEqual(12)
  })

  it('sin pila, no inventa una', () => {
    expect(redactStack(undefined)).toEqual([])
  })
})
