/**
 * A qué vino la persona: a ofrecer o a buscar.
 *
 * Decide qué app es MESH para quien la abre — qué pestañas hay y qué muestra
 * Inicio. Un tatuador no quiere deslizar obra de otros tatuadores; quiere ver
 * quién está buscando lo que él hace. Ver ADR-014.
 *
 * **No es un rol excluyente y no cierra ninguna puerta.** Se cambia desde
 * Perfil cuando se quiera, y quien elige "ofrezco" sigue teniendo acceso a
 * todo lo demás. Es qué se muestra primero, no qué se permite.
 *
 * Lee del mismo `queryKey` que `OnboardingGate`, que corre antes y afuera del
 * navegador: para cuando esto se ejecuta, la respuesta ya está en el caché.
 * `looking` como piso no es una adivinanza, es el estado del que nadie puede
 * quedar afuera — si algo fallara, la app es la que era.
 */

import { useQuery } from '@tanstack/react-query'

import { fetchAccount, type OnboardingIntent } from './queries.ts'

export function useOnboardingIntent(): OnboardingIntent {
  const account = useQuery({ queryKey: ['account'], queryFn: fetchAccount })
  return account.data?.onboardingIntent ?? 'looking'
}
