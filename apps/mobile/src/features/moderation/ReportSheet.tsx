/**
 * Denunciar algo.
 *
 * Cuatro decisiones, y las cuatro son sobre no hacerle perder el tiempo a
 * alguien que ya está incómodo:
 *
 * · **Los motivos son botones, no un campo de texto.** Quien denuncia acaba de
 *   ver algo que le molestó; no está para redactar. La nota es opcional.
 * · **Se dice qué pasa después, antes de mandar.** Sin eso, denunciar se siente
 *   como tirar un papel a un pozo. Y se dice la verdad: lo mira una persona, no
 *   es automático, y no le llega aviso al denunciado.
 * · **Denunciar no bloquea.** Son dos cosas distintas y la pantalla lo dice: la
 *   denuncia la mira el equipo, el bloqueo lo hacés vos y es inmediato.
 * · **Si ya lo denunciaste, se dice.** La base lo impide con un índice único;
 *   sin este mensaje eso volvería como un error rojo sin sentido.
 *
 * Ver ADR-023.
 */

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { Box, Button, FilterChip, Input, Text } from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import {
  AlreadyReportedError,
  REPORT_REASONS,
  sendReport,
  type ReportReason,
  type ReportTarget,
} from './queries.ts'

const MAX_NOTE = 1000

export interface ReportSheetProps {
  userId: string
  target: ReportTarget
  onDone: () => void
  onCancel: () => void
}

export function ReportSheet({
  userId,
  target,
  onDone,
  onCancel,
}: ReportSheetProps) {
  const t = useT()

  const [reason, setReason] = useState<ReportReason | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)

  const mandar = useMutation({
    mutationFn: () =>
      sendReport({
        userId,
        target,
        reason: reason as ReportReason,
        note: note.trim() === '' ? null : note.trim(),
      }),
    onSuccess: () => setListo(true),
    onError: (err) =>
      setError(
        err instanceof AlreadyReportedError
          ? t('report.already')
          : t('report.error'),
      ),
  })

  if (listo) {
    return (
      <Box gap="xs" testID="report-done">
        <Text role="body">{t('report.done')}</Text>
        <Text role="label" color="textSecondary">
          {t('report.done.body')}
        </Text>
        <Button
          label={t('common.close')}
          variant="secondary"
          onPress={onDone}
          testID="report-close"
        />
      </Box>
    )
  }

  return (
    <Box gap="sm" testID="report-sheet">
      <Box gap="xxs">
        <Text role="label" color="textSecondary">
          {t('report.title')}
        </Text>
        <Text role="label" color="textTertiary">
          {t('report.hint')}
        </Text>
      </Box>

      <Box direction="row" gap="xxs" wrap>
        {REPORT_REASONS.map((option) => (
          <FilterChip
            key={option}
            label={t(`report.reason.${option}` as TranslationKey)}
            selected={reason === option}
            onToggle={() => {
              setReason(option)
              setError(null)
            }}
            testID={`report-reason-${option}`}
          />
        ))}
      </Box>

      <Input
        label={t('report.note')}
        value={note}
        onChangeText={(value) => {
          setNote(value)
          setError(null)
        }}
        maxLength={MAX_NOTE}
        multiline
        testID="report-note"
      />

      {error != null ? (
        <Text
          role="body"
          color="stateNegative"
          accessibilityRole="alert"
          testID="report-error"
        >
          {error}
        </Text>
      ) : null}

      <Box direction="row" gap="xs">
        <Button
          label={t('report.submit')}
          disabled={reason == null}
          loading={mandar.isPending}
          onPress={() => mandar.mutate()}
          testID="report-submit"
        />
        <Button
          label={t('common.cancel')}
          variant="ghost"
          onPress={onCancel}
          testID="report-cancel"
        />
      </Box>
    </Box>
  )
}
