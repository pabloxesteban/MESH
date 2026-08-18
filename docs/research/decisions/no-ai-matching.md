# Decisión — MESH no sigue a la industria hacia matching por IA

**Fecha:** 2026-08-18 · **Contexto:** investigación de UX sobre el reveal de
match y el lugar del swipe (`interaction-research.md`).

## La tensión

La investigación encontró que la industria de citas —el origen del patrón que
el pedido original quería evitar copiar— se está alejando del swipe hacia
matching dirigido por un asistente de IA que entrevista y recomienda
directamente (Bumble, y en dirección similar Tinder y Hinge).

Eso podría leerse como una razón para que MESH agregue algo similar: un
asistente conversacional que entienda el gusto de la persona y recomiende.

## La decisión

No. `CLAUDE.md`, innegociable 1: *"Nada de ML ni LLM en el camino de
recomendación. La función de matching es determinística, versionada y con
tests unitarios."*

Esto no es una omisión por desconocer la tendencia — es una decisión tomada
con la tendencia sobre la mesa y rechazada explícitamente.

## Por qué la decisión sigue siendo correcta con esta evidencia nueva

El problema real que ese patrón resuelve no es "usar IA", es reducir la
sensación de estar barajando fotos al azar sin criterio. MESH ya resuelve ese
problema con un mecanismo distinto: un vector de gusto calculado por
`packages/domain` y una función de matching determinística con razones
derivadas de componentes reales. La ventaja de MESH sobre "matching por IA" no
es que sea más simple — es que es **auditable**: se puede explicar exactamente
por qué se puntuó a alguien de una forma, se puede testear, y no puede
inventar una razón que no existe.

## Lo que sí cambia por esta investigación

Nada en el motor. Lo que puede mejorar es la *comunicación* de ese motor —
que la pantalla de Gusto y la de Matches transmitan "MESH entendió tu gusto"
con la misma fuerza emocional que un asistente conversacional, sin ser uno.
Ver `interaction-research.md §Aplicación a MESH`.

## Quién puede revisar esta decisión

Nadie, sin que `CLAUDE.md` cambie primero. Este documento no es una propuesta
abierta a discusión de UX — registra por qué una tendencia externa NO se
adoptó, para que la próxima vez que alguien encuentre la misma evidencia no
tenga que investigar de nuevo si ya se consideró.
