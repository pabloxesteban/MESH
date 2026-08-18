/**
 * Tus proyectos.
 *
 * Lista y detalle en una sola pantalla porque en V1 alguien tiene uno o dos
 * proyectos, no veinte. Una pantalla de lista que casi siempre muestra un solo
 * ítem es un toque de más entre la persona y lo que vino a hacer.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MAX_PROJECT_REFERENCES } from '@mesh/domain'

import {
  Box,
  Button,
  EmptyState,
  SCREEN_GUTTER,
  Skeleton,
  Tag,
  Text,
  radius,
  spacing,
  useTheme,
} from '@/design-system/index.ts'
import { ErrorView } from '@/components/ErrorView.tsx'
import { useT } from '@/i18n/I18nProvider.tsx'
import type { TranslationKey } from '@/i18n/index.ts'

import {
  archiveProject,
  fetchProjects,
  type ProjectSummary,
} from './queries.ts'

export interface ProjectsScreenProps {
  onNew: () => void
  onMatches: (projectId: string) => void
}

export function ProjectsScreen({ onNew, onMatches }: ProjectsScreenProps) {
  const t = useT()
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: ['projects'], queryFn: fetchProjects })

  const archive = useMutation({
    mutationFn: archiveProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })

  const body = (() => {
    if (query.error != null) {
      return (
        <ErrorView
          error={query.error}
          onRetry={() => void query.refetch()}
          testID="projects-error"
        />
      )
    }

    if (query.isPending) {
      return (
        <Box gap="sm" testID="projects-loading">
          <Skeleton height={120} radius="md" />
          <Skeleton height={120} radius="md" />
        </Box>
      )
    }

    if (query.data.length === 0) {
      // El estado vacío explica qué es un proyecto y para qué sirve. "No tenés
      // proyectos" sin más deja a la persona sin saber si le falta algo.
      return (
        <EmptyState
          title={t('projects.empty.title')}
          body={t('projects.empty.body')}
          action={{ label: t('projects.empty.action'), onPress: onNew }}
          testID="projects-empty"
        />
      )
    }

    return (
      <Box gap="sm" testID="projects-list">
        {query.data.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onMatches={() => onMatches(project.id)}
            onArchive={() => archive.mutate(project.id)}
          />
        ))}
        <Button
          label={t('projects.new')}
          variant="secondary"
          onPress={onNew}
          fullWidth
        />
      </Box>
    )
  })()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={{
        padding: SCREEN_GUTTER,
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
      }}
      testID="screen-projects"
    >
      <Box paddingBottom="md">
        <Text role="titleLg">{t('projects.title')}</Text>
      </Box>
      {body}
    </ScrollView>
  )
}

function ProjectCard({
  project,
  onMatches,
  onArchive,
}: {
  project: ProjectSummary
  onMatches: () => void
  onArchive: () => void
}) {
  const t = useT()
  const theme = useTheme()
  const [armed, setArmed] = useState(false)

  return (
    <View
      testID={`project-${project.id}`}
      style={{
        borderRadius: radius.md,
        backgroundColor: theme.surfaceRaised,
        padding: spacing.sm,
        gap: spacing.xs,
      }}
    >
      <Text role="title">{project.title}</Text>

      {project.description != null ? (
        <Text role="body" color="textSecondary" numberOfLines={3}>
          {project.description}
        </Text>
      ) : null}

      {project.styles.length > 0 ? (
        <Box direction="row" gap="xxs" wrap>
          {project.styles.map((style) => (
            <Tag
              key={style.styleSlug}
              label={t(`style.tattoo.${style.styleSlug}` as TranslationKey)}
              styleSlug={style.styleSlug}
              filled
            />
          ))}
        </Box>
      ) : null}

      {project.referenceCount > 0 ? (
        <Text role="micro" color="textTertiary">
          {t('projects.references.count', {
            n: project.referenceCount,
            max: MAX_PROJECT_REFERENCES,
          })}
        </Text>
      ) : null}

      <Box gap="xxs">
        <Button
          label={t('projects.matches')}
          onPress={onMatches}
          fullWidth
          testID={`project-matches-${project.id}`}
        />
        {/* Archivar y no borrar: libera cuota, conserva lo que se escribió, y
            es reversible desde la base si alguien se arrepiente. */}
        <Button
          label={armed ? t('projects.archive.confirm') : t('projects.archive')}
          variant={armed ? 'destructive' : 'ghost'}
          onPress={() => {
            if (armed) {
              onArchive()
              setArmed(false)
              return
            }
            setArmed(true)
          }}
          fullWidth
          testID={`project-archive-${project.id}`}
        />
      </Box>
    </View>
  )
}
