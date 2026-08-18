# Investigación de onboarding — formulario como conversación

Investigado 2026-08-18. Cubre el pedido de "transformar formulario en
interacción", puntualmente para el armado de un proyecto.

## Divulgación progresiva y formularios conversacionales

**Patrón.** Mostrar una sola pregunta o sección por pantalla en vez de un
formulario largo de una vez, reduciendo carga cognitiva. La variante más
inmersiva —el "formulario conversacional"— hace cada pregunta ocupar su propia
pantalla, en tono de diálogo.

**Por qué importa.** El costo cognitivo de un formulario largo no es la
cantidad de campos, es verlos todos a la vez. [Progressive Disclosure UX 2026 — UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/),
[Progressive Disclosure — LogRocket](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/).
Nivel 2/3, patrón bien establecido y no controvertido.

**Dónde se usa.** Onboarding de Nike, según la misma fuente, usa exactamente
este patrón: una pregunta por pantalla.

**Fortalezas.** Reduce abandono en formularios largos; cada pantalla se puede
optimizar sola (una pregunta, una respuesta, un siguiente paso claro).

**Debilidades.** Más pantallas significa más toques para llegar al final —si
cada pantalla no se siente rápida, el costo total es peor que un formulario
corto de una vez. También es más fácil de sobre-fragmentar: dividir un
formulario de 4 campos en 4 pantallas no es progresivo, es lento.

**Aplicación a MESH — el armado de proyecto.** El flujo ya existe como una
sola pantalla larga (`ProjectFormScreen.tsx`): título, descripción, estilos,
presupuesto, timing, referencias, ubicación. Es candidato real para
divulgación progresiva, pero con un límite explícito: **MESH no tiene
"IA conversacional" ni copy generado**, así que "conversacional" acá significa
tono editorial fijo por pantalla, no un diálogo dinámico. Cada pregunta ya
tiene su copy en `es-AR` en el archivo actual — dividir el formulario no
inventa copy nuevo, reorganiza el que ya existe.

**Riesgo para MESH.** Medio. El pedido original describe el project builder
como "una pregunta, una tarjeta grande, sin botón Siguiente" — eso es
exactamente el patrón de Tinder/Bumble aplicado a un formulario, y
`product-critic` tiene que evaluarlo con las mismas diez preguntas de
interacción antes de construirlo. Fragmentar demasiado un formulario de 7
campos en 7 pantallas separadas podría hacer MÁS lento completarlo, no menos —
la reducción de fricción no es automática por dividir.

**Recomendación.** Adaptar, con medición. No dividir todo el formulario a
ciegas: dividir primero **estilos** (ya es una selección visual con chips, se
presta a una pantalla propia con las tarjetas grandes) y medir si la tasa de
completitud de `project_started` → `project_created` mejora antes de tocar el
resto. Prototipo en playground: `ProjectBuilderLab`, con las variantes
"formulario único" (control, lo que ya existe) y "una pregunta por pantalla"
para poder compararlas. **Confianza.** Media — el principio está bien
establecido, el tamaño correcto de la división para MESH específicamente no
está probado.

## Lo que NO se adapta

El pedido original describe pasos como "¿Qué estás pensando?" con tarjetas de
categoría (Tatuaje, Foto, Diseño). MESH V1 es una sola categoría (tatuaje) —
ver `CLAUDE.md`: "el núcleo es agnóstico de categoría" es una regla de
*esquema*, no una instrucción de mostrarle a la persona un selector de
categorías que hoy tiene una sola opción. Un paso de "elegí tu categoría"
cuando hay una sola opción es fricción sin decisión real detrás — se rechaza
directo, sin necesidad de prototipo.

**Recomendación.** Rechazar el paso de selección de categoría mientras V1 sea
mono-categoría. **Confianza.** Alta.
