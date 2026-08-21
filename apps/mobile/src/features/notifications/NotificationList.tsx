/**
 * La bandeja de avisos, arriba de los chats.
 *
 * Ver ADR-027. Cuatro decisiones, y las cuatro son contra el mismo riesgo: que
 * esto se convierta en la cosa que le pide a alguien que vuelva.
 *
 * · **No hay bandeja vacía.** Si no pasó nada, la sección no existe. Un "no
 *   tenés avisos" ocupa lugar arriba de lo que la persona vino a ver y le
 *   enseña a mirar ahí todos los días.
 * · **No hay número rojo.** El no leído se marca con un punto al costado del
 *   texto, y se apaga al abrir. Un contador creciendo es exactamente el número
 *   cuyo propósito es que alguien vuelva a entrar.
 * · **La frase la arma i18n**, no la base. Por eso un aviso no puede decir
 *   "¡se te escapa!": no hay dónde escribirlo.
 * · **Cada uno se puede sacar.** Es su bandeja.
 *
 * Se marcan leídos al montar, no al salir: si la app se cierra de golpe, lo que
 * la persona ya vio no debería seguir contando como pendiente. Mismo criterio
 * que `mark_conversation_read()`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useI18n } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import {
  dismissNotification,
  fetchNotifications,
  markNotificationsRead,
  type Notification,
} from './queries.ts'

/**
 * La clave de i18n de cada aviso.
 *
 * Una denuncia resuelta se lee distinto según cómo terminó, y las dos frases
 * dicen la verdad: "tomamos una medida" no cuenta cuál —sería contar una
 * sanción ajena— y "no encontramos motivo" no se disfraza de otra cosa.
 */
function claveDe(aviso: Notification): TranslationKey {
  if (aviso.kind === 'report_reviewed') {
    return aviso.outcome === 'actioned'
      ? 'notif.report.actioned'
      : 'notif.report.dismissed'
  }
  return `notif.${aviso.kind}` as TranslationKey
}

export function NotificationList() {
  const { t, locale } = useI18n()
  const client = useQueryClient()

  const avisos = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  })

  const sacar = useMutation({
    mutationFn: (id: string) => dismissNotification(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const hayPendientes = (avisos.data ?? []).some((aviso) => !aviso.read)

  useEffect(() => {
    if (!hayPendientes) return
    void markNotificationsRead().catch(() => undefined)
  }, [hayPendientes])

  const lista = avisos.data ?? []
  // Sin estado vacío: si no pasó nada, la sección no existe.
  if (lista.length === 0) return null

  return (
    <Box gap="xs" testID="notification-list">
      <Text role="label" color="textSecondary">
        {t('notif.title')}
      </Text>

      {lista.map((aviso) => (
        <Box
          key={aviso.id}
          direction="row"
          gap="xs"
          align="center"
          testID={`notification-${aviso.id}`}
        >
          {/* El punto de no leído, al costado del texto y sin número. */}
          <Text role="body" color={aviso.read ? 'textTertiary' : 'accent'}>
            {aviso.read ? '·' : '•'}
          </Text>
          <Box flex={1} gap="xxs">
            <Text role="body">{t(claveDe(aviso))}</Text>
            <Text role="label" color="textTertiary">
              {new Date(aviso.createdAt).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </Box>
          <Button
            label={t('notif.dismiss')}
            accessibilityLabel={t('notif.dismiss.one', {
              aviso: t(claveDe(aviso)),
            })}
            variant="ghost"
            size="sm"
            onPress={() => sacar.mutate(aviso.id)}
            testID={`notification-dismiss-${aviso.id}`}
          />
        </Box>
      ))}
    </Box>
  )
}
