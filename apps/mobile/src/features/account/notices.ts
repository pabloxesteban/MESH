/**
 * Avisos puntuales de Perfil, descartados a mano.
 *
 * Descartar un aviso es una preferencia de este teléfono, no un hecho de la
 * cuenta: no hay tabla para esto y no la necesita. Mismo mecanismo que ya usa
 * `ErrorReportsToggle` — `kv` + JSON — namespaced por usuario para que cerrar
 * sesión y entrar con otra cuenta en el mismo teléfono no herede lo que la
 * persona anterior descartó.
 *
 * **Descartar no es la única forma en la que un aviso desaparece.** Si el
 * hecho se resuelve —sube la foto, carga la ubicación— el aviso deja de
 * aplicar y no se dibuja, sin importar qué haya en este storage. Acá solo se
 * guarda la decisión de "no de nuevo", para lo que sigue sin resolverse.
 */

import { kv, readJson, writeJson } from '@/data/kv.ts'

export type NoticeKind = 'photo' | 'location'

function keyFor(userId: string): string {
  return `mesh.profile-notices.${userId}`
}

export async function fetchDismissedNotices(
  userId: string,
): Promise<ReadonlySet<NoticeKind>> {
  const stored = await readJson<readonly string[]>(kv, keyFor(userId), [])
  return new Set(stored.filter((v): v is NoticeKind => v === 'photo' || v === 'location'))
}

export async function dismissNotice(
  userId: string,
  kind: NoticeKind,
): Promise<void> {
  const current = await fetchDismissedNotices(userId)
  await writeJson(kv, keyFor(userId), [...current, kind])
}
