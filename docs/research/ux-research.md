# Investigación de UX — cómo funciona el proceso en MESH

Este documento es el meta: explica el proceso, no un patrón puntual. Para
patrones concretos ver los demás archivos de este directorio.

## Por qué existe este proceso

Un modelo de lenguaje tiene una memoria fuerte pero desactualizada y sesgada
hacia lo que más se escribió sobre diseño — que no es lo mismo que lo que
mejor funciona hoy en productos reales. `ux-researcher` existe para reemplazar
"me parece que..." por "esto se ve en N productos reales, por esta razón, con
esta fuente y esta fecha".

## Las cinco condiciones antes de recomendar "Usar"

Repetidas acá porque son el filtro más importante de todo el proceso (están
también en `.claude/agents/ux-researcher.md`):

1. Resuelve un problema real de alguien que usa MESH.
2. Encaja con lo que MESH es.
3. Se puede implementar de forma confiable con el stack actual.
4. No daña usabilidad, accesibilidad ni rendimiento.
5. No hace que MESH se sienta genérico.

Un patrón que falla cualquiera de las cinco no entra, sin importar cuántos
productos lo usen.

## Lo que la investigación de este ciclo encontró, en una línea cada una

- **Hojas inferiores**: usar, es un componente de plataforma sin riesgo de
  marca. Ver `mobile-patterns.md`.
- **Transición de elemento compartido**: adaptar con cautela, la API de
  Reanimated/Expo Router está en beta. Ver `mobile-patterns.md`.
- **Física de arrastre de tarjetas**: ya construida y coincide con el patrón
  observado en productos reales — no hay nada que cambiar. Ver
  `mobile-patterns.md`.
- **El swipe como mecánica central**: la propia industria de citas se está
  alejando de él hacia matching por IA — MESH no puede seguir ese camino por
  la prohibición de ML/LLM en `CLAUDE.md`, así que la respuesta correcta es el
  motor de matching determinístico que ya existe, comunicado mejor. Ver
  `interaction-research.md` y `decisions/no-ai-matching.md`.
- **Formulario conversacional para el proyecto**: adaptar parcialmente,
  empezando por el paso de estilos, midiendo antes de fragmentar todo. Ver
  `onboarding-research.md`.
- **Pestañas inferiores y objetivo táctil de 44pt**: ya implementado y
  coincide con la evidencia — nada que cambiar. Ver `navigation-research.md`.
- **Sistema de movimiento y hápticos**: ya existe, más estricto que lo que
  pedía la investigación original. No se reconstruye. Ver
  `motion-research.md`.
- **Reducción de movimiento y alternativas sin gesto**: ya se cumple, y
  resulta ser requisito normativo (WCAG), no solo buena práctica. Ver
  `motion-research.md`.

## Qué queda pendiente para el próximo ciclo

- Cómo comunicar "apareció un match nuevo" sin notificación carnada — ver
  `interaction-research.md §"Qué reemplaza al reveal"`.
- Variedad de composición en el feed de descubrimiento (masonry, tarjetas
  editoriales) más allá de la tarjeta única actual — mencionado en
  `2026-trends.md` pero sin prototipo todavío.
- Medir si dividir el formulario de proyecto reduce o aumenta el abandono,
  antes de decidir cuánto dividirlo.

Estos tres son candidatos para el próximo `/research-ux`, no compromisos de
implementación.
