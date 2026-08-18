# MESH — Reporte de tendencias UX/UI 2026

Investigado 2026-08-18 por `ux-researcher`. Cada afirmación lleva una
etiqueta: **TENDENCIA OBSERVADA** (aparece en productos reales enviados, con
fuente), **TENDENCIA ESPECULATIVA** (aparece en predicciones, no confirmada en
producto) o **OPORTUNIDAD MESH** (cómo se traduciría en una pantalla concreta,
si pasa el filtro de cinco condiciones).

Color, tipografía y sistemas visuales ya tienen su propio reporte completo en
[`docs/design/trends-2026.md`](../design/trends-2026.md) — no se repite acá,
se enlaza. Este documento cubre lo que ese no cubre: navegación, gestos,
onboarding, personalización, hojas, performance y accesibilidad.

## Navegación

**OBSERVADA.** Pestañas inferiores por sobre navegación superior, por alcance
del pulgar. [UXCam 2026](https://uxcam.com/blog/mobile-ux/). — MESH ya lo
implementa. Ver `navigation-research.md`.

## Gestos

**OBSERVADA.** La industria de citas —el hogar histórico del swipe como
mecánica de producto— se está alejando de él hacia recomendación curada.
[Tinder Alternatives 2026](https://appmakersla.com/blog/popular-apps/tinder-alternatives/).
**OPORTUNIDAD MESH:** ninguna acción nueva — refuerza que el swipe de MESH es
un método de entrada, con matching determinístico detrás y no decoración. Ver
`interaction-research.md`.

**OBSERVADA.** Física de arrastre gesto-primero: sin easing durante el
arrastre, resorte con velocidad conservada al soltar. Coincide en múltiples
fuentes independientes. Ver `mobile-patterns.md`. — Ya construido en MESH.

## Onboarding

**OBSERVADA.** Divulgación progresiva y formularios conversacionales — una
pregunta por pantalla — para reducir carga cognitiva.
[UXPin 2026](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/).
**OPORTUNIDAD MESH:** dividir el paso de estilos del formulario de proyecto,
medir antes de dividir el resto. Ver `onboarding-research.md`.

## Personalización

**OBSERVADA, y explícitamente NO adoptable.** El reemplazo del swipe que eligió
la industria es matching por IA conversacional. `CLAUDE.md` prohíbe ML/LLM en
el camino de recomendación de forma innegociable — así que esta tendencia se
observa y se descarta explícitamente, no por desconocerla sino por decisión de
producto documentada. Ver `decisions/no-ai-matching.md`.

## Movimiento

Ver [`docs/design/trends-2026.md` §3](../design/trends-2026.md) para la
distinción central (vivo vs. adictivo) y `motion-research.md` para el
inventario técnico. **OBSERVADA:** MESH ya tiene un sistema de movimiento y
hápticos más disciplinado que lo que las fuentes genéricas describen como
buena práctica (techo de duración impuesto por test, no por convención).

## Microinteracciones

Ver `docs/design/trends-2026.md` §1 para la investigación de retención — con
la advertencia ya escrita ahí sobre magnitudes de fuentes de agencia, no de
estudios controlados.

## Tarjetas

**OBSERVADA.** Layouts masonry (altura variable) para reducir la sensación de
monotonía en un feed de descubrimiento.
[Colorlib 2026](https://colorlib.com/wp/masonry-grid-wordpress-themes/). Nivel
3, patrón visual bien establecido igual. **OPORTUNIDAD MESH:** el mazo es de a
una tarjeta por diseño (es una decisión, no una tarjeta) — masonry aplicaría
solo a una vista de portafolio o de "explorar" que hoy no existe en V1. Sin
prototipo todavía; ver pendientes en `ux-research.md`.

## Hojas inferiores

**OBSERVADA.** Componente estándar de plataforma con puntos de ajuste. Ver
`mobile-patterns.md`. **OPORTUNIDAD MESH:** detalle de estilo, explicación de
match, filtros.

## Accesibilidad

**OBSERVADA, y es la que más importa de este reporte.** Los requisitos de
alternativa sin gesto (WCAG 2.5.1/2.5.7) y de movimiento reducido (2.5.4) no
son sugerencias de diseño — son criterios normativos.
[WCAG 2.5.4](https://dockaccess.org/documentation/wcag-success-criteria/wcag254/).
MESH ya cumple los tres. Ver `motion-research.md`.

## Performance

No investigado en este ciclo con fuentes externas — MESH ya tiene su propio
skill de `performance` y presupuestos documentados en
`docs/architecture/system-architecture.md`. Pendiente para un ciclo futuro si
aparece evidencia de que algo específico de discovery/imágenes necesita
revisión.

## UX asistida por IA

**OBSERVADA en la industria, explícitamente fuera del alcance de MESH.** Ver
Personalización arriba. No hay "adaptación parcial" posible acá — es un límite
duro de `CLAUDE.md`, no una cuestión de grado.

## Interfaces adaptativas

**No investigado con evidencia externa este ciclo.** El pedido original
describe "MESH se adapta gradualmente al comportamiento" — es una idea
razonable en principio (menos onboarding para alguien con perfil de gusto
fuerte) pero se necesita evidencia y un límite escrito contra que se convierta
en personalización manipuladora antes de recomendar nada. Marcado como
hipótesis en `2027-hypotheses.md`, no como tendencia confirmada.

## UX entre dispositivos

**Fuera de alcance.** MESH V1 es mobile-first sin versión de escritorio
planeada — ver `docs/product/roadmap.md`. No investigado.

---

## Qué de esto ya está construido en MESH

Pestañas inferiores y objetivo táctil de 44pt · sistema de movimiento y
hápticos semánticos · física de arrastre de tarjetas · alternativa sin gesto
en todo gesto · reducción de movimiento.

## Qué está en el playground

Ver `apps/mobile/src/playground/`: hoja inferior, transición de elemento
compartido, y los controles ajustables de física de arrastre.

## Qué queda solo como hallazgo, sin decisión

División del formulario de proyecto (falta medir) · variedad de composición
del feed (falta prototipo) · comunicación de "match nuevo" (falta
investigación).
