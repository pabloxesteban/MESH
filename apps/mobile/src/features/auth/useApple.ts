/**
 * El botón de Apple, atado a la sesión que hay.
 *
 * Mismo motivo que `useGoogle`: **`isAnonymous` sale de la sesión viva, no de
 * en qué pantalla estás.** Y una condición más, que es de Apple: solo existe en
 * iOS. En Android y en la web devuelve `null`, y la pantalla no dibuja el botón.
 *
 * Ver ADR-002, ADR-015 y `apple.ts`.
 */

import { useCallback } from 'react'
import { Platform } from 'react-native'

import type { TranslationKey } from '../../i18n/index.ts'

import { continueWithApple } from './apple.ts'
import { formOutcome } from './oauth.ts'
import { useSession } from './SessionProvider.tsx'

export function useApple():
  (() => Promise<TranslationKey | null | 'ok'>) | null {
  const { isAnonymous } = useSession()

  const entrar = useCallback(
    async () => formOutcome(await continueWithApple(isAnonymous)),
    [isAnonymous],
  )

  return Platform.OS === 'ios' ? entrar : null
}
