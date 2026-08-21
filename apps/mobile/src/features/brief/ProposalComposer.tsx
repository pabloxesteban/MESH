/**
 * La respuesta del artista a una búsqueda: una propuesta, no un "me interesa".
 *
 * Es el cambio de producto de ADR-020. Antes, levantar la mano mandaba un
 * booleano y la persona recibía una lista de nombres — las mismas cinco
 * conversaciones que había antes de MESH. Ahora manda **un rango para ese
 * trabajo, cuántas sesiones lleva, y la condición si la hay**.
 *
 * Tres decisiones de la pantalla:
 *
 * · **El rango es obligatorio y la nota no.** El rango es el dato por el que la
 *   persona escribe; la nota existe para "estimado, lo confirmo al verte", que
 *   es lo que un artista honesto necesita poder decir.
 * · **Se escribe en pesos, se guarda en centavos.** La conversión vive acá, en
 *   un solo lugar.
 * · **Mandar no abre un chat.** La propuesta vive en la búsqueda de la persona
 *   y el chat lo sigue abriendo ella. Ver ADR-012 y ADR-014.
 */

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { Box, Button, FilterChip, Input, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'

import { sendProposal } from './queries.ts'
import { actionErrorKey } from '@/data/actionError.ts'

/** Cuántas sesiones se ofrecen de un toque. Más que esto se escribe en la nota. */
const SESIONES = [1, 2, 3, 4, 5, 6]

const MAX_NOTE = 500

export interface ProposalComposerProps {
  projectId: string
  professionalId: string
  /** De qué búsqueda se trata. Sin esto no se sabe a qué se le pone precio. */
  searchTitle: string
  onSent: () => void
  onCancel: () => void
}

export function ProposalComposer({
  projectId,
  professionalId,
  searchTitle,
  onSent,
  onCancel,
}: ProposalComposerProps) {
  const t = useT()

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [sesiones, setSesiones] = useState(1)
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)

  const min = pesosACentavos(desde)
  const max = pesosACentavos(hasta)
  const completo = min != null && max != null

  const enviar = useMutation({
    mutationFn: () =>
      sendProposal({
        projectId,
        professionalId,
        priceMinCents: min ?? 0,
        priceMaxCents: max ?? 0,
        sessions: sesiones,
        note: nota.trim() === '' ? null : nota.trim(),
      }),
    onSuccess: onSent,
    onError: (err) => setError(t(actionErrorKey(err, 'proposal.error.send'))),
  })

  const mandar = () => {
    // El mismo orden que la restricción de la tabla, para que el error se vea
    // acá y no vuelva como un 23514 sin traducir.
    if (min == null || max == null) return
    if (min > max) {
      setError(t('proposal.error.range'))
      return
    }
    enviar.mutate()
  }

  return (
    <Box gap="sm" testID="proposal-composer">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('proposal.send.title')}
        </Text>
        <Text role="body" numberOfLines={2}>
          {searchTitle}
        </Text>
        <Text role="micro" color="textTertiary">
          {t('proposal.send.hint')}
        </Text>
      </Box>

      <Box direction="row" gap="xs">
        <Box flex={1}>
          <Input
            label={t('proposal.send.min')}
            value={desde}
            onChangeText={(value) => {
              setDesde(soloNumeros(value))
              setError(null)
            }}
            keyboardType="number-pad"
            testID="proposal-min"
          />
        </Box>
        <Box flex={1}>
          <Input
            label={t('proposal.send.max')}
            value={hasta}
            onChangeText={(value) => {
              setHasta(soloNumeros(value))
              setError(null)
            }}
            keyboardType="number-pad"
            testID="proposal-max"
          />
        </Box>
      </Box>

      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('proposal.send.sessions')}
        </Text>
        <Box direction="row" gap="xxs" wrap>
          {SESIONES.map((n) => (
            <FilterChip
              key={n}
              label={String(n)}
              selected={sesiones === n}
              onToggle={() => setSesiones(n)}
              testID={`proposal-sessions-${String(n)}`}
            />
          ))}
        </Box>
      </Box>

      <Input
        label={t('proposal.send.note')}
        value={nota}
        onChangeText={(value) => {
          setNota(value)
          setError(null)
        }}
        maxLength={MAX_NOTE}
        multiline
        testID="proposal-note"
      />

      {error != null ? (
        <Text role="body" color="stateNegative" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Box direction="row" gap="xs">
        <Button
          label={t('proposal.send.submit')}
          disabled={!completo}
          loading={enviar.isPending}
          onPress={mandar}
          testID="proposal-submit"
        />
        <Button
          label={t('common.cancel')}
          variant="ghost"
          onPress={onCancel}
          testID="proposal-cancel"
        />
      </Box>
    </Box>
  )
}

/** Solo dígitos: un teclado numérico igual deja pegar cualquier cosa. */
function soloNumeros(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 9)
}

/**
 * Pesos escritos a mano → centavos.
 *
 * `null` cuando no hay un número: el botón queda apagado y no se manda un cero
 * disfrazado de precio.
 */
function pesosACentavos(value: string): number | null {
  if (value.trim() === '') return null
  const pesos = Number(value)
  if (!Number.isFinite(pesos) || pesos <= 0) return null
  return Math.round(pesos * 100)
}
