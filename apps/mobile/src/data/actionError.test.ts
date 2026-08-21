/**
 * La frase de un error de acción.
 *
 * Tres garantías, y la tercera es la que más importa:
 *
 * 1. Sin conexión se dice sin conexión, sea cual sea la acción.
 * 2. Todo lo demás conserva la frase de la acción, que sabe de qué se trata.
 * 3. **`permission` también conserva la frase de la acción**, a propósito.
 *    Decirle "no tenés permiso" a quien acaba de ser bloqueado le confirma
 *    que lo bloquearon, y ADR-023 dice que eso no se sabe.
 */

import { actionErrorKey } from './actionError.ts'

describe('la frase de un error de acción', () => {
  it('sin conexión, lo dice y dice qué revisar', () => {
    const sinRed = { message: 'TypeError: Network request failed' }
    expect(actionErrorKey(sinRed, 'chat.error')).toBe('error.offline.action')
  })

  it('con el servidor caído, deja la frase de la acción', () => {
    expect(actionErrorKey({ status: 503 }, 'chat.error')).toBe('chat.error')
  })

  it('con RLS rechazando, también: decir "no tenés permiso" delata un bloqueo', () => {
    expect(actionErrorKey({ code: '42501' }, 'chat.error')).toBe('chat.error')
    expect(actionErrorKey({ status: 403 }, 'chat.error')).toBe('chat.error')
  })

  it('con un error que no sabemos leer, deja la frase de la acción', () => {
    expect(actionErrorKey(new Error('vaya a saber'), 'export.error')).toBe(
      'export.error',
    )
    expect(actionErrorKey(null, 'export.error')).toBe('export.error')
  })
})
