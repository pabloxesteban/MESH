/**
 * Persistencia de "descartado" para los avisos de Perfil.
 *
 * Lo que este archivo NO decide —qué aviso aplica, y si un aviso resuelto
 * sigue oculto aunque nadie lo haya descartado— vive en `AccountScreen`
 * (`ProfileNotices`), documentado ahí y testeado en `accountHeader.test.tsx`.
 * Acá solo el mecanismo de guardar y leer la decisión de "no de nuevo".
 */

import { kv, writeJson } from '@/data/kv.ts'

import {
  dismissNotice,
  fetchDismissedNotices,
  type NoticeKind,
} from './notices.ts'

describe('fetchDismissedNotices', () => {
  it('sin nada guardado, el conjunto está vacío', async () => {
    const vacio = await fetchDismissedNotices('user-sin-historial')
    expect(vacio.size).toBe(0)
  })

  it('descarta un tipo válido y no otro', async () => {
    // JSON manipulado a mano (o una versión vieja de la app) no debería poder
    // colar un valor que ya no es un `NoticeKind`.
    await writeJson(kv, 'mesh.profile-notices.user-corrupto', [
      'photo',
      'algo-que-ya-no-existe',
    ])
    const leido = await fetchDismissedNotices('user-corrupto')
    expect(leido.has('photo' as NoticeKind)).toBe(true)
    expect(leido.size).toBe(1)
  })
})

describe('dismissNotice', () => {
  it('descartar hace que el tipo aparezca en lo descartado', async () => {
    await dismissNotice('user-1', 'photo')
    const leido = await fetchDismissedNotices('user-1')
    expect(leido.has('photo')).toBe(true)
    expect(leido.has('location')).toBe(false)
  })

  it('descartar los dos tipos conserva los dos', async () => {
    await dismissNotice('user-2', 'photo')
    await dismissNotice('user-2', 'location')
    const leido = await fetchDismissedNotices('user-2')
    expect(leido.has('photo')).toBe(true)
    expect(leido.has('location')).toBe(true)
  })

  it('descartar el mismo tipo dos veces no lo duplica', async () => {
    await dismissNotice('user-3', 'photo')
    await dismissNotice('user-3', 'photo')
    const leido = await fetchDismissedNotices('user-3')
    expect([...leido]).toEqual(['photo'])
  })

  it('está separado por usuario: descartar para uno no afecta al otro', async () => {
    // Mismo mecanismo que `ErrorReportsToggle` — namespaced por usuario para
    // que cerrar sesión y entrar con otra cuenta en el mismo teléfono no
    // herede lo que la persona anterior descartó.
    await dismissNotice('user-a', 'photo')
    const deB = await fetchDismissedNotices('user-b')
    expect(deB.size).toBe(0)
  })
})
