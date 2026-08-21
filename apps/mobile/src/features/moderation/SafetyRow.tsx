/**
 * Denunciar y bloquear, juntos y al final de la pantalla.
 *
 * **Al final a propósito.** Son las dos acciones que casi nadie va a usar y que
 * tienen que estar igual. Arriba competirían con lo que la persona vino a
 * hacer; escondidas atrás de un menú de tres puntos, no las encuentra quien las
 * necesita — que suele estar apurado y molesto.
 *
 * Bloquear no pide confirmación y se deshace con el mismo botón: es reversible,
 * inmediato, y de nadie más. Denunciar sí abre un paso más, porque manda algo
 * que otra persona va a leer.
 *
 * Ver ADR-023.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Box, Button, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import {
  blockProfessional,
  isProfessionalBlocked,
  unblockProfessional,
} from './queries.ts'
import { ReportSheet } from './ReportSheet.tsx'
import type { ReportTarget } from './queries.ts'

export interface SafetyRowProps {
  userId: string | null
  /** Qué se denuncia si toca denunciar. */
  target: ReportTarget
  /**
   * A quién se bloquea. Sin esto la fila solo ofrece denunciar — que es lo
   * correcto en una reseña, donde bloquear al artista sería otra cosa.
   */
  blockProfessionalId?: string | undefined
}

export function SafetyRow({
  userId,
  target,
  blockProfessionalId,
}: SafetyRowProps) {
  const t = useT()
  const client = useQueryClient()
  const [denunciando, setDenunciando] = useState(false)

  const bloqueado = useQuery({
    queryKey: ['blocked', blockProfessionalId],
    queryFn: () =>
      blockProfessionalId == null
        ? Promise.resolve(false)
        : isProfessionalBlocked(blockProfessionalId),
  })

  const alternar = useMutation({
    mutationFn: async () => {
      if (blockProfessionalId == null || userId == null) return
      if (bloqueado.data === true) {
        await unblockProfessional(blockProfessionalId)
      } else {
        await blockProfessional(userId, blockProfessionalId)
      }
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['blocked'] })
      // Las grillas filtran en la base, así que lo que cambió no es la pantalla
      // sino lo que la base va a devolver la próxima vez.
      void client.invalidateQueries({ queryKey: ['artists'] })
      void client.invalidateQueries({ queryKey: ['discovery'] })
    },
  })

  // Sin sesión no hay a quién colgarle la denuncia ni el bloqueo. No se muestra
  // un botón que va a fallar.
  if (userId == null) return null

  if (denunciando) {
    return (
      <ReportSheet
        userId={userId}
        target={target}
        onDone={() => setDenunciando(false)}
        onCancel={() => setDenunciando(false)}
      />
    )
  }

  return (
    <Box gap="xxs" testID="safety-row">
      <Box direction="row" gap="xxs" wrap>
        <Button
          label={t('report.open')}
          variant="ghost"
          size="sm"
          onPress={() => setDenunciando(true)}
          testID="safety-report"
        />
        {blockProfessionalId != null ? (
          <Button
            label={t(bloqueado.data === true ? 'block.undo' : 'block.do')}
            variant="ghost"
            size="sm"
            loading={alternar.isPending}
            onPress={() => alternar.mutate()}
            testID="safety-block"
          />
        ) : null}
      </Box>
      {bloqueado.data === true ? (
        <Text role="label" color="textSecondary" testID="safety-blocked-note">
          {t('block.active')}
        </Text>
      ) : null}
    </Box>
  )
}
