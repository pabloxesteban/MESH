/**
 * Los matches de la persona.
 *
 * El puntaje se calcula en el cliente con el motor puro de `packages/domain`, y
 * el resultado se persiste para poder auditarlo. El orden de las dos cosas
 * importa: primero se muestra, después se guarda. Guardar es para nosotros;
 * mostrar es para quien está esperando.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { blendProjectStyles, matchProfessionals } from '@mesh/domain'
import type { Professional, ScoredMatch, WeightedStyle } from '@mesh/domain'

import { useTaste } from '../taste/useTaste.ts'
import { fetchCatalog, persistMatches } from './queries.ts'

export interface MatchWithProfessional {
  readonly match: ScoredMatch
  readonly professional: Professional
}

/**
 * Brief de proyecto, cuando el match es por proyecto y no solo por gusto.
 *
 * Con proyecto, el matching corre aunque no haya perfil de gusto: alguien que
 * llega con una idea clara no necesita deslizar primero. Ver matching.md §5.
 */
export interface ProjectBriefInput {
  readonly id: string
  readonly styles: readonly WeightedStyle[]
  readonly budget?:
    { readonly minCents: number; readonly maxCents: number } | undefined
  readonly locationSlug?: string | undefined
}

export interface MatchesState {
  readonly matches: readonly MatchWithProfessional[]
  readonly isReady: boolean
  readonly interactionsToReady: number
  readonly isLoading: boolean
  readonly error: unknown
  readonly retry: () => void
}

export function useMatches(
  categorySlug: 'tattoo',
  userId: string | null,
  /**
   * La fecha entra desde afuera. El motor no lee el reloj (ver ADR-008), y
   * pasarla acá hace que un test pueda fijar "hoy" sin tocar el sistema.
   */
  today: string,
  project?: ProjectBriefInput | undefined,
): MatchesState {
  const queryClient = useQueryClient()
  const taste = useTaste(categorySlug, userId)

  // Con proyecto no hace falta umbral de gusto: el brief ya dice qué se busca.
  const canScore = project != null || taste.taste?.isReady === true

  const catalog = useQuery({
    queryKey: ['catalog', categorySlug],
    queryFn: () => fetchCatalog(categorySlug),
    // No tiene sentido bajar el catálogo antes de tener con qué puntuarlo.
    enabled: userId != null && canScore,
  })

  const matches = useMemo<readonly MatchWithProfessional[]>(() => {
    if (catalog.data == null) return []
    if (project == null && taste.taste?.isReady !== true) return []

    const byId = new Map(
      catalog.data.map((professional) => [professional.id, professional]),
    )

    // El brief domina (0,75) pero el gusto ambiente sigue rompiendo empates
    // entre artistas que todos hacen lo mismo. Sin gusto, `t' = proyecto`.
    const scores =
      project == null
        ? (taste.taste?.scores ?? {})
        : blendProjectStyles(project.styles, {
            scores: taste.taste?.scores ?? {},
          })

    const scored = matchProfessionals(
      {
        taste: { scores, aversion: taste.taste?.aversion ?? {} },
        today,
        ...(project?.budget != null ? { budget: project.budget } : {}),
        // En V1 todos los artistas están en CABA: ubicación es constante y no
        // discrimina, así que se omite en vez de darle a todos el mismo 1,0 que
        // no aporta nada al ranking pero sí diluye el peso del estilo.
        locationDiscriminates: false,
      },
      catalog.data,
      { projectId: project?.id ?? null },
    )

    return scored.flatMap((match) => {
      const professional = byId.get(match.professionalId)
      return professional == null ? [] : [{ match, professional }]
    })
  }, [taste.taste, catalog.data, today, project])

  // La persistencia va detrás del render. Si falla, la lista igual se ve: el
  // registro es para nosotros, no para quien está esperando.
  useMemo(() => {
    if (userId == null || matches.length === 0) return
    void persistMatches(
      userId,
      matches.map(({ match }) => ({
        professionalId: match.professionalId,
        projectId: match.projectId,
        score: match.score,
        band: match.band,
        components: { ...match.components } as Readonly<Record<string, number>>,
        reasons: match.reasons,
        matchingVersion: match.matchingVersion,
        tasteVersion: match.tasteVersion,
      })),
    ).catch(() => undefined)
  }, [userId, matches])

  const retry = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['catalog', categorySlug] })
    taste.retry()
  }, [queryClient, categorySlug, taste])

  return {
    matches,
    isReady: project != null || (taste.taste?.isReady ?? false),
    interactionsToReady: taste.taste?.interactionsToReady ?? 0,
    isLoading:
      taste.isLoading || (taste.taste?.isReady === true && catalog.isPending),
    error: taste.error ?? catalog.error,
    retry,
  }
}
