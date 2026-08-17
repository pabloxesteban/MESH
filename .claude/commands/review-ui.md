---
description: Revisar una pantalla contra las reglas de UX, accesibilidad, design system y marca de MESH.
---

Revisá esta pantalla: **$ARGUMENTS** (por defecto: las pantallas modificadas en el
diff actual).

Corré `.claude/workflows/ui-review.md` completo, tomando los roles de
`ux-product-designer`, `design-system-engineer`, `brand-designer` y
`product-critic`, en ese orden.

Reportá como checklist con ✅ / ❌ / ⚠️ por ítem, y después una lista corta de
cambios requeridos ordenados por impacto. Sé específico: "esta pantalla termina en
un estilo y no hay ningún camino hacia una persona" le gana a "se siente
incompleta".

Marcá como bloqueante, no como sugerencia:
- un estado de carga / vacío / error + reintentar faltante
- un gesto sin botón equivalente de ≥44pt con etiqueta
- un callejón sin salida (sin acción hacia adelante desde algún estado)
- un valor de diseño crudo en una pantalla
- cualquier cosa inventada o inferida más allá de los datos
- un dark pattern de cualquier tamaño
