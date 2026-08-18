# MESH — Hipótesis de UX 2027

**Todo lo de este documento es especulativo por definición.** No hay producto
enviado que lo confirme todavía — si lo hubiera, estaría en `2026-trends.md`
como tendencia observada, no acá. Estas son apuestas, marcadas como tales, para
que nadie las trate como evidencia.

## Hipótesis 1 — La divulgación progresiva se vuelve el default para formularios de intención alta

**La apuesta.** Formularios de una sola pantalla con muchos campos se van a
seguir viendo cada vez menos en flujos de "quiero algo específico" (a
diferencia de checkout, donde la velocidad importa más que la reflexión).

**Por qué podría pasar.** La evidencia de 2026 ya muestra la dirección
(`onboarding-research.md`); la apuesta es que se vuelve *default* y no solo
una opción entre varias.

**Qué significaría para MESH.** El formulario de proyecto, ya candidato a
dividirse parcialmente en 2026, se termina dividiendo por completo.

**Qué haría falta para confirmarlo.** Medir la tasa de completitud de MESH
propia después de dividir el paso de estilos (2026-trends.md). Si mejora,
sube la confianza en dividir el resto; si no mejora, la hipótesis para MESH
específicamente cae, sin importar qué haga el resto de la industria.

## Hipótesis 2 — La curaduría explícita gana terreno sobre el ranking algorítmico opaco, para catálogos chicos

**La apuesta.** A medida que la fatiga con feeds algorítmicos opacos crece,
productos con catálogos chicos y curados (no a escala de Spotify/TikTok)
empiezan a mostrar más, no menos, del razonamiento detrás de una
recomendación.

**Por qué podría pasar.** Es consistente con la dirección que ya tomó MESH sin
esperar esta hipótesis: el matching es determinístico y las razones se
derivan de componentes reales, nunca inventadas (`docs/product/matching.md`).
Si la hipótesis es cierta, MESH no tiene que cambiar nada — ya está del lado
correcto.

**Riesgo de la hipótesis.** Podría no generalizar: la explicabilidad le sirve
a MESH porque el catálogo es chico y curado; en un catálogo de millones,
explicar cada recomendación no escala y el mercado podría no valorarlo igual.

## Hipótesis 3 — Interfaces que se adaptan al nivel de experiencia de la persona, sin manipular

**La apuesta.** Menos onboarding para alguien con un perfil de gusto ya
fuerte; discovery más rápido para alguien que ya demostró qué le gusta.

**Por qué es solo hipótesis y no recomendación.** No hay evidencia externa
consultada en este ciclo, y el riesgo de que esto se deslice hacia
personalización manipuladora es real — es la línea que separa "MESH es más
rápido cuando ya te conoce" de "MESH te muestra menos para que dependas más
de él". Antes de prototipar esto hace falta un límite escrito, no solo una
buena intención. Ver `CLAUDE.md`: "el objetivo es relevancia, no adicción" —
frase que hay que convertir en una regla verificable antes de construir nada,
no una aspiración.

**Qué haría falta para promoverla a `2026-trends.md`.** Evidencia externa real
de productos que lo hacen sin volverse manipuladores, y una definición
concreta de qué "adaptar" significa en MESH que un `product-critic` pueda
auditar con sus diez preguntas.

---

Ninguna de las tres hipótesis autoriza construir nada. Sirven para que, si en
2027 alguna se confirma con evidencia real, MESH no llegue tarde a
reconocerla — no para adelantarse a construir sobre una apuesta.
