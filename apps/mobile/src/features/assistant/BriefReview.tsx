/**
 * El pedido que armó el asistente, para leer y corregir antes de publicarlo.
 *
 * **Es la pantalla que hace legítimo todo lo demás.** La regla 2 de ADR-021 dice
 * que nada generado llega a un tercero sin que la persona lo haya leído,
 * editado y confirmado; acá es donde eso ocurre o no ocurre. Por eso:
 *
 * · **El resumen está en un campo de texto, no en un cartel.** Un texto que se
 *   puede editar se lee; uno que solo se aprueba, no.
 * · **No hay un "publicar" de un toque desde el hilo.** Hay que pasar por acá.
 * · **Los rasgos son los mismos chips de ADR-020**, con el mismo vocabulario
 *   cerrado que sale de la tabla. Lo que el asistente eligió viene marcado, y
 *   se cambia con un toque.
 * · **Se dice cuántos campos quedaron vacíos**, en vez de dibujarlos completos.
 *   Un pedido con huecos es un pedido válido.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Box,
  Button,
  Input,
  SCREEN_GUTTER,
  Text,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { track } from '@/analytics/track.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import { BriefEditor } from '../brief/BriefEditor.tsx'
import { fetchTraits, setProjectTraits } from '../brief/queries.ts'
import { createQuickSearch } from '../quick-search/createQuickSearch.ts'

import type { AssistantBrief } from './assistant.ts'
import { attachThreadProject } from './queries.ts'
import { actionErrorKey } from '@/data/actionError.ts'

const MAX_TITLE = 120
const MAX_SUMMARY = 600

export interface BriefReviewProps {
  userId: string
  threadId: string
  brief: AssistantBrief
  onBack: () => void
  onPublished: (projectId: string) => void
}

export function BriefReview({
  userId,
  threadId,
  brief,
  onBack,
  onPublished,
}: BriefReviewProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const [title, setTitle] = useState(brief.title)
  const [summary, setSummary] = useState(brief.summary)
  const [traitSlugs, setTraitSlugs] = useState<ReadonlySet<string>>(
    new Set(brief.traits.map((trait) => trait.slug)),
  )
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vocabulario = useQuery({
    queryKey: ['traits', 'tattoo'],
    queryFn: () => fetchTraits('tattoo'),
  })

  const publicar = useMutation({
    mutationFn: async () => {
      const result = await createQuickSearch({
        userId,
        title: title.trim(),
        description: summary.trim(),
        styleSlugs: brief.styleSlug == null ? [] : [brief.styleSlug],
        imageUris: [],
        openToProfessionals: abierto,
      })

      // Los rasgos van después: la política los pide colgados de una búsqueda
      // que ya existe. Si esto falla, la búsqueda ya está y el brief se puede
      // completar — abortar la habría perdido entera por tres chips.
      const elegidos = (vocabulario.data ?? [])
        .filter((trait) => traitSlugs.has(trait.slug))
        .map((trait) => trait.id)
      try {
        await setProjectTraits(result.projectId, elegidos)
      } catch {
        // Silencio a propósito, por lo mismo de arriba.
      }

      try {
        await attachThreadProject(threadId, result.projectId)
      } catch {
        // Colgar el hilo del pedido es para poder volver a mirarlo, no para que
        // el pedido exista. Que falle no puede costar la búsqueda.
      }

      return result.projectId
    },
    onSuccess: (projectId) => {
      track({ name: 'search_opened', props: { is_open: abierto } })
      onPublished(projectId)
    },
    onError: (err) =>
      setError(t(actionErrorKey(err, 'assistant.review.error'))),
  })

  const vacios =
    (brief.styleSlug == null ? 1 : 0) + Math.max(0, 3 - traitSlugs.size)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        padding: SCREEN_GUTTER,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      testID="screen-brief-review"
    >
      <Box gap="md">
        <Box gap="xxs">
          <Button
            label={t('common.back')}
            variant="ghost"
            size="sm"
            onPress={onBack}
            testID="brief-review-back"
          />
          <Text role="titleLg">{t('assistant.review.title')}</Text>
          <Text role="body" color="textSecondary">
            {t('assistant.review.body')}
          </Text>
          {vacios > 0 ? (
            <Text role="label" color="textTertiary" testID="brief-review-gaps">
              {t(
                vacios === 1
                  ? 'assistant.review.gaps.one'
                  : 'assistant.review.gaps',
                {
                  n: String(vacios),
                },
              )}
            </Text>
          ) : null}
        </Box>

        <Input
          label={t('assistant.review.name')}
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_TITLE}
          testID="brief-review-title"
        />

        <Box gap="xxs">
          <Input
            label={t('assistant.review.summary')}
            value={summary}
            onChangeText={setSummary}
            maxLength={MAX_SUMMARY}
            multiline
            testID="brief-review-summary"
          />
          <Text role="label" color="textTertiary">
            {t('assistant.review.summary.hint')}
          </Text>
        </Box>

        {brief.styleSlug != null ? (
          <Box gap="xxs" testID="brief-review-style">
            <Text role="label" color="textSecondary">
              {t('brief.style')}
            </Text>
            <Text role="body">
              {t(`style.tattoo.${brief.styleSlug}` as TranslationKey)}
            </Text>
          </Box>
        ) : null}

        <BriefEditor
          traits={vocabulario.data ?? []}
          selected={traitSlugs}
          onToggle={(slug) => {
            const siguiente = new Set(traitSlugs)
            if (siguiente.has(slug)) siguiente.delete(slug)
            else siguiente.add(slug)
            setTraitSlugs(siguiente)
          }}
          readCount={brief.traits.length}
          source="words"
        />

        <Box gap="xxs" testID="brief-review-open">
          <Text role="label" color="textSecondary">
            {t('quickSearch.open.title')}
          </Text>
          <Text role="body" color="textSecondary">
            {t('quickSearch.open.body')}
          </Text>
          <Text role="micro" color="textTertiary">
            {t(abierto ? 'quickSearch.open.on' : 'quickSearch.open.off')}
          </Text>
          <Button
            label={t(
              abierto
                ? 'quickSearch.open.toggle.on'
                : 'quickSearch.open.toggle.off',
            )}
            variant="secondary"
            onPress={() => setAbierto(!abierto)}
            fullWidth
            testID="brief-review-open-toggle"
          />
        </Box>

        {error != null ? (
          <Text
            role="body"
            color="stateNegative"
            accessibilityRole="alert"
            testID="brief-review-error"
          >
            {error}
          </Text>
        ) : null}

        <Button
          label={t('assistant.review.publish')}
          disabled={title.trim() === '' || summary.trim() === ''}
          loading={publicar.isPending}
          onPress={() => publicar.mutate()}
          fullWidth
          testID="brief-review-publish"
        />
      </Box>
    </ScrollView>
  )
}
