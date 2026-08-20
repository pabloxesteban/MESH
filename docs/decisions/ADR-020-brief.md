# ADR-020 — El brief: de la idea al turno

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Responsable:** product-architect

## Contexto

MESH tiene hoy dos mitades sueltas que nunca se tocan.

**La primera.** Alguien sube una foto de referencia, la Edge Function la
clasifica contra la taxonomía real de estilos ([ADR-011](ADR-011-photo-classification.md)),
y el resultado **filtra Explorar**. Ahí muere: la única salida de esa
clasificación es un filtro de grilla.

**La segunda.** Existen `projects` y `project_interests`
([ADR-014](ADR-014-two-sided.md)): una búsqueda se puede abrir, y un artista
puede mandar interés. Pero "interés" es un booleano. La persona recibe una
lista de nombres y no sabe nada más — cuánto sale, cuántas sesiones, cuándo
hay lugar. Todo eso se sigue resolviendo en cuatro días de chat, que es
exactamente el problema que MESH dice resolver.

El pedido fue "que sea como Tattoodo pero un paso más, que se sienta más
moderna y tecnológica". Un paso más no es una pantalla más: es que la app haga
algo que hoy hace la persona a mano.

## Decisión

**El brief es el objeto central de la búsqueda**, y el circuito se cierra:

```
foto → brief legible → artistas responden con una PROPUESTA → chat → turno → reseña
```

### 1. La foto se lee entera, no solo el estilo

El clasificador deja de devolver un slug y pasa a devolver **un brief**: estilo,
zona del cuerpo, tamaño y paleta. Todo con vocabulario cerrado, todo del lado
del servidor, y **todo puede volver `null`** — si no se ve, no se inventa.

Sigue respetando el innegociable 1 al pie: interpreta una entrada ambigua que
la propia persona subió, con vocabulario cerrado, y el resultado entra al motor
de matching como un dato más. El motor sigue siendo puro.

Lo que cambia respecto de ADR-011 es la **cantidad de señal**, no la naturaleza
de la excepción. Un estilo solo no es un pedido; "línea fina, antebrazo, chico,
negro" sí.

### 2. Los rasgos son taxonomía, no columnas

Zona del cuerpo, tamaño y paleta **no son columnas de `projects`**. Son filas de
una tabla `traits`, con la misma forma que `styles`:

```sql
traits (id, category_id, dimension, slug, name_key, sort_order, is_active)
project_traits (project_id, trait_id)
```

Esto es el innegociable 7 tomado en serio. "Zona del cuerpo" es de tatuajes;
`projects.body_area` metería tatuajes adentro de una entidad central y habría
que sacarlo a mano el día que entre otro rubro. Con `traits`, otro rubro son
**filas nuevas con otras dimensiones** — y el esquema, las políticas, las
pantallas y el motor no se enteran.

El precio de la decisión es una tabla más y un join más hoy. Es barato, y es
exactamente la deuda que no se puede pagar después: cambiar columnas por
taxonomía con datos vivos es una migración; empezar con taxonomía no es nada.

### 3. Un artista no manda "me interesa": manda una propuesta

`project_interests` gana `price_min_cents`, `price_max_cents`, `price_currency`,
`sessions` y `note`. Con `verdict = 'interest'` el precio y las sesiones son
**obligatorios**; con `verdict = 'pass'` tienen que estar todos en `null`, y lo
impone una restricción.

Que el precio sea obligatorio es la decisión más discutible de este ADR, y es
deliberada:

- **A favor:** es el dato por el que la persona escribe. Una lista de cinco
  artistas interesados sin precio obliga a las mismas cinco conversaciones que
  había antes; con precio, la persona elige y escribe a uno.
- **En contra:** algún artista no va a responder por no querer dar un número
  sin ver la piel en persona. Es real.
- **Cómo se resuelve:** es un **rango**, no un precio; y la nota corta existe
  justamente para "esto es estimado, lo confirmo al verte". Un rango honesto
  con una condición escrita es más útil que el silencio.

Esto **no** viola el innegociable 2. Lo prohibido es que MESH invente un
precio. Acá el precio lo escribe el artista, para ese trabajo, y queda con su
fecha.

### 4. El interés sigue sin ser un mensaje

ADR-012 y ADR-014 fijaron que **el artista nunca escribe primero**. Una
propuesta no es un mensaje: no abre chat, no notifica con texto libre, y vive
en la búsqueda de la persona. El chat lo sigue abriendo ella.

Sin esta regla, "responder con una propuesta" sería un buzón de entrada abierto
a desconocidos, que es la parte de las apps de servicios que todo el mundo
odia.

## Lo que NO está

- **Aceptar una propuesta como acto formal.** No hay "aceptado/rechazado": la
  persona abre el chat con quien quiere y listo. Un estado de aceptación
  necesita reglas sobre qué pasa con los demás, y eso es un contrato, no un
  chat.
- **Que el precio de la propuesta reserve nada.** No hay seña ni pago. Cuando
  los haya, van con su ADR.
- **Ordenar las propuestas por precio.** Llegan de la más nueva a la más vieja.
  Ordenar por precio convertiría esto en una subasta a la baja, que es
  exactamente cómo se destruye un oficio.
- **Traits en el motor de matching.** Por ahora el brief se muestra; puntuar
  con zona y tamaño es un cambio de matching y necesita subir
  `MATCHING_VERSION` con su justificación.

## Consecuencias

- **Un segundo rubro es carga de datos**, no migración: filas en `categories`,
  `styles` y `traits`. Lo que sigue clavado a tatuajes es el tipo
  `CategorySlug` del dominio, el `z.literal('tattoo')` del schema de contenido y
  el prompt del clasificador — tres puntos, todos angostos.
- La persona ve un brief que **puede editar**: lo que la IA leyó es una
  propuesta de lectura, no un veredicto. Si dice "antebrazo" y era el gemelo, se
  cambia con un toque.
- Un artista que respondió y se arrepiente borra su propuesta, igual que hoy
  borra su interés — y la búsqueda le vuelve al mazo.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| Lee la foto | `supabase/functions/read-reference/` — antes `classify-style` |
| Vocabulario de rasgos | `packages/domain/src/taxonomy/taxonomy.ts` → `supabase/seed.sql` |
| El brief que se revisa | `apps/mobile/src/features/brief/BriefEditor.tsx`, dentro de «Buscar con una foto» |
| El artista responde | `apps/mobile/src/features/brief/ProposalComposer.tsx`, dentro del mazo |
| La persona compara | `apps/mobile/src/features/demand/InterestList.tsx`, en Chats |

La propuesta viaja adentro de `get_search_interests`, que ya era la lista de
"quién me respondió". No se agregó una función aparte: la persona no razona por
proyecto sino por quién le contestó, y una segunda lista con los mismos datos
habría sido la que nadie abre.

## Referencias

- `supabase/migrations/20260820000500_brief.sql`
- `supabase/tests/52_brief.sql`
- [ADR-011](ADR-011-photo-classification.md) — la excepción de IA, que esto ensancha
- [ADR-014](ADR-014-two-sided.md) — las búsquedas abiertas y el interés
- [ADR-018](ADR-018-availability.md) · [ADR-019](ADR-019-reviews.md) — el final del circuito
