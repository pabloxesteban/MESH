# Investigación de UX — MESH

Este directorio es la evidencia detrás de las decisiones de interacción de
MESH. Existe porque el prompt que lo originó tenía razón en una cosa: MESH no
debería apoyarse solo en la memoria del modelo sobre patrones de interfaz.

## El bucle

```
investigar → juntar patrones → analizar → armar hipótesis → prototipar
  → probar → criticar → implementar → medir → aprender → investigar de nuevo
```

`ux-researcher` hace las primeras cinco vueltas. `interaction-designer` prototipa
en `apps/mobile/src/playground/`. `product-critic` audita con las diez
preguntas de interacción antes de que algo entre a producción. Nada de esto
reemplaza medir con gente real usando la app — la investigación reduce el
riesgo de una apuesta, no lo elimina.

## Qué hay acá

| Documento | Qué cubre |
|---|---|
| [`2026-trends.md`](2026-trends.md) | Reporte de tendencias 2026, por área (navegación, gestos, tipografía, performance…) |
| [`2027-hypotheses.md`](2027-hypotheses.md) | Apuestas especulativas, explícitamente marcadas como tales |
| [`mobile-patterns.md`](mobile-patterns.md) | Hojas inferiores, transiciones de elemento compartido, física de tarjetas |
| [`navigation-research.md`](navigation-research.md) | Pestañas, alcance del pulgar, patrones de navegación móvil |
| [`onboarding-research.md`](onboarding-research.md) | Divulgación progresiva, formularios conversacionales |
| [`interaction-research.md`](interaction-research.md) | Revelación de match, swipe, por qué las apps de citas se están alejando del swipe |
| [`motion-research.md`](motion-research.md) | Qué ya existe en `tokens/motion.ts`/`haptics.ts` y qué falta |
| [`competitive-analysis.md`](competitive-analysis.md) | Los productos de referencia, evaluados críticamente y no copiados |
| [`ux-benchmark.md`](ux-benchmark.md) | La tabla de referencia rápida, un patrón por fila |
| [`patterns/`](patterns) | Investigaciones puntuales de `/research-pattern` |
| [`decisions/`](decisions) | Decisiones de UX con su justificación, una por archivo |
| [`MESH-UX-STRATEGY.md`](MESH-UX-STRATEGY.md) | La síntesis — el documento que alguien lee si solo va a leer uno |

## Lo que este directorio NO es

No es una lista de features para construir. La mayoría de lo que investigamos
se marca **Rechazar** o **Experimentar en playground, no en producción** — ver
`MESH-UX-STRATEGY.md §"Qué no vamos a construir"`. Investigar un patrón no es
un compromiso de implementarlo.

## Jerarquía de fuentes

Nivel 1 (guías oficiales de plataforma, productos reales enviados) > Nivel 2
(NN Group, publicaciones de diseño con proceso editorial) > Nivel 3 (blogs,
reportes de tendencias) > Nivel 4 (opiniones sueltas, solo como termómetro).
Cada documento cita de dónde sale cada afirmación, con fecha.
