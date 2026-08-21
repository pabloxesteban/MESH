# ADR-029 — Buscar a alguien por nombre

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** product-architect

## Contexto

MESH tenía dos formas de llegar a una persona:

- **Inicio**, la grilla de quién tatúa cerca tuyo. Contesta *quién*.
- **Explorar**, toda la obra de todos. Contesta *qué me quiero tatuar*.

Las dos son de descubrimiento: sirven cuando **no sabés a quién buscás**. No
había ninguna para el caso contrario, que es el más común de todos y el que más
se da en el mundo real: **una amiga te pasa un nombre**. Quien llegaba así
tenía que desplazarse por la grilla hasta encontrarlo de casualidad, y si no
estaba cerca —o no había abierto Inicio con la ubicación puesta— no lo
encontraba nunca.

Y empeora sola. Desde [ADR-013](ADR-013-artist-self-signup.md) cualquier
artista se da de alta desde la app. Lo primero que hace alguien que se acaba de
registrar es pedirle a un conocido que lo busque. Hasta hoy, la respuesta
correcta a eso era "no se puede".

Un `grep` de `ilike` o `textSearch` en todo el repositorio no devolvía nada.

## Decisión

Un campo de búsqueda arriba de Inicio, servido por
`public.search_professionals()`.

### 1. Sin acentos y sin mayúsculas

"martin" encuentra a Martín. La normalización vive en una función propia,
`public.search_key()`, y es **inmutable de verdad**, no por optimismo:

```sql
select lower(
  extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_text, ''))
)
```

`unaccent(text)` de un argumento es apenas `stable` —resuelve el diccionario
contra el `search_path` del momento— y un índice funcional sobre una función
`stable` no se puede crear. Nombrando el diccionario, queda determinística.
Encima va un índice GIN de trigramas.

En un mercado donde la mitad de los nombres llevan tilde y casi nadie la
escribe en un teclado de teléfono, exigirla sería esconder gente.

### 2. A quien no subió obra también se lo encuentra

La grilla de Inicio lo esconde a propósito: su tarjeta saldría vacía y la
grilla es, sobre todo, imagen. Una búsqueda por nombre es otra cosa — es
puntería. Si preguntás por esa persona, la respuesta correcta es esa persona.

La tarjeta lo dice con palabras: *"Todavía no subió obra"*. La alternativa era
una fila muda de 20 píxeles, que es peor porque no se entiende.

Es exactamente el caso de ADR-013 descrito arriba: el artista que se registró
hace cinco minutos, todavía sin portafolio, pidiéndole a alguien que lo busque.

### 3. El orden lo decide el parecido, no la cercanía

Si escribiste un nombre, querés ese nombre — no el estudio más cerca que se le
parezca. El resultado **no** pasa por `sortByProximity`, y mientras se busca:

- el encabezado de "desde dónde se mide" **desaparece**, porque diría algo que
  no está pasando;
- las tarjetas **no muestran kilómetros**, aunque el GPS esté prendido y el
  artista tenga coordenadas publicadas.

Los dos comportamientos tienen un test que falla si alguien los saca.

El orden es: nombre exacto → arranca así → una palabra arranca así → lo lleva
adentro. A igualdad, primero quien tiene obra que mostrar.

### 4. El bloqueo se impone acá también

`security invoker`, misma cláusula que la grilla y que el mazo: a quien
bloqueaste no lo encontrás ni escribiendo su nombre completo. Ver
[ADR-023](ADR-023-moderation.md).

### 5. Dos caracteres de piso, y comodines escapados

Una sola letra devuelve medio catálogo y no es una búsqueda: es un teclado a
medio escribir. El piso está en los dos lados —la base y el cliente— para no
gastar un viaje en algo que ya sabemos que vuelve vacío.

El texto lo escribe una persona, así que puede traer `%` o `_`. Se escapan una
vez, en un CTE, antes de comparar. Sin eso, escribir `%%` devuelve el catálogo
entero como si fuera un resultado de búsqueda. Hay un test de pgTAP para cada
uno de los dos caracteres.

## Lo que no se hizo

- **No hay historial de búsquedas.** Es un dato que hoy no necesitamos guardar,
  así que no se guarda.
- **No hay sugerencias ni autocompletado.** Un desplegable que adivina mientras
  escribís es un lugar más donde el producto puede empezar a decidir por la
  persona; el resultado ya se actualiza mientras escribe.
- **No busca por estilo.** El campo dice "Buscá a alguien por nombre", así que
  escribir "blackwork" y no encontrar nada es una respuesta honesta, no un
  callejón: el vacío ofrece Explorar, que es donde se llega por la obra.
- **No es una quinta pestaña.** Cuatro y ninguna más.

## Consecuencias

**Se gana:** la forma de llegar a alguien que ya conocés, que es cómo llega la
mayoría de la gente a un tatuador. Y el alta propia de ADR-013 pasa a tener
sentido completo: te registrás y alguien te puede encontrar el mismo día.

**Se resigna:** una tabla más de superficie de consulta, y un campo de texto
arriba de Inicio que antes no estaba. Se probó en el preview: no le compite a
la obra porque es una sola línea y va sobre el fondo, no encima de una foto.

**Se acepta:** que "no busca por estilo" va a sonar raro la primera vez. Si
resulta que la gente escribe estilos ahí, se decide entonces y se escribe
antes de codearlo — probablemente enchufando la taxonomía al mismo campo, que
es un cambio de producto y no de implementación.

## Un bug de la misma tanda, que no es de esta feature

Al construir esto salió a la luz un defecto viejo del preview web: el swap de
metro reescribe `queries.ts` → `queries.preview.ts` **también cuando el import
sale del propio archivo de preview**. Un `export { x } from './queries.ts'`
adentro de `queries.preview.ts` no apunta al archivo real: apunta a sí mismo, y
el getter que genera el transpilador se termina llamando solo. El síntoma es un
stack overflow sin línea de código a la vista.

Había dos casos ya en el repositorio —`scheduling/queries.preview.ts` y
`saved/ranking.preview.ts`— esperando a que alguien los llamara. Se movieron
las funciones puras a `scheduling/errors.ts` y `saved/window.ts`, que no están
en `PREVIEW_TARGETS`, y `preview-swap.test.ts` tiene ahora un tercer test que
lee el árbol y falla si alguien reintroduce el patrón.
