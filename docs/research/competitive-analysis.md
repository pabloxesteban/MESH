# Análisis competitivo — evaluado, no copiado

Investigado 2026-08-18. El pedido original nombra una lista de productos de
referencia. Este documento los evalúa **críticamente** — la instrucción
explícita es "no asumas que estos productos son automáticamente buenas
referencias" — en vez de tratarlos como catálogo a imitar.

Para cada uno: qué resuelve bien, qué no le sirve a MESH, y si su patrón
central ya pasó por el filtro de cinco condiciones de `ux-researcher`.

| Producto | Qué resuelve bien | Por qué NO copiarlo directo |
|---|---|---|
| **Pinterest** | Descubrimiento visual sin fricción, masonry que varía tamaño | `product-critic` §3 ya lo marca: si una feature se queda en "qué me gusta" y nunca llega a una persona, es Pinterest. MESH tiene que cerrar en un contacto, no en una tabla de estilos |
| **Instagram** | Nada que aplique — es grafo social y feed cronológico/algorítmico de gente que seguís | `product-critic` §4: seguidores, feeds sociales, son un desvío explícito |
| **TikTok** | Video vertical de descubrimiento por señal implícita | MESH no tiene video en V1, y "señal implícita" sin explicación choca contra el innegociable #1 de `CLAUDE.md` (matching determinístico y explicable) |
| **Airbnb** | Filtros ricos, mapas, calendario de disponibilidad | `product-critic`: calendario de disponibilidad ya está en la lista de "cosas que ya mataste" — los artistas no lo van a mantener |
| **Spotify** | Personalización basada en comportamiento histórico agregado a escala | Escala completamente distinta (millones de canciones vs. una docena de artistas); a esta escala la personalización algorítmica opaca se ve como "no funciona", no como magia |
| **Headspace / Strava** | Progreso personal visualizado sin comparación social tóxica | Relevante para CÓMO mostrar el vector de gusto sin que se sienta como una puntuación — ver `TasteScreen` ya construida con esta sensibilidad |
| **Duolingo** | Métricas de retención por gamificación (rachas, XP, ligas) | Es el ejemplo de manual de lo que `CLAUDE.md` prohíbe explícitamente. Cero aplicación, mencionado acá solo para dejar constancia de que se evaluó y se rechazó |
| **Apple / Google apps** | Consistencia de plataforma, componentes accesibles por defecto | Fuente de patrones de plataforma (HIG, Material) — Nivel 1, la referencia más confiable de todo este análisis, no por marca sino por rigor documental |
| **Linear** | Velocidad percibida, densidad de información sin ruido, motion con propósito | Aplicable al tono de la interfaz de escritorio/admin si MESH construyera panel de artista — no aplica al descubrimiento, que es visual y no denso |
| **Notion** | Formularios que se sienten como bloques editables, no campos | Relevante para el project builder — "form → interacción" del pedido original, con el límite de que MESH no tiene bloques libres, tiene un flujo fijo |
| **Are.na / Cosmos** | Curaduría visual sin ranking algorítmico, coleccionar como acto deliberado | El concepto más cercano al espíritu de "guardar" en MESH: guardar no es un like descartable, es una decisión de curaduría propia |
| **BeReal** | Un solo momento, sin scroll infinito | Relevante como contraejemplo útil: el mazo de MESH SÍ tiene fondo (§4 de `2026-trends.md`), y eso es correcto — MESH no está optimizando por tiempo en la app |

## El patrón que se repite

Cada producto de esta lista resuelve **un** problema bien y falla apenas se lo
estira fuera de ese problema. Pinterest resuelve inspiración y falla en
conexión humana. Duolingo resuelve retención y falla en respeto. La lección
que se lleva MESH no es "combinar lo mejor de todos" — es tener claro cuál es
el problema propio (encontrar a la persona indicada, una vez, bien) y usar
patrones ajenos solo donde resuelven ese problema puntual, nunca por
completitud de catálogo.

**Ver también** `docs/product/product-spec.md` y las diez preguntas de
`product-critic`, que ya cubrían la mayoría de este análisis antes de que esta
investigación empezara — este documento las respalda con evidencia externa,
no las reemplaza.
