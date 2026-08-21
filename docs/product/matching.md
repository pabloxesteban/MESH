# MESH — Motor de gusto y matching

**Estado:** Implementado, sin superficie · **Responsable:** matching-engineer ·
**Versión de algoritmo:** `taste/1` · `match/2`

> **Leé esto primero.** Desde el 2026-08-19 **ninguna pantalla de quien busca
> ejecuta estos motores**: el mazo y la pestaña de encajes salieron de la app
> ([D-010](../design/MESH-DESIGN-DECISIONS.md)). El código sigue en
> `packages/domain`, versionado, con sus tests y sus fixtures verdes, y este
> documento sigue siendo su especificación — pero hoy describe una capacidad
> apagada, no algo que la gente esté usando. Sin mazo tampoco se escriben
> `interactions`, así que el vector de gusto no tiene de dónde salir. Volver a
> encenderlo es agregar una superficie que lo alimente, y es una decisión de
> producto: escribila antes de codearla.

Este documento es la especificación de referencia. La implementación en
`packages/domain/src/matching/` tiene que coincidir exactamente con él, y los
fixtures en `packages/domain/src/matching/__fixtures__/` derivan de los ejemplos
trabajados de acá. Si el código y este documento no coinciden, eso es un bug en
alguno de los dos — resolvelo, no dejes que se separen.

---

## 1. Restricciones de diseño

1. **Determinístico.** Mismas entradas → mismo puntaje, mismo orden, mismas
   razones. Sin azar, sin lecturas de reloj dentro del scoring, sin inferencia
   de modelos.
2. **Explicable.** Cada punto del puntaje es atribuible a un término con nombre.
3. **Testeable.** Funciones puras sobre datos planos. Sin base de datos, sin red.
4. **Versionado.** `TASTE_VERSION` y `MATCHING_VERSION` se guardan en cada
   perfil de gusto y cada fila de match persistida. Cambiar pesos sube la
   versión e invalida los resultados cacheados.
5. **Honesto con datos escasos.** Con 8–15 artistas, el modelo tiene que
   degradar a "todavía no sabemos" y no a un disparate confiado.

## 2. Vocabulario

| Símbolo | Significado |
|---|---|
| `S` | Vocabulario de estilos de una categoría (p. ej. tatuaje → Fine Line, Blackwork, …) |
| `t_s ∈ [0,1)` | Puntaje de gusto del usuario para el estilo `s` |
| `a_s ∈ [0,1)` | Puntaje de aversión del usuario para `s` (uso interno, nunca se muestra) |
| `p_{a,s} ∈ (0,1]` | Solvencia declarada del artista `a` en el estilo `s` |
| `w_{i,s}` | Peso del estilo `s` en la pieza `i`; `Σ_s w_{i,s} = 1` |
| `n` | Cantidad de interacciones decisivas (me gusta o paso) del usuario en una categoría |

## 3. Motor de gusto (`taste/1`)

### 3.1 Valores de interacción

Una interacción se guarda como una fila por (usuario, pieza de portfolio), con
un veredicto y una marca de guardado — no como un log de solo agregado — para
que el gusto sea una función pura del estado actual y deshacer sea trivial.

| Estado | Valor `v` |
|---|---|
| `like` | **+1.0** |
| `like` + `saved` | **+1.5** |
| `pass` | **−0.25** |

**Justificación de estos valores.** Guardar es una señal más fuerte, más escasa
y más deliberada que un me gusta —cuesta una acción extra y expresa intención de
volver— así que pesa 1.5×. Un paso es evidencia *débil*: la gente pasa sobre
buen trabajo por la ubicación en el cuerpo, por el humor del momento o por la
velocidad del scroll, así que se amortigua a un cuarto de un me gusta y nunca
puede por sí solo empujar un estilo a un negativo que importe. La asimetría es
intencional: los falsos negativos (perderte algo que te gustaría) son más
baratos acá que los falsos positivos (recomendarte a la persona equivocada).

**Rechazado:** ponderación por tiempo de permanencia y por vistas. Mejoraría el
modelo apenas y haría que MESH optimice por tiempo en tarjeta, que es lo que
§44 del brief prohíbe y un hábito de medición que no queremos adquirir.

Guardar sin dar me gusta no es representable en la UI —guardar implica me
gusta— así que `saved = true, verdict = 'pass'` es un estado inválido,
rechazado por una restricción CHECK en la base.

### 3.2 Acumulación

Para cada estilo `s`:

```
raw_s = Σ sobre interacciones i  ( v_i × w_{i,s} )
```

Los pesos de estilo por pieza suman 1, así que una pieza etiquetada con cuatro
estilos no puede pesar más que una etiquetada con uno. La autoría de contenido
asigna los pesos explícitamente; `packages/domain` normaliza y el validador del
seed rechaza conjuntos que no sumen 1 ± 0,001.

### 3.3 Normalización

Se separa en componente positivo y negativo, y después se satura:

```
t_s = max(0, raw_s) / ( max(0, raw_s) + K )
a_s = max(0, −raw_s) / ( max(0, −raw_s) + K )
K = 3.0
```

**Por qué saturante y no normalizado al máximo.** Dividir por el estilo más
fuerte forzaría a algún estilo a 1,0 incluso para alguien con tres
interacciones, lo que se lee como una certeza que no tenemos. La forma saturante
es *absoluta*: `t_s` es "cuánta evidencia tenemos de que te gusta `s`",
asintótica a 1, sin llegar nunca. `K = 3.0` significa que aproximadamente tres
piezas marcadas en un estilo llegan a 0,5 y unas siete llegan a 0,7 — que se
alinea con cuánta evidencia una persona consideraría convincente sobre sí misma.

Ejemplo trabajado, que coincide con la pantalla de revelación de la spec:

| Estilo | Interacciones que aportan | `raw` | `t` |
|---|---|---|---|
| Fine Line | 9 me gusta @ 0,55 + 4 guardados @ 0,6 | 13,65 | **0,82** |
| Botanical | 6 me gusta @ 0,45 + 2 guardados @ 0,5 | 8,55 | **0,74** |
| Minimal | 5 me gusta @ 0,5 + 1 guardado @ 0,4 | 3,10 | **0,51** |
| Black & Grey | 2 me gusta @ 0,5, 3 pasos @ 0,4 | 0,70 | **0,19** |

### 3.4 Umbral de listo

```
listo  ⇔  n ≥ 12  Y  al menos 3 estilos con t_s ≥ 0,30
```

Por debajo del umbral **no hay pantalla de gusto ni lista de matches** — la
pestaña Matches muestra un estado vacío honesto. Dos condiciones y no una,
porque doce interacciones repartidas parejo entre doce estilos no son un gusto,
son ruido.

`n = 12` es un supuesto inicial basado en cuánto va a tolerar alguien el mazo de
onboarding antes de querer una recompensa. Es una constante en
`packages/domain/src/taste/config.ts` y hay que revisitarla contra datos reales
de embudo (ver [`metrics.md`](metrics.md), *completitud de gusto*).

### 3.5 Filtro de visualización

Un estilo se muestra en la pantalla de gusto solo si `t_s ≥ 0,15` **y** está
sostenido por ≥ 2 interacciones. La aversión no se muestra nunca.

### 3.6 Recencia

V1 no aplica **ningún decaimiento temporal**. El gusto de un usuario en etapa de
validación no se mueve de forma significativa dentro de la ventana de medición, y
el decaimiento haría del gusto una función del reloj — destruyendo el
determinismo y la testeabilidad. Cuando las sesiones abarquen meses, agregá
decaimiento como `taste/2` con una vida media explícita y timestamps de
snapshot, no antes.

## 4. Motor de match (`match/2`) — basado en gusto

### 4.1 Componentes

Cada componente devuelve `[0,1]`.

**Estilo (dominante).** Sobre los 6 estilos con mayor `t_s` del usuario:

```
style_raw   = Σ_s ( t_s × p_{a,s} ) / Σ_s t_s
aversion    = Σ_s ( a_s × p_{a,s} ) / Σ_s a_s        (0 si el usuario no tiene aversión)
Style       = clamp01( style_raw − 0.5 × aversion )
```

`style_raw` se lee de forma directa: *del gusto que esta persona demostró, qué
fracción cubre este artista*. El término de aversión va a la mitad porque los
pasos son evidencia débil (§3.1) y preferimos mostrar un artista levemente
equivocado antes que suprimir en silencio uno bueno.

**Ubicación.** Desde `match/2` la unidad es el **barrio**, no la ciudad.

| Situación | Valor |
|---|---|
| La misma ubicación, o granularidad desigual dentro de la misma ciudad | 1,0 |
| La misma comuna de CABA | 0,85 |
| La misma ciudad, sabiendo que los barrios son distintos | 0,7 |
| La misma área metropolitana | 0,55 |
| Otra ciudad, el artista viaja / hace guest | 0,4 |
| Otra ciudad, no viaja | 0,0 |
| Ubicación del usuario desconocida | *componente omitido* |

**Por qué la comuna y no una distancia.** No hay coordenadas *verificadas* a
escala de ciudad: la columna `locations.lat`/`lng` existe y sigue vacía, porque
no escribimos coordenadas que no verificamos y porque una distancia en línea
recta miente sobre una ciudad con río, autopistas y subte. La comuna es la
división administrativa real de CABA (las 15 de la Ley 1777), así que "misma
comuna" es un hecho verificable y no una estimación nuestra. Lo que **no**
afirma: que dos barrios de la misma comuna estén a la misma distancia entre sí
que otros dos. Es una cota superior barata y cierta, no una métrica.

**Distancia real, aparte del ranking.** Desde `20260818000400_studio_location`
existe `professionals.studio_lat`/`studio_lng`: coordenadas reales, pero
autoprovistas por el artista y con permiso explícito de quien busca — dos
consentimientos activos, no una estimación de barrio. Con las dos partes
otorgadas, Matches muestra "≈X km" (`packages/domain/src/geo/distance.ts`,
haversine) al lado de cada tarjeta. Es **display-only**: nunca es un
componente del score, nunca reordena el resultado. El ranking sigue siendo
Ubicación-por-comuna, de arriba. Mostrarla como criterio de orden requeriría
coordenadas para el catálogo entero, y en V1 son opcionales y las pone cada
artista por su cuenta — mezclarlas con el ranking premiaría a quien activó el
GPS por sobre quien no, que no es señal de qué tan buen match es.

**Por qué la granularidad desigual vale 1,0 y no 0,7.** Si el artista declaró
"Palermo" y la persona solo "CABA", lo más preciso que se puede afirmar es "la
misma ciudad" — y eso no es una mala noticia sobre la distancia, es falta de
dato. Bajarle el puntaje al que sí declaró su barrio sería premiar a quien no lo
da. Es el mismo principio que la regla de omisión: un dato faltante nunca puede
parecer una mala respuesta.

La contrapartida: un artista que declaró un barrio lejano puntúa por debajo de
uno que no declaró ninguno. Se acepta porque el error alternativo es peor —
afirmar "te queda cerca" sin saberlo— y porque MESH cura el catálogo: el barrio
se pide al dar de alta a cada artista, así que el caso sin dato tiende a cero.

**Precio.** Solapamiento del `[min, max]` publicado del artista con la banda de
presupuesto del proyecto, como fracción de la banda de presupuesto. Sin
presupuesto o sin precio publicado → *componente omitido*.

**Disponibilidad.** `open → 1,0`, `limited → 0,7`, `waitlist → 0,5`,
`closed → 0,2`. Si `availability_updated_at` tiene más de 45 días, el estado se
considera desconocido y el componente se *omite* — MESH no afirma una
disponibilidad que no puede sostener.

### 4.2 Pesos y la regla de omisión

| Componente | Peso |
|---|---|
| Estilo | 0,70 |
| Ubicación | 0,15 |
| Precio | 0,10 |
| Disponibilidad | 0,05 |

**Los componentes omitidos no puntúan cero — se eliminan y los pesos restantes
se renormalizan sobre lo que sí se conoce.** Un dato faltante nunca puede
parecer una mala respuesta; un artista que no publicó precio no es un peor
match, simplemente sabemos menos de él.

```
puntaje = Σ_{c ∈ conocidos} ( w_c × valor_c ) / Σ_{c ∈ conocidos} w_c        ∈ [0,1]
```

**Nota sobre Ubicación en V1.** Hasta `match/1` todos los artistas de V1 estaban
en CABA, así que Ubicación era constante y no aportaba señal de ranking. Con los
barrios deja de serlo: en una V1 que es toda CABA, el barrio es *exactamente* la
dimensión que discrimina. La bandera `locationDiscriminates` se mantiene —el
componente se sigue omitiendo cuando no separa a los candidatos del resultado, y
nunca se *muestra* como razón salvo que efectivamente haya discriminado.

### 4.3 Orden y empates

Ordenar por `puntaje` descendente, después por cantidad de estilos solapados
descendente, después por `professional.id` ascendente. La última clave es
arbitraria pero estable — así la misma consulta siempre devuelve el mismo orden
y los tests E2E no son intermitentes.

### 4.4 Presentación

La persona ve una **banda**, no un porcentaje:

| Puntaje | Banda |
|---|---|
| `≥ 0,75` | Fuerte |
| `0,55 – 0,75` | Bueno |
| `0,40 – 0,55` | Posible |
| `< 0,40` | no se muestra |

Justificación en [ADR-005](../decisions/ADR-005-matching.md). En corto: con una
ciudad y una docena de artistas, la mayoría de los puntajes cae en una banda
angosta, y un "96%" en pantalla es una afirmación de precisión que los datos no
sostienen. Las bandas son honestas y rankean igual. El puntaje crudo está
disponible en builds de debug y en la columna `matches.score`.

Los candidatos por debajo de 0,40 **no se muestran en absoluto**, aunque eso
deje la lista corta o vacía. Una lista corta y honesta le gana a una rellenada.

### 4.5 Razones

Las razones se derivan, no se redactan. Para cada componente se calcula su
aporte `w_c × valor_c / Σw`. Se emiten como máximo tres razones, ordenadas por
aporte, solo para componentes que aporten ≥ 0,10 del puntaje final, y solo desde
este conjunto cerrado de plantillas:

| Condición | Razón |
|---|---|
| Estilo `s` que más aporta con `t_s ≥ 0,5`, mayormente de me gusta | Marcaste varios trabajos de **{s}** |
| Estilo `s` que más aporta, mayormente de guardados | Guardaste diseños de **{s}** |
| El artista es primario en ≥ 2 de los estilos top del usuario | Trabaja **{s1}** y **{s2}** |
| La ubicación discriminó dentro del resultado | En **{barrio}** — la ciudad solo si no hay barrio |
| La banda de precio solapa un presupuesto declarado | Su rango entra en tu presupuesto |
| Disponibilidad fresca y `open` | Está tomando turnos |

Si menos de una razón supera el umbral, el candidato no se muestra. No hay
fallback de "onda general" ni prosa generada.

## 5. Matching basado en proyecto

Un proyecto aporta estilos, ubicación y presupuesto explícitos. Sus pesos de
estilo son los declarados por el usuario, normalizados a sumar 1, y después
**mezclados** con el gusto ambiente:

```
t'_s = 0,75 × proyecto_s + 0,25 × t_s
```

El brief declarado domina —la persona nos dijo qué quiere— pero el gusto
ambiente sigue rompiendo empates entre artistas que todos hacen "fine line
botánico". Si el usuario todavía no tiene perfil de gusto, `t' = proyecto`, y el
match corre normalmente. Ubicación y presupuesto salen del proyecto cuando están
presentes, con fallback al perfil.

**"Buscar por fotos" es esto mismo, sin formulario.** La persona sube hasta 4
fotos de referencia y toca Buscar — nunca escribe un título, una descripción,
un presupuesto ni un timing, y nunca elige un estilo a mano. Del lado del
motor es un proyecto igual a cualquier otro: mismos pesos normalizados,
misma mezcla 0,75/0,25, mismo `blendProjectStyles` — con un solo estilo,
`styles` tiene una sola entrada con peso 1, no una diferencia de mecanismo.
Lo único que cambia es que el título se arma solo a partir del estilo
detectado, y que las cuatro fotos quedan como referencias del proyecto — el
mismo mecanismo que ya existía para proyectos completos, no uno nuevo. Ver
`apps/mobile/src/features/quick-search/`.

**De dónde sale el estilo, si nadie lo elige.** La primera foto se manda a
`read-reference` (`supabase/functions/read-reference/`), una Edge Function
que le pide a un modelo de visión (Claude) que elija un slug de la lista de
estilos activos — real, la misma que ya etiqueta el catálogo — o `null` si
no reconoce ninguno. Es la única llamada a un modelo de IA en toda la app, y
está acotada a propósito: interpreta la foto, no decide a quién se muestra
ni en qué orden — eso lo sigue haciendo este motor, puro y determinístico,
igual que siempre. `null` nunca se reemplaza por una adivinanza: si el
modelo no reconoce nada, se le dice a la persona y no se inventa un
resultado. Ver [ADR-011](../decisions/ADR-011-photo-classification.md) para
por qué esto no contradice ADR-005 (que sigue rechazando IA en el ranking en
sí), y CLAUDE.md (Innegociable 1) para el límite exacto de la excepción.

**Y si no hay foto.** Desde el 2026-08-20 hay una segunda puerta: un asistente
que conversa y arma el pedido con las palabras de la persona
([ADR-021](../decisions/ADR-021-brief-assistant.md)). Cambia la puerta, no el
motor: lo que llega al matching siguen siendo **slugs de esta misma taxonomía**,
confirmados por la persona en una pantalla editable antes de existir. Ningún
texto generado entra al puntaje, y ningún modelo decide un orden.

Antes de esto hubo dos intentos manuales: una lista de chips de texto, y
después una grilla de fotos reales para tocar la que se pareciera. Los dos se
rechazaron por el mismo motivo — seguía siendo una decisión más antes de
poder buscar, y el pedido fue sacarla del todo, no hacerla más linda.

**Bug encontrado y corregido al construir esto:** `useMatches.ts` mandaba
`locationDiscriminates: false` siempre, con un comentario de cuando toda la
ciudad era una sola ubicación. Desde que existen barrios, un proyecto con
`locationSlug` tiene que poder discriminar — si no, el barrio elegido en el
formulario o en "buscar por fotos" nunca llegaba a afectar ningún resultado
real. Corregido con test de regresión en `matches.test.tsx` y un test de
integración de punta a punta contra Postgres real en
`tests/integration/src/quick-search.test.ts`.

## 6. Arranque en frío

| Estado | Comportamiento |
|---|---|
| `n = 0` | Solo el feed de descubrimiento. Nada en Matches más allá de una invitación. |
| `0 < n < 12` | Indicador de progreso. Todavía sin matches. |
| Listo, pero ningún candidato ≥ 0,40 | Estado vacío honesto: "Todavía no encontramos a alguien que encaje. Seguí explorando." Más un enlace para ver todos los artistas por estilo. |
| Usuario dirigido, sin gusto, crea un proyecto | El matching por proyecto corre de inmediato — no hace falta onboarding. |

Se puede ofrecer un orden de "nuevos en MESH, empezá por acá" antes del umbral,
pero está rotulado como punto de partida, nunca como match, y se ordena por
profundidad de portfolio y recencia — no por un puntaje falso.

## 7. Orden del feed de descubrimiento

En V1 no es un recomendador. El feed es:

1. Piezas de la categoría del usuario, publicadas, sin interacción previa.
2. Mezcladas determinísticamente con una semilla derivada de `user_id` — así
   cada persona ve un orden personal estable y la paginación nunca repite ni
   saltea.
3. Restricción de diversidad: **ninguna repetición adyacente evitable**, y como
   mucho 3 de cada 10 piezas consecutivas de un mismo profesional.

   "Evitable" no es una salvedad cómoda. Cuando queda obra sin ver de un solo
   profesional, dos piezas seguidas de esa persona son matemáticamente
   inevitables, y ningún orden lo arregla.

   La implementación reparte a cada profesional a lo largo de todo el feed: a la
   obra número `i` de un artista con `n` piezas se le asigna la posición
   `(i − 0,5) / n`. Un artista con seis piezas se extiende sobre todo el
   recorrido y uno con cuatro también, así que nadie se agrupa en ninguna punta.

   **La versión anterior era un round robin por vueltas** —todas las primeras
   obras, después todas las segundas— y funcionaba perfecto mientras todos
   tuvieran la misma cantidad de obra. Con 5, 6 y 4 piezas el que tiene más se
   queda solo al final y aparece dos veces seguidas. El test de pgTAP no lo veía
   porque usaba tres artistas con cuatro piezas cada uno; lo encontró el test de
   integración contra el contenido real. Un fixture parejo es un fixture que no
   se parece a la realidad.

Hacer que el descubrimiento mismo esté guiado por el gusto crearía una burbuja
antes de que el perfil sea confiable, y volvería la entrada del motor de gusto
una función de su propia salida. En V1 la entrada se mantiene sin sesgo.

## 7 bis. Orden del mazo del artista (búsquedas abiertas)

**Esto NO es matching, y por eso no toca `MATCHING_VERSION`.** El motor de match
sigue corriendo en una sola dirección: de una persona hacia los profesionales.
El mazo del artista no puntúa nada.

Lo que hace `get_open_search_feed` es un **filtro y un orden**, los dos
triviales a propósito:

1. La búsqueda tiene `is_open_to_professionals`. Sin eso no existe para nadie.
2. Es de la misma categoría que el perfil del artista.
3. Pide **al menos un estilo** que el artista declaró en
   `professional_styles`. No es un umbral de puntaje: es pertenencia. Mostrarle
   a alguien que hace blackwork una búsqueda de lettering no es "un match
   flojo", es ruido, y el ruido vacía el mazo de sentido.
4. El artista todavía no la decidió (ni interés ni paso).
5. Orden: `created_at desc`. Lo más nuevo primero, y nada más.

Por qué no un puntaje: del lado de la persona hay meses de decisiones que
sostienen un vector de gusto. Del lado del artista hay una lista de tres
estilos que él mismo escribió. Puntuar sobre eso produciría un orden que se ve
sofisticado y no distingue nada — y una razón de match que no podríamos
sostener. Cuando haya volumen suficiente para que el orden importe, se decide
con datos y se escribe acá.

Ver [ADR-014](../decisions/ADR-014-two-sided.md).

## 8. Tests requeridos

Los fixtures viven en `packages/domain/src/matching/__fixtures__/`. Cada caso de
abajo tiene un valor esperado commiteado; cambiar cualquiera de ellos requiere
subir la versión y una justificación documentada.

**Gusto**
- Un solo me gusta sobre una pieza de un solo estilo → `t_s` exacto.
- Guardar pesa 1,5× un me gusta, verificado numéricamente.
- Una pieza multi-estilo se reparte por peso y no pesa más que una de un estilo.
- Los pasos reducen pero no pueden hacer `t_s` negativo; sube `a_s` en su lugar.
- Deshacer (borrar la interacción) devuelve el vector exactamente al estado
  anterior.
- Umbral falso en `n = 11`, verdadero en `n = 12` con 3 estilos ≥ 0,30.
- Umbral falso en `n = 20` repartido entre 20 estilos.
- Conjunto vacío de interacciones → vector cero, no `NaN`, no división por cero.

**Matching**
- Coincidencia exacta de estilos → puntaje alto, razones correctas, banda
  correcta.
- Coincidencia parcial.
- Solapamiento nulo → por debajo del piso → no se devuelve.
- Ubicación distinta con viaje y sin viaje.
- Banda de precio: solapada, contigua, disjunta, ausente.
- Disponibilidad: fresca abierta, fresca cerrada, vieja (tiene que omitirse, y
  **no** debe reducir el puntaje respecto de un candidato sin disponibilidad).
- Renormalización por omisión: un artista con precio y disponibilidad
  desconocidos puntúa idéntico a uno cuyo único componente conocido es estilo.
- Perfil de gusto vacío → el matching por proyecto igual funciona.
- Estabilidad del orden en dos corridas idénticas y con el array de entrada
  permutado.
- Las razones nunca referencian un componente omitido.
- Cantidad de razones ≤ 3 y umbral respetado.

**Basados en propiedades**
- El puntaje siempre en `[0,1]`.
- Agregar un me gusta a un estilo nunca baja el puntaje de un artista en ese
  estilo.
- El conjunto de razones siempre es un subconjunto de los componentes con aporte
  distinto de cero.

## 9. Versionado y control de cambios

`TASTE_VERSION` y `MATCHING_VERSION` son constantes exportadas. Cualquier cambio
en pesos, umbrales, `K`, límites de banda o el conjunto de razones requiere:

1. Subir la versión.
2. Actualizar este documento, incluida la justificación.
3. Fixtures actualizados, con los valores esperados recalculados y revisados.
4. Invalidar las filas de `taste_profiles` y `matches` con la versión vieja.

El ajuste silencioso está prohibido. Si se mueven los números, se mueve con
ellos la razón escrita.

### Historial

**`match/2` — 2026-08-18 · el barrio como unidad de cercanía.**

Qué cambió: el componente de ubicación pasó de dos escalones (misma ciudad,
misma área metropolitana) a cinco, con el barrio y la comuna adentro de la
ciudad. `sameMetro` bajó de 0,7 a 0,55 para dejarle lugar a los escalones
nuevos sin que "otro partido" empate con "otro barrio".

Por qué: MESH V1 es CABA entera. Con la ciudad como unidad, ubicación era
constante y no discriminaba nada — el documento lo decía explícitamente. El
barrio es la dimensión que efectivamente separa a un artista de otro para
alguien que se tiene que tomar el subte.

Qué **no** cambió: los pesos de los componentes, la regla de omisión, los
límites de banda, el motor de gusto. `taste/1` sigue igual, así que los vectores
de gusto persistidos no se invalidan; sí se invalidan las filas de `matches`
con `matching_version = 'match/1'`.
