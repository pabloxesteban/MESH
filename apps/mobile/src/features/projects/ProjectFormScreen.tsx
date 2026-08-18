/**
 * Crear un proyecto.
 *
 * Un solo campo obligatorio: qué querés hacerte. Todo lo demás es opcional, y
 * cada campo opcional dice para qué lo usamos — pedir un presupuesto sin
 * explicar por qué es pedirle a alguien que se exponga a cambio de nada.
 *
 * Lo que el formulario NO hace: no infiere estilos del texto, no estima el
 * presupuesto, no completa nada. Lo que la persona no escribe, no existe.
 */

import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STYLES, MAX_PROJECT_REFERENCES } from '@mesh/domain'
import type { ProjectTiming } from '@mesh/domain'

import {
  Box,
  Button,
  FilterChip,
  Input,
  SCREEN_GUTTER,
  Text,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import type { ProjectDraft } from './queries.ts'

const TIMINGS: readonly ProjectTiming[] = [
  'asap',
  'weeks',
  'months',
  'flexible',
]

export interface ProjectFormScreenProps {
  onSubmit: (draft: ProjectDraft) => Promise<void>
  onCancel: () => void
}

export function ProjectFormScreen({
  onSubmit,
  onCancel,
}: ProjectFormScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [styleSlugs, setStyleSlugs] = useState<readonly string[]>([])
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [timing, setTiming] = useState<ProjectTiming | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const min = toCents(budgetMin)
  const max = toCents(budgetMax)
  // El presupuesto es todo o nada: la base lo exige con un CHECK, y medio
  // presupuesto no es información.
  const budget =
    min != null && max != null && min <= max
      ? { minCents: min, maxCents: max }
      : undefined

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        padding: SCREEN_GUTTER,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      testID="screen-project-form"
    >
      <Box gap="lg">
        <Text role="titleLg">{t('projects.new')}</Text>

        <Input
          label={t('projects.form.title')}
          placeholder={t('projects.form.title.placeholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          testID="project-title"
        />

        <Input
          label={t('projects.form.description')}
          hint={t('projects.form.description.hint')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={2000}
          showCounter
          testID="project-description"
        />

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('projects.form.styles')}
          </Text>
          <Box direction="row" gap="xxs" wrap>
            {STYLES.map((style) => (
              <FilterChip
                key={style.slug}
                label={t(`style.tattoo.${style.slug}` as TranslationKey)}
                selected={styleSlugs.includes(style.slug)}
                onToggle={() =>
                  setStyleSlugs((previous) =>
                    previous.includes(style.slug)
                      ? previous.filter((slug) => slug !== style.slug)
                      : [...previous, style.slug],
                  )
                }
                testID={`project-style-${style.slug}`}
              />
            ))}
          </Box>
        </Box>

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('projects.form.budget')}
          </Text>
          {/* Se dice para qué se usa. Pedir plata sin explicar por qué es
              pedirle a alguien que se exponga a cambio de nada. */}
          <Text role="micro" color="textTertiary">
            {t('projects.form.budget.hint')}
          </Text>
          <Box direction="row" gap="xs">
            <Box flex={1}>
              <Input
                label={t('projects.form.budget.min')}
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="number-pad"
                testID="project-budget-min"
              />
            </Box>
            <Box flex={1}>
              <Input
                label={t('projects.form.budget.max')}
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="number-pad"
                testID="project-budget-max"
              />
            </Box>
          </Box>
        </Box>

        <Box gap="xs">
          <Text role="label" color="textSecondary">
            {t('projects.form.timing')}
          </Text>
          <Box direction="row" gap="xxs" wrap>
            {TIMINGS.map((option) => (
              <FilterChip
                key={option}
                label={t(`projects.form.timing.${option}` as TranslationKey)}
                selected={timing === option}
                // Se puede deseleccionar: "no sé cuándo" es una respuesta
                // válida, y un grupo donde no se puede volver atrás obliga a
                // afirmar algo que no es cierto.
                onToggle={() =>
                  setTiming((previous) => (previous === option ? null : option))
                }
                testID={`project-timing-${option}`}
              />
            ))}
          </Box>
        </Box>

        <Text role="micro" color="textTertiary">
          {t('projects.references.hint')}
        </Text>

        <Box gap="xs">
          <Button
            label={t('projects.form.submit')}
            disabled={title.trim().length === 0}
            loading={isSaving}
            fullWidth
            testID="project-submit"
            onPress={() => {
              setIsSaving(true)
              void onSubmit({
                title,
                description,
                styleSlugs,
                ...(budget != null ? { budget } : {}),
                ...(timing != null ? { timing } : {}),
              }).finally(() => setIsSaving(false))
            }}
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            onPress={onCancel}
            fullWidth
            testID="project-cancel"
          />
        </Box>
      </Box>
    </ScrollView>
  )
}

export { MAX_PROJECT_REFERENCES }

/** Pesos enteros → centavos. Un campo vacío o no numérico es "no lo dijo". */
function toCents(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, '')
  if (digits.length === 0) return undefined
  return Number(digits) * 100
}
