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
import { EditorialDark } from './directions/EditorialDark.tsx'
import { WarmGallery } from './directions/WarmGallery.tsx'
import { SpatialApple } from './directions/SpatialApple.tsx'
import { CreativeMinimal } from './directions/CreativeMinimal.tsx'

export type PlaygroundCategory =
  | 'discovery'
  | 'taste'
  | 'matching'
  | 'motion'
  /** Las cuatro direcciones visuales candidatas. Ver docs/design/MESH-DESIGN-DECISIONS.md. */
  | 'direction'

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
  // --- direcciones visuales ---------------------------------------------------
  //
  // Cuatro apuestas sobre la misma data, para poder elegir mirando en vez de
  // discutiendo en abstracto. Cada una muestra las cinco superficies que
  // definen MESH: descubrir, perfil, gusto, match y proyecto.
  //
  // No son cuatro apps: son viñetas. Y no usan fotos — usan bloques teñidos con
  // el color de familia del estilo, porque lo que se compara es la composición
  // y una grilla que solo funciona con una foto linda no es una grilla que
  // funcione.
  //
  // El resultado de la comparación está en docs/design/MESH-DESIGN-DECISIONS.md.
  // Estas entradas se quedan después de elegir: son el registro de qué se
  // consideró, que es la mitad del valor de haberlo hecho.
  {
    id: 'direction-editorial-dark',
    name: 'A · Editorial Dark',
    category: 'direction',
    purpose:
      'Llevar hasta el final lo que MESH ya es: obra a sangre, serif grande, interfaz que casi desaparece.',
    interaction:
      'Scroll. El swipe se conserva para el mazo, que es otra superficie — esta dirección prueba que descubrir NO tiene que ser deslizar.',
    accessibility:
      'Texto sobre obra solo en el borde inferior y sobre velo de tinta; nunca sobre el centro del trabajo.',
    notes:
      'El riesgo a mirar: una obra por pantalla es contemplativa y lenta. Airbnb muestra varias opciones por pantalla porque comparar es parte de decidir.',
    component: EditorialDark,
  },
  {
    id: 'direction-warm-gallery',
    name: 'B · Warm Gallery',
    category: 'direction',
    purpose:
      'Invertir el tema: papel hueso de fondo, obra enmarcada con aire y ficha de sala debajo.',
    interaction:
      'Scroll en dos columnas desparejas. Sin superposiciones: el pie va debajo de la obra, nunca encima.',
    accessibility:
      'Riesgo concreto de contraste: los rellenos de familia de estilo tienen valores distintos por tema, y sobre papel los claros pierden. Hay que verificarlo con el test de contraste antes de promover nada.',
    notes:
      'Contradice a propósito la decisión de ThemeProvider ("el oscuro es el marco correcto para la fotografía"). Existe para poder discutirla con algo a la vista.',
    component: WarmGallery,
  },
  {
    id: 'direction-spatial-apple',
    name: 'C · Spatial Apple',
    category: 'direction',
    purpose:
      'Navegación flotante, capas y hojas contextuales: devolverle a la obra los 56pt de la barra de pestañas.',
    interaction:
      'El contenido corre por debajo de la navegación. La información sube en hojas sobre la obra, sin cambiar de pantalla.',
    accessibility:
      'La píldora es casi opaca a propósito: con vidrio real el contraste del texto depende de la obra que pase por detrás, y eso no se puede verificar con un test.',
    notes:
      'Toma los principios espaciales de iOS, no su estética. La translucidez aparece una sola vez, en la navegación, y en ningún otro lado.',
    component: SpatialApple,
  },
  {
    id: 'direction-creative-minimal',
    name: 'D · Creative Minimal',
    category: 'direction',
    purpose:
      'La única que apuesta a densidad: masonry apretado, ocho obras por pantalla, color reservado a un solo lugar.',
    interaction:
      'Comparar rápido en vez de contemplar de a una. Es lo que Airbnb hace de verdad, y lo que el brief pide tomarse en serio.',
    accessibility:
      'Tipo chica en toda la pantalla: hay que verificarla en el tamaño accesible más grande antes de promover nada.',
    notes:
      'El riesgo declarado: parecerse a Pinterest, que el brief prohíbe. La defensa es tipográfica y cromática, no estructural. Si igual se lee como Pinterest, la dirección falla.',
    component: CreativeMinimal,
  },
  // --- prototipos de interacción ----------------------------------------------
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
