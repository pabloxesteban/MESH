/**
 * El botón de Google, atado a la sesión que hay.
 *
 * Existe para que las dos rutas —crear cuenta y entrar— no repitan la única
 * línea que importa: **`isAnonymous` sale de la sesión viva, no de en qué
 * pantalla estás.** Alguien puede llegar a "entrar" con sesión anónima (es la
 * que MESH abre sola en el primer arranque), y ahí lo correcto sigue siendo
 * vincular. Si cada pantalla decidiera por su cuenta, "entrar" pasaría a
 * `signInWithOAuth` y dejaría el perfil de artista atrás en el usuario
 * anterior. Ver ADR-002 y ADR-015.
 */

import { useCallback } from 'react'

import type { TranslationKey } from '../../i18n/index.ts'

import { continueWithGoogle, formOutcome } from './oauth.ts'
import { useSession } from './SessionProvider.tsx'

export function useGoogle(): () => Promise<TranslationKey | null | 'ok'> {
  const { isAnonymous } = useSession()

  return useCallback(
    async () => formOutcome(await continueWithGoogle(isAnonymous)),
    [isAnonymous],
  )
}
