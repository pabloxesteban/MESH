# Workflow — Feature nueva

Para cualquier cosa de cara al usuario. Seguí el orden; no saltes a la
implementación.

## 0. Filtro

**¿A cuál de DESCUBRIMIENTO, GUSTO, MATCHING, CONFIANZA o ACCIÓN sirve esto?**
Si a ninguno — pará. Decilo y proponé lo que sí sirve.
**¿Pertenece a V1?** V1 responde una sola hipótesis. Si la feature se construiría
igual sin importar la respuesta, probablemente no sea de V1.

## 1. Crítica — `product-critic`

Corre las diez preguntas. Lee `docs/product/product-spec.md`.
**Produce:** publicar / achicar / cortar, con una razón. Un veredicto de
"achicar" nombra explícitamente la versión más chica.

## 2. Diseño — `ux-product-designer`

Lee la spec, `docs/architecture/navigation.md`, `docs/design/`.
**Produce:** el flujo, todos los estados (carga / vacío / error + reintentar /
éxito), el copy en `es-AR`, el camino accesible sin gestos, y a dónde va la
persona desde cada estado.
**Rechaza:** cualquier cosa sin acción hacia adelante o sin botón equivalente para
un gesto.

## 3. Datos y arquitectura — `product-architect`

Solo si hacen falta entidades, campos o consultas nuevas.
**Produce:** los deltas de esquema, la forma de las consultas, si se sostiene la
agnosticidad de categoría, y un ADR si la decisión es difícil de revertir.
→ Si cambia el esquema, corré `database-change.md` antes de continuar.

## 4. Design system — `design-system-engineer`

**Produce:** qué componentes existentes se usan, cuál nuevo se justifica (usado
dos veces, o codifica una regla), qué tokens hacen falta.
**Rechaza:** cualquier valor de diseño crudo planeado para una pantalla.

## 5. Implementar — `mobile-engineer` (+ `backend-engineer`, `matching-engineer`)

Las reglas de capas se sostienen. La lógica pura va en `packages/domain`. Las
consultas en `features/<x>/queries.ts`. Los cuatro estados se construyen como
parte de la feature, no después.

## 6. Testear — `qa-engineer`

Tests unitarios para la lógica de dominio nueva. Tests de RLS para tablas nuevas.
Tests de estados de componentes. El flujo E2E afectado se vuelve a correr. Los
eventos de analytics se agregan al catálogo en el mismo commit.

## 7. Revisar — `security-reviewer`, después `performance-engineer`

Seguridad si toca datos, auth, subidas o deep links.
Performance si toca descubrimiento, perfiles, imágenes, o agrega una dependencia.

## 8. Documentar

Actualizá lo que corresponda: `product-spec.md`, un ADR, el catálogo del design
system, el catálogo de métricas, la SKILL.md relevante.

## 9. Verificar

Definición de terminado: la implementación funciona · los tipos pasan · el lint
pasa · los tests pasan · se revisó seguridad · existen los cuatro estados · se
consideró accesibilidad · la documentación está actualizada · pasada manual en
dispositivo si hay gestos o imágenes involucrados.

## Camino rápido

Un cambio de copy, un ajuste de token o un arreglo de bug no necesita los nueve
pasos. Igual necesita: tests, los cuatro estados intactos, y lint. Criterio, no
ceremonia — pero el filtro del paso 0 nunca se saltea para nada nuevo.
