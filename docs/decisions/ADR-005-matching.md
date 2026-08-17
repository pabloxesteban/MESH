# ADR-005 — Matching determinístico, y bandas en lugar de porcentajes

**Estado:** Aceptado (2026-08-17) · **Fecha:** 2026-08-17 · **Responsable:** matching-engineer

## Contexto

El diferencial de MESH es que recomienda *personas* en base a gusto demostrado, y
explica por qué. V1 tiene 8–15 artistas, todos en CABA, y usuarios con una docena
de interacciones cada uno.

## Problema

Dos preguntas. ¿Qué computa la recomendación? ¿Y cómo se presenta su confianza?

## Opciones — cómputo

**A. Puntaje determinístico ponderado** sobre un vector de gusto explícito.
**B. Filtrado colaborativo.** Necesita usuarios que no tenemos.
**C. Similitud por embeddings** (CLIP sobre las obras, coseno contra centroides
de artista). Genuinamente mejor para capturar estilo visual que las etiquetas — y
no explicable, no versionable de la misma manera, y dependiente de
infraestructura de inferencia.
**D. Ranking por LLM.** No determinístico, no testeable, y con toda la
disposición a inventar razones.

## Opciones — presentación

**W. Porcentaje numérico** ("96% de match"), como ilustra el brief.
**X. Banda** (Fuerte / Bueno / Posible).
**Y. Solo ranking** (una lista ordenada, sin fuerza).

## Decisión

**A** para el cómputo. **X** para la presentación, conservando el puntaje
numérico internamente, guardado en `matches.score`, y visible en builds de debug.

El algoritmo completo está especificado en
[`docs/product/matching.md`](../product/matching.md).

## Por qué — determinismo

Toda recomendación tiene que ser explicable a quien la recibe, reproducible en un
test, y defendible cuando está equivocada. El puntaje determinístico da las tres
cosas; nada más de la lista da ninguna. Además no cuesta nada correrlo y se puede
testear por unidad sin simulador ni red.

Los embeddings (C) son la respuesta real a largo plazo para el estilo visual —
las etiquetas no pueden distinguir a dos artistas que ambos dicen "fine line" y
se ven completamente distintos. La secuencia correcta es: publicar la versión
explicable, aprender qué significa "estilo" para los usuarios, y después agregar
embeddings **como un componente puntuado adicional con su propia explicación**,
no como reemplazo del razonamiento.

## Por qué — bandas, en contra del brief

El ejemplo del brief muestra "96% de match". Con 8–15 artistas en una ciudad, los
puntajes se van a agrupar en un rango angosto, y diferencias chicas de etiquetado
van a mover el porcentaje mostrado varios puntos sin significar nada. De ahí se
siguen dos problemas:

1. **Es una afirmación de precisión que los datos no sostienen.** Dos cifras
   significativas afirman una resolución que no tenemos.
2. **Invita a la incredulidad.** La primera reacción de una persona escéptica
   ante "96%" es "¿basado en qué, exactamente?" — y si la respuesta es "once
   toques", el número socava las razones que están justo al lado. Las razones son
   lo que efectivamente persuade.

Las bandas rankean igual de bien, se degradan con gracia a medida que crece el
catálogo, y son honestas sobre la resolución. Por debajo de 0,40 no se muestra
nada — una lista corta es mejor que una rellenada.

**Cambiaríamos a porcentajes cuando:** el catálogo sea lo bastante grande como
para que los puntajes se distribuyan en el rango, el etiquetado de estilos esté
validado contra la autodescripción de los artistas, y tengamos evidencia de que
los usuarios leen el número como relativo y no como absoluto.

## Otras decisiones registradas acá

- **Los componentes faltantes se omiten y los pesos se renormalizan**, nunca
  puntúan cero. Un artista que no publicó precio no es un peor match; solo
  sabemos menos.
- **La disponibilidad vieja (>45 días) se trata como desconocida.** Afirmar una
  frescura que no tenemos es la misma clase de error que inventar una reseña.
- **Las razones salen de un conjunto cerrado de plantillas**, emitidas solo para
  componentes que aportaron ≥ 0,10 del puntaje, con tope de tres. Sin prosa
  generada.
- **El orden del descubrimiento no está guiado por el gusto** en V1 — eso haría
  que la entrada del motor de gusto sea una función de su propia salida y
  construiría una burbuja antes de que el perfil sea confiable.

## Consecuencias

- La calidad del match está acotada por la calidad del etiquetado. El etiquetado
  se vuelve un problema de calidad de contenido, y los artistas tienen que poder
  corregir sus propias etiquetas.
- Los límites de banda (0,75 / 0,55 / 0,40) son supuestos y van a necesitar
  calibración contra distribuciones reales cuando haya datos.
- Guardar `components` y `reasons` en cada fila de match permite auditar meses
  después "¿por qué MESH dijo eso?".
- Cualquier cambio de peso sube `MATCHING_VERSION`, invalida los matches
  cacheados, y obliga a que este documento cambie con él.
