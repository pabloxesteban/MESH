/**
 * El artista bloquea a alguien, desde la conversación.
 *
 * **Solo desde acá, y es a propósito.** Un artista no conoce la identidad de
 * nadie salvo de quien le escribió: el mazo de búsquedas no trae `user_id`
 * (ADR-014) y la política de `blocks` exige una conversación previa. Un botón
 * de bloquear en cualquier otro lado sería un botón que la base rechaza.
 *
 * Ver ADR-023.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { blockUser } from './queries.ts'
import { ReportSheet } from './ReportSheet.tsx'

export interface BlockPersonProps {
  userId: string
  otherUserId: string
  /** El mensaje que se denuncia si toca denunciar. */
  messageId: string
}

export function BlockPerson({
  userId,
  otherUserId,
  messageId,
}: BlockPersonProps) {
  const t = useT()
  const client = useQueryClient()
  const [denunciando, setDenunciando] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)

  const bloquear = useMutation({
    mutationFn: () => blockUser(userId, otherUserId),
    onSuccess: () => {
      setBloqueado(true)
      // El mazo del artista filtra en la base: lo que cambió no es la pantalla
      // sino lo que la próxima consulta va a devolver.
      void client.invalidateQueries({ queryKey: ['open-searches'] })
    },
  })

  if (denunciando) {
    return (
      <ReportSheet
        userId={userId}
        target={{ kind: 'message', messageId }}
        onDone={() => setDenunciando(false)}
        onCancel={() => setDenunciando(false)}
      />
    )
  }

  return (
    <Box gap="xxs" testID="block-person">
      <Box direction="row" gap="xxs" wrap>
        <Button
          label={t('report.open')}
          variant="ghost"
          size="sm"
          onPress={() => setDenunciando(true)}
          testID="block-person-report"
        />
        {!bloqueado ? (
          <Button
            label={t('block.do')}
            variant="ghost"
            size="sm"
            loading={bloquear.isPending}
            onPress={() => bloquear.mutate()}
            testID="block-person-block"
          />
        ) : null}
      </Box>
      {bloqueado ? (
        <Text role="label" color="textSecondary" testID="block-person-done">
          {t('block.active')}
        </Text>
      ) : null}
    </Box>
  )
}
