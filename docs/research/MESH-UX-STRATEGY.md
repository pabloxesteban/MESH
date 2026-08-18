# MESH — Estrategia de UX

**Estado:** Vivo · **Responsables:** `ux-researcher`, `interaction-designer`,
`ux-product-designer` · **Última síntesis:** 2026-08-18

Este es el documento que alguien lee si solo va a leer uno. Sintetiza todo lo
demás en `docs/research/` — no repite el detalle, lo enlaza.

## 1 · Filosofía de UX de MESH

MESH no es una colección de pantallas. Es un sistema de interacción con un
solo trabajo: que descubrir a alguien se sienta como reconocer algo, no como
completar un formulario. Cada decisión de esta estrategia se mide contra una
sola pregunta: ¿esto ayuda a que la persona sienta que MESH entendió lo que le
gusta, sin fingir que entiende más de lo que sabe?

## 2 · El recorrido central

```
"Me gusta esto."
  ↓
"¿Quién lo hizo?"
  ↓
"Me gusta su trabajo."
  ↓
"Entendieron mi gusto."
  ↓
"Esta persona podría ser la indicada."
  ↓
"Hagámoslo."
```

Cada pantalla de MESH tiene que poder ubicarse en un escalón de este
recorrido. Una pantalla que no avanza ningún escalón —o que retrocede uno,
distrayendo con algo que no es del recorrido— no pertenece a V1. Es la misma
prueba que ya aplica `product-critic` con su filtro de DESCUBRIMIENTO / GUSTO
/ MATCHING / CONFIANZA / ACCIÓN; este recorrido es la versión narrada de ese
filtro.

## 3 · Principios de interacción

1. **El movimiento comunica o no existe.** Ver `motion-research.md` y el
   comentario de cabecera de `tokens/motion.ts`.
2. **El swipe es una entrada, no una identidad.** Ver
   `interaction-research.md` — la propia industria de citas se está alejando
   de él; MESH nunca dependió de él para su identidad, ver
   `product-critic.md §6`.
3. **Ningún gesto es la única forma.** Impuesto por `CLAUDE.md` y confirmado
   como requisito normativo real por WCAG 2.5.1/2.5.7 — ver
   `motion-research.md`.
4. **Formulario, cuando puede, se vuelve interacción** — pero solo donde
   dividir de verdad reduce fricción, medido, no supuesto. Ver
   `onboarding-research.md`.
5. **La explicación es parte de la interfaz, no un anexo.** Una razón de match
   que no se puede mostrar no se calcula. Ver `docs/product/matching.md`.

## 4 · Principios de navegación

Pestañas inferiores, alcance del pulgar, objetivo táctil ≥44pt — ya
implementado, confirmado por evidencia. Ver `navigation-research.md`. Nota
abierta: `docs/architecture/navigation.md` describe una estructura de rutas
desactualizada respecto del código real; no es parte de esta estrategia
corregirlo, pero queda señalado para quien toque navegación después.

## 5 · Lenguaje de gestos

| Gesto | Acción | Alternativa con botón |
|---|---|---|
| Arrastre horizontal | Pasar / Me gusta | Botones ≥44pt en pantalla |
| Arrastre vertical arriba | Guardar | Botón Guardar |
| Toque | Inspeccionar | — |
| Toque prolongado | Menú contextual (futuro) | Cada acción, accesible por separado |
| Deslizar abajo | Cerrar hoja | Botón de cerrar |

Detalle completo en `.claude/agents/interaction-designer.md`. Ningún gesto de
esta tabla es nuevo respecto de lo ya construido en `SwipeCard.tsx`.

## 6 · Lenguaje de movimiento

Ya existe en `tokens/motion.ts`: duraciones `instant/quick/standard/reveal`
con techo de 500ms impuesto por test, resortes `standard`/`deck`, reducción de
movimiento reemplazando transformación por fundido corto. Ver
`motion-research.md` para la comparación completa contra lo que pedía el
prompt original — ya lo supera.

## 7 · Lenguaje háptico

Ya existe en `tokens/haptics.ts`: intenciones semánticas
`like/save/match/destructive/error/none`, nunca por scroll ni por frame,
nunca al pasar. No se reconstruye.

## 8 · Estrategia de onboarding

MESH no tiene onboarding de carrusel — es un anti-patrón que
`ux-product-designer` ya rechaza explícitamente. La "primera experiencia" es
la primera obra del mazo, sin pedir permisos ni registro antes. Lo único
candidato a divulgación progresiva es el formulario de proyecto, y solo
parcialmente — ver `onboarding-research.md`.

## 9 · Estrategia de descubrimiento de gusto

El vector de gusto (`packages/domain/src/taste`) ya es determinístico,
explicable y versionado. La estrategia de UX no cambia el motor — cambia cómo
se *muestra* el resultado: la pantalla de Gusto como un momento con peso
propio (degradado de marca, barras por estilo que crecen), no una tabla de
configuración. Ya construido.

## 10 · UX de matching

La banda de encaje (fuerte/bueno/posible) es color de marca hacia neutro, no
semáforo — un encaje posible no es un error. Ya construido en
`MatchesScreen.tsx`. Pendiente de investigación: cómo comunicar que apareció
un match nuevo, sin notificación carnada. Ver `interaction-research.md`.

## 11 · UX de portafolio

Pendiente de prototipo: transición de elemento compartido entre la tarjeta del
mazo y el detalle del perfil. Ver `mobile-patterns.md` — confianza media,
depende de estabilidad de una API en beta.

## 12 · UX del armador de proyecto

Adaptar parcialmente la divulgación progresiva, empezando por el paso de
estilos, con medición antes de dividir el resto. Rechazado explícitamente: un
paso de "elegí tu categoría" mientras V1 sea mono-categoría — fricción sin
decisión real detrás. Ver `onboarding-research.md`.

## 13 · Estrategia de accesibilidad

Ya se cumple: alternativa sin gesto en todo gesto, movimiento reducido
respetado, objetivo táctil ≥44pt, y ahora con evidencia de que estos tres no
son preferencia de estilo sino requisito normativo (WCAG 2.5.1/2.5.4/2.5.7).
Ver `motion-research.md`.

## 14 · Estrategia de performance

Fuera de alcance de este ciclo de investigación — MESH ya tiene su propio
skill de `performance` y presupuestos en `docs/architecture/system-architecture.md`.
No se investigó con fuentes externas nuevas.

## 15 · Tendencias 2026

Ver `2026-trends.md` completo. Resumen: pestañas inferiores, física de
arrastre gesto-primero, y accesibilidad normativa ya están cubiertas por lo
existente. Hojas inferiores y divulgación progresiva son las dos
oportunidades reales sin construir todavía.

## 16 · Hipótesis 2027

Ver `2027-hypotheses.md` completo — tres apuestas, ninguna autoriza
construcción todavía. La más relevante: curaduría explícita gana terreno sobre
ranking algorítmico opaco en catálogos chicos, que es exactamente donde MESH
ya está parado.

## 17 · Patrones competitivos

Ver `competitive-analysis.md` — doce productos evaluados, ninguno recomendado
para copia directa. El patrón que se repite: cada producto resuelve un
problema bien y falla apenas se lo estira fuera de ese problema.

## 18 · Patrones a evitar

Rachas, puntos, niveles, insignias, escasez o urgencia falsas, notificaciones
carnada, límites artificiales, semáforo verde/rojo para me gusta/paso,
personalización que optimiza tiempo en pantalla en vez de relevancia, IA
conversacional en el camino de recomendación, un paso de categoría cuando hay
una sola categoría. Todos ya prohibidos por `CLAUDE.md` o por esta
investigación; ninguno es una zona gris.

## 19 · Firmas de interacción propias de MESH

De las ocho candidatas del pedido original, dos ya están construidas
(física de arrastre, banda de encaje sin semáforo) y son las firmas reales de
MESH hoy. Las otras seis (mapa de gusto como grafo de nodos, revelación
editorial de match, morphing de pestañas, navegación conectada, discovery
adaptativo, comparaciones "esto o lo otro") son **candidatas sin prototipar**,
no compromisos. El "mapa de gusto" en particular es la más arriesgada: un
grafo de nodos puede comunicar "sofisticación algorítmica" que MESH
explícitamente no tiene — si se prototipa, tiene que dejar clarísimo que
representa la evidencia real (support/likes/saves por estilo), no una
relación matemática entre estilos que MESH no calcula. Ver el prototipo de
`TasteMapLab` en el playground, marcado explícitamente como experimental.

## 20 · Hoja de ruta de UX

**Ahora (este ciclo):** agentes de investigación, comandos, playground con
prototipos reales de física de arrastre, hoja inferior y transición de
elemento compartido — ver más abajo.

**Próximo ciclo, con medición real:** dividir el paso de estilos del
formulario de proyecto y medir `project_started` → `project_created`.

**Pendiente de investigación, no de construcción:** comunicación de match
nuevo, variedad de composición del feed, interfaces adaptativas (con el
límite anti-manipulación escrito antes de prototipar nada).

**Rechazado, no vuelve a evaluarse salvo que `CLAUDE.md` cambie:** matching
por IA conversacional.

---

## El UX Playground

`apps/mobile/src/playground/` es un laboratorio, no producción. No está
enlazado desde ninguna pestaña real — se accede por una ruta de desarrollo
(`app/_playground.tsx`, activa solo con `__DEV__`) para que nunca aparezca en
un build de release por accidente.

**Se construyeron tres prototipos reales en este ciclo**, no los quince que
describía el pedido original — siguiendo la instrucción explícita del mismo
pedido de no implementar todo automáticamente. Los otros doce quedan como
entradas nombradas en el índice del playground, marcadas "sin construir",
para que quede a la vista qué se investigó y decidió no construir todavía
(comparadas contra el filtro de cinco condiciones) versus qué directamente no
pasó el filtro:

| Prototipo | Estado | Por qué |
|---|---|---|
| Física de arrastre (`SwipePhysicsLab`) | **Construido** | Ya en producción; el prototipo expone los parámetros para ajustarlos con la mano |
| Hoja inferior (`BottomSheetLab`) | **Construido** | Componente de plataforma, bajo riesgo, aplicación clara (detalle de estilo, por qué del match) |
| Mapa de gusto (`TasteMapLab`) | **Construido, marcado experimental** | El propio pedido original lo marca así explícitamente; se construyó para poder evaluarlo, no para promoverlo |
| Pila de tarjetas | Sin construir | Se solapa con lo que `SwipePhysicsLab` ya cubre — la tarjeta de atrás ya escala/traduce en el `SwipeCard` real |
| Toque para dar me gusta | Sin construir | Es una variación menor del gesto ya construido, no amerita un prototipo aparte todavía |
| Elegí uno (comparación A/B) | Sin construir | Depende de tener el motor de "exploración" que hoy no existe — prematuro |
| Formación de gusto (barras animadas) | Sin construir | Ya existe en producción en `TasteScreen`, con degradado de marca — no hace falta un prototipo aislado de algo que ya se ve en la app |
| Esto o lo otro | Sin construir | Mismo motivo que "Elegí uno" |
| Sorpréndeme | Sin construir | Requiere una decisión de producto (¿el matching explora fuera del gusto dominante?) antes de tener sentido como prototipo de interfaz |
| Transición de elemento compartido | **Construido** | Ver tabla de arriba — el vacío real encontrado en `mobile-patterns.md` |
| Morphing de pestañas | Sin construir | Alto riesgo de motion sin beneficio claro — no pasó el filtro de "¿qué información comunica?" sin evidencia adicional |
| Interacción de guardar | Sin construir | Variación menor sobre hápticos ya existentes |
| Toque prolongado | Sin construir | No hay todavía acciones contextuales suficientes para justificar un menú |
| Revelación de match | Sin construir | Ya resuelto en producción sin necesidad de reveal (`MatchesScreen` sin semáforo) — ver `interaction-research.md` |
| Armador de proyecto | Sin construir | El experimento real es A/B con medición en producción, no un prototipo aislado — ver §12 |

**Promover un prototipo a producción no es automático.** Necesita el visto
bueno de `design-system-engineer` (consistencia de tokens),
`mobile-engineer` (calidad técnica) y `product-critic` (valor de producto,
con las diez preguntas de interacción) — ninguno de los tres prototipos
construidos en este ciclo se promovió todavía; están para poder evaluarse con
las manos, no leyendo código.
