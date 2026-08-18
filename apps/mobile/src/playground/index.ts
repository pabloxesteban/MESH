/**
 * El índice de prototipos del UX Playground.
 *
 * Cada entrada es una tarjeta en `PlaygroundHome`. `component` está ausente en
 * las entradas "sin construir" a propósito: son un registro de lo que se
 * investigó y se decidió no prototipar todavía (o directamente no pasó el
 * filtro de cinco condiciones), no un placeholder esperando implementación.
 *
 * Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground" para el porqué
 * de cada fila.
 */

import type { ComponentType } from 'react'

import { SwipePhysicsLab } from './prototypes/SwipePhysicsLab.tsx'
import { BottomSheetLab } from './prototypes/BottomSheetLab.tsx'
import { TasteMapLab } from './prototypes/TasteMapLab.tsx'

export type PlaygroundCategory = 'discovery' | 'taste' | 'matching' | 'motion'

export interface PlaygroundEntry {
  readonly id: string
  readonly name: string
  readonly category: PlaygroundCategory
  readonly purpose: string
  readonly interaction: string
  readonly accessibility: string
  readonly notes: string
  /** Ausente cuando el prototipo todavía no se construyó. Ver el comentario de cabecera. */
  readonly component?: ComponentType
}

export const PLAYGROUND_ENTRIES: readonly PlaygroundEntry[] = [
  {
    id: 'swipe-physics',
    name: 'Física de arrastre',
    category: 'discovery',
    purpose:
      'Confirmar que los números de SwipeCard.tsx (umbral, velocidad de flick, curva de rotación) son los correctos, probándolos con la mano.',
    interaction:
      'Arrastrar la tarjeta en cualquier dirección; los controles de abajo cambian el umbral y la velocidad de flick en vivo.',
    accessibility:
      'Prototipo interno, no de producción — no necesita alternativa sin gesto. El SwipeCard real que reproduce ya la tiene.',
    notes:
      'No modifica apps/mobile/src/features/discovery/SwipeCard.tsx. Reimplementa la misma lógica con los parámetros expuestos como estado, para no ensuciar el componente de producción con controles de depuración.',
    component: SwipePhysicsLab,
  },
  {
    id: 'bottom-sheet',
    name: 'Hoja inferior',
    category: 'discovery',
    purpose:
      'Probar peek / medio / completo / cerrar antes de usar esto para el detalle de estilo o la explicación de un match.',
    interaction:
      'Arrastrar el tirador entre los tres puntos de ajuste, o tocar el botón de cerrar.',
    accessibility:
      'El botón de cerrar es la alternativa sin gesto — probado sin arrastrar nada.',
    notes:
      'Ver docs/research/mobile-patterns.md § "Hoja inferior". Candidato real para producción, sin promover todavía.',
    component: BottomSheetLab,
  },
  {
    id: 'taste-map',
    name: 'Mapa de gusto',
    category: 'taste',
    purpose:
      'Evaluar si una representación de nodos comunica el vector de gusto mejor que las barras de TasteScreen, sin implicar sofisticación algorítmica que MESH no tiene.',
    interaction: 'Ninguna — es una visualización, no una decisión.',
    accessibility:
      'No aplica todavía: es explícitamente experimental y no tiene ruta a producción sin volver a pasar por accesibilidad completa.',
    notes:
      'EXPERIMENTAL a propósito. El tamaño de cada nodo sale de support real (cuántas interacciones), nunca de una relación entre estilos que MESH no calcula — inventar cercanía entre estilos violaría "nunca inventar" de CLAUDE.md.',
    component: TasteMapLab,
  },
  {
    id: 'card-stack',
    name: 'Pila de tarjetas',
    category: 'discovery',
    purpose: 'Sin construir: se solapa con lo que el SwipeCard real ya cubre.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'tap-to-like',
    name: 'Toque para dar me gusta',
    category: 'discovery',
    purpose: 'Sin construir: variación menor del gesto ya construido.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'pick-one',
    name: 'Elegí uno',
    category: 'taste',
    purpose:
      'Sin construir: depende de un motor de exploración que hoy no existe.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'taste-formation',
    name: 'Formación de gusto',
    category: 'taste',
    purpose: 'Sin construir: ya existe en producción en TasteScreen.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'this-or-that',
    name: 'Esto o lo otro',
    category: 'taste',
    purpose: 'Sin construir: mismo motivo que "Elegí uno".',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'surprise-me',
    name: 'Sorpréndeme',
    category: 'taste',
    purpose:
      'Sin construir: requiere una decisión de producto (¿el matching explora?) antes de tener sentido como prototipo de interfaz.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'tab-morph',
    name: 'Morphing de pestañas',
    category: 'motion',
    purpose:
      'Sin construir: alto riesgo de movimiento sin beneficio claro, no pasó el filtro de "¿qué información comunica?".',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'save-interaction',
    name: 'Interacción de guardar',
    category: 'motion',
    purpose: 'Sin construir: variación menor sobre hápticos ya existentes.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'long-press',
    name: 'Toque prolongado',
    category: 'motion',
    purpose:
      'Sin construir: no hay todavía acciones contextuales suficientes para justificar un menú.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/MESH-UX-STRATEGY.md § "El UX Playground".',
  },
  {
    id: 'match-reveal',
    name: 'Revelación de match',
    category: 'matching',
    purpose:
      'Sin construir: ya resuelto en producción sin necesitar un reveal — ver MatchesScreen, sin semáforo.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/interaction-research.md.',
  },
  {
    id: 'project-builder',
    name: 'Armador de proyecto',
    category: 'discovery',
    purpose:
      'Sin construir como prototipo aislado: el experimento real es A/B con medición en producción.',
    interaction: '—',
    accessibility: '—',
    notes: 'Ver docs/research/onboarding-research.md.',
  },
]
