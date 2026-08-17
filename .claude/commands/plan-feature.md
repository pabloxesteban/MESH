---
description: Planificar una feature pasando por el filtro de MESH — crítica, UX, arquitectura, y los pasos exactos de implementación.
---

Planificá la siguiente feature para MESH: **$ARGUMENTS**

Seguí los pasos 0–4 de `.claude/workflows/new-feature.md`. No escribas código de
implementación en este comando.

1. **Filtro.** Nombrá a cuál de DESCUBRIMIENTO / GUSTO / MATCHING / CONFIANZA /
   ACCIÓN sirve. Si a ninguno, decilo y pará, con una recomendación en su lugar.
2. **Crítica** como `product-critic`: publicar, achicar o cortar — con una razón.
   Un veredicto de "achicar" tiene que nombrar la versión más chica.
3. **UX** como `ux-product-designer`: el flujo, los cuatro estados, el copy en
   `es-AR`, el camino sin gestos, y a dónde va la persona desde cada estado.
4. **Arquitectura** como `product-architect`, si cambian los datos: deltas de
   esquema, forma de las consultas, chequeo de agnosticidad de categoría, si hace
   falta un ADR o no.
5. **Design system** como `design-system-engineer`: componentes existentes que se
   usan, nuevos justificados, tokens necesarios.

Terminá con una lista numerada de **tareas exactas de implementación** en orden
de dependencia, cada una lo bastante chica como para ser un solo commit, y los
tests que necesita cada una.

Leé `docs/product/product-spec.md` y los ADRs relevantes antes de responder.
