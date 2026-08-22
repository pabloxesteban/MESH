# ADR-034 — Diseño propio: tamaño y precio por pieza

**Estado:** Propuesto (2026-08-22) · **Fecha:** 2026-08-22 · **Responsable:** product-architect

## Contexto

`product-critic` aprobó una feature con este alcance exacto: un artista puede
marcar ciertas piezas de su portfolio como "diseño propio" (lo que en la jerga
del rubro se llama flash o boceto) en vez de "tatuaje ya hecho en un cliente".
Esas piezas llevan además un tamaño y un precio **declarados por el artista**
— mismo patrón que ya existe para `professionals.price`: un valor que el
artista pone, con fecha, nunca verificado ni inventado por MESH. Se muestran
en su propia sub-sección del perfil, separada de "Obra". El contacto sigue
siendo el chat de siempre. `ux-product-designer` resuelve el copy en paralelo;
esta ADR resuelve el esquema.

## Problema

Tres tensiones, no una:

1. **Cómo marcar la pieza sin filtrar jerga de categoría al núcleo.**
   `portfolio_items` es una de las cinco entidades centrales
   (Category/Style/Professional/PortfolioItem/Project, innegociable 7). "Flash"
   no puede ser un nombre de columna ni de valor de enum.
2. **Cómo declarar un tamaño sin inventar un segundo vocabulario.** MESH ya
   tiene una dimensión `size` en `traits` (ADR-020: mini/chico/mediano/
   grande/gran-formato), construida a propósito para ser agnóstica de rubro.
   Duplicarla como texto libre o como un nuevo enum sería reinventar algo que
   ya existe y ya se mantiene.
3. **Cómo declarar un precio sin contradecir la forma que ya eligió
   `professionals.price`, ni prometer más precisión de la que hay.** El precio
   general de un artista es un **rango** (`price_min_cents`/`price_max_cents`)
   porque es una estimación sobre trabajo futuro todavía sin definir. El
   precio de una pieza de diseño propio describe algo que **ya existe, con una
   forma ya fija**: no hay "depende" que un rango exprese honestamente.

## Decisión

### 1. Columnas en `portfolio_items`, no tabla nueva

Las cinco preguntas de `.claude/workflows/database-change.md`:

- **¿Qué lee/escribe esto, y en qué pantalla?** La sub-sección "Diseños
  propios" del perfil, en la misma pantalla y en el mismo query que ya trae
  "Obra" — es la misma fila, filtrada.
- **¿Qué se rompe sin eso?** Sin marca en la pieza, no hay forma de separar
  "diseño propio" de "obra ya hecha" — la sub-sección no existe.
- **¿Es derivable de datos existentes?** El tamaño sí, de `traits` — no se
  duplica. El precio y la marca de "es diseño propio" no son derivables de
  nada: son hechos nuevos que declara el artista.
- **¿Filtra conocimiento de categoría al núcleo?** No, si los nombres son
  genéricos — ver §2 y §3.
- **¿Duplica un hecho representado en otro lado?** No. Es información nueva
  sobre una pieza que ya existe.

Una tabla aparte (`portfolio_item_offers` o similar) sería la partición 1:1
que ADR-003 ya rechazó para `professionals`/`ProfessionalProfile`: un join
más, un segundo juego de políticas, y ninguna diferencia de comportamiento —
se lee y se escribe exactamente donde ya se lee y se escribe la pieza, con la
misma política de owner que ya existe. Van como columnas en la misma fila.

### 2. `is_original_design boolean`, no un enum

Elegido sobre `kind: 'completed' | 'offered'` por dos razones:

- **Convención existente.** `portfolio_items` ya tiene cuatro booleanos que se
  leen como afirmaciones (`is_featured`, `is_fixture`) y el resto del esquema
  hace lo mismo (`is_published`, `is_saved`). Un enum de dos valores no gana
  nada frente a eso.
- **Innegociable 3.** Un enum con casillero para un tercer estado que nadie
  pidió es la misma clase de sobre-construcción que "una tabla agregada
  porque la vamos a necesitar después" — solo que en enums. Si algún día
  aparece un tercer estado real, es una migración chica (agregar un valor);
  no vale pagar la complejidad hoy por una rama hipotética.

El nombre es genérico a propósito: no dice "flash", no dice "boceto", no dice
"tatuaje". Dice qué es el objeto —un diseño propio del artista, no una foto de
trabajo ya aplicado— y esa distinción tiene sentido para cualquier rubro (una
fotógrafa también puede distinguir "una composición propia que ofrece" de "una
foto de una sesión ya hecha"). El copy ("Diseños", "Flash", lo que decida
`ux-product-designer`) vive en i18n, nunca en el esquema.

### 3. El tamaño reusa `traits` (dimensión `size`), vía FK compuesta

No se crea vocabulario nuevo. `traits` con `dimension = 'size'` ya existe
desde ADR-020, ya es agnóstico de categoría por diseño ("los nombres son
genéricos a propósito: otro rubro puede usar `size`... con otros slugs"), y ya
tiene su propia pantalla y su propio mantenimiento. Agregar
`portfolio_items.size_trait_id` es "derivar de datos que ya tenemos", el caso
textual de la pregunta 3 del workflow.

**Por qué una columna y no una tabla de unión** (a diferencia de
`project_traits`, que sí es una tabla de unión): un proyecto puede describirse
con varios rasgos de varias dimensiones a la vez (zona + tamaño + paleta). Una
pieza de diseño propio tiene **un** tamaño, no un conjunto. Modelarlo como
junction table obligaría a un trigger para imponer "como mucho un `size` por
pieza" — exactamente el tipo de trigger frágil que el propio comentario de
`portfolio_item_styles` señala y evita. Una columna nullable con una FK expresa
"cero o uno" sin trigger.

**Por qué una FK compuesta y no una FK simple:** `traits.id` ya es único por
sí solo, así que una FK simple a `traits(id)` dejaría entrar un trait de
`body_area` o `palette` en una columna que se llama `size_trait_id` — un
estado que no tiene sentido y que rompería el render de la pantalla (mostrar
"Brazo" donde se espera un tamaño). Se impone en la base con el mismo patrón
que ya usa `matches.project_key`: una columna generada constante más un
`unique (id, dimension)` en `traits`, para poder declarar
`foreign key (size_trait_id, size_trait_dimension) references traits (id, dimension)`.
Con `size_trait_id` en `null`, la FK compuesta no se evalúa (comportamiento
MATCH SIMPLE de Postgres), así que el campo sigue siendo opcional sin caso
especial.

### 4. El precio es puntual, no un rango

`professionals.price` y la propuesta de `project_interests` son rangos porque
son estimaciones: el primero sobre trabajo futuro indefinido, el segundo sobre
una pieza que todavía no se dibujó. Acá el objeto ya existe, con un tamaño ya
fijo — no queda ninguna incógnita que un rango exprese con honestidad. Ofrecer
dos columnas (`min`/`max`) que en la práctica siempre van a valer lo mismo
sería la misma clase de falsa precisión que el innegociable 2 ya prohíbe en la
otra dirección (mostrar un score en vez de una banda, en ADR-005): una forma
que promete más de lo que el dato tiene.

Se mantiene, sí, la parte de `professionals.price` que sí aplica sin cambios:
**declarado por el artista, nunca verificado, siempre con fecha.** Un precio
sin `priced_at` no es información acá tampoco.

### 5. Un estado inconsistente: prohibido en la base

`caption`/`year` de una pieza de "tatuaje ya hecho" con un precio de venta al
lado no tiene sentido — ese tatuaje ya está en la piel de otra persona, no se
vende. Una restricción impide que `size_trait_id` o cualquier columna de
precio tengan valor cuando `is_original_design = false`.

### 6. Ningún cambio de RLS

`portfolio_items` ya tiene políticas de owner completas
(`portfolio_items_insert_own`, `_update_own`, `_delete_own`, sin grants por
columna) desde `20260818000300_artist_portfolio.sql`, y la política de
`select` pública ya filtra por `professionals.is_published`. Columnas nuevas
en una tabla existente quedan cubiertas por las políticas que ya existen sobre
la fila entera — no hace falta (ni se debe) escribir política nueva. `traits`
ya es de lectura pública para `authenticated`, así que el formulario que
ofrece los tamaños no necesita ningún acceso nuevo.

### 7. El límite de ADR-018 no se toca

No hay reserva, no hay carrito, no hay estado "alguien ya lo pidió". El
precio y el tamaño son un dato declarado, igual que `professionals.price` — el
turno lo sigue asignando el artista desde el chat. Esta ADR no agrega ninguna
columna ni tabla que pueda leerse como el principio de una cola de pedidos.

## Esquema propuesto

*(Propuesta para `backend-engineer` — no es la migración.)*

```sql
alter table public.traits
  add constraint traits_id_dimension_key unique (id, dimension);
  -- Necesaria para que la FK compuesta de abajo pueda referenciar (id, dimension).

alter table public.portfolio_items
  add column is_original_design boolean not null default false,

  -- Tamaño: FK a un trait de dimensión 'size', opcional, forzada a esa
  -- dimensión sin trigger — mismo patrón que matches.project_key.
  add column size_trait_id uuid,
  add column size_trait_dimension public.trait_dimension
    generated always as ('size'::public.trait_dimension) stored,

  -- Precio puntual, no un rango: ver §4. Mismo patrón de "declarado + fechado"
  -- que professionals.price, forma distinta.
  add column price_cents integer check (price_cents is null or price_cents > 0),
  add column price_currency char(3)
    check (price_currency is null or price_currency ~ '^[A-Z]{3}$'),
  add column priced_at date;

alter table public.portfolio_items
  add constraint portfolio_items_size_trait_fk
    foreign key (size_trait_id, size_trait_dimension)
    references public.traits (id, dimension)
    on delete restrict,
    -- RESTRICT: igual que portfolio_item_styles.style_id — borrar un trait de
    -- talle por debajo de piezas vivas tiene que ser imposible por accidente.

  -- Precio completo o ausente. Mismo espíritu que professionals_price_complete.
  add constraint portfolio_items_price_complete check (
    (price_cents is null and price_currency is null and priced_at is null)
    or (price_cents is not null and price_currency is not null
      and priced_at is not null)
  ),

  -- Tamaño y precio solo tienen sentido sobre un diseño propio. Un tatuaje ya
  -- hecho no se vende: esta restricción es la que impide esa contradicción.
  add constraint portfolio_items_offer_shape check (
    is_original_design
    or (
      size_trait_id is null
      and price_cents is null
      and price_currency is null
      and priced_at is null
    )
  );

comment on column public.portfolio_items.is_original_design is
  'true = diseño propio del artista, ofrecido tal cual está. false = tatuaje ya hecho en un cliente. Ver ADR-034.';
comment on column public.portfolio_items.price_cents is
  'Precio puntual de ESTA pieza, declarado por el artista. Solo con is_original_design. Nunca un rango: el objeto ya tiene una forma fija. Ver ADR-034.';
```

Sin índice nuevo: no hay ninguna consulta con nombre que filtre por
`size_trait_id`, y la sub-sección de diseños propios se trae con el mismo
`where professional_id = X` que ya usa el índice
`portfolio_items_professional_sort_idx` — un portfolio tiene decenas de
piezas, no miles; filtrar `is_original_design` sobre eso no necesita su propio
índice.

## Tipos TypeScript

*(Delta de `packages/domain/src/types/core.ts`.)*

```ts
/**
 * Un precio puntual — a diferencia de `MoneyRange`, que es una estimación
 * sobre trabajo futuro todavía sin definir, esto describe algo que ya existe
 * con una forma fija: un diseño ya dibujado, a un tamaño ya elegido.
 */
export interface Price {
  readonly cents: number
  readonly currency: string
  /** Requerido: un precio sin fecha no es información. */
  readonly pricedAt: string
}

export interface PortfolioItem {
  readonly id: Uuid
  readonly professionalId: Uuid
  readonly mediaId: Uuid
  readonly caption: string | null
  readonly year: number | null
  readonly isFeatured: boolean
  readonly styles: readonly WeightedStyle[]
  readonly isFixture: boolean
  /**
   * true = diseño propio del artista (lo que la UI llame "flash"/"boceto" vía
   * i18n), ofrecido tal cual está. false = tatuaje real ya hecho en un
   * cliente. Ver ADR-034.
   */
  readonly isOriginalDesign: boolean
  /** Slug de un trait de dimensión `size`. Solo no-null si isOriginalDesign. */
  readonly sizeTraitSlug: string | null
  /** Solo no-null si isOriginalDesign. */
  readonly price: Price | null
}
```

`database.types.test.ts` va a necesitar reconciliar estos tres campos contra
los tipos generados — ninguno cambia de forma respecto de lo que ya reconcilia
hoy `MoneyRange`, solo agrega un tipo hermano más chico.

## Chequeo de agnosticismo de categoría

Nada acá sabe qué es un tatuaje. `is_original_design` es una afirmación sobre
la naturaleza de la pieza, aplicable a cualquier rubro. El tamaño no inventa
vocabulario: lee la misma tabla `traits` que ADR-020 ya declaró genérica. El
precio reusa exactamente la forma de "declarado + fechado" que
`professionals.price` ya validó, con la única diferencia de ser puntual en vez
de rango — una diferencia de cardinalidad, no de categoría. El test de
aceptación de `system-architecture.md` §9 sigue pasando: agregar fotografía no
toca ninguna columna nueva de esta ADR, solo agrega filas de `traits` con
`dimension = 'size'` propias del rubro si hiciera falta un vocabulario
distinto — y ni siquiera eso, porque "mini/chico/mediano/grande/gran-formato"
ya sirve para cualquier objeto físico.

## Lo que NO está

- **Reserva, carrito, o un estado "ya lo pidieron".** El contacto sigue siendo
  el chat; ADR-018 no cambia.
- **Tamaño o precio obligatorios** cuando `is_original_design = true`. Un
  artista puede subir el diseño y completar el precio después — igual que
  `professionals.price` es opcional aun estando publicado. Si UX decide que
  un precio es obligatorio para publicar, es una restricción a agregar
  después, con su propia justificación.
- **Negociación o contraoferta.** El precio es lo que el artista declaró; si
  alguien quiere otra cosa, existe el chat para eso, como siempre existió.
- **Exclusión o inclusión explícita del mazo de descubrimiento.** Si una pieza
  de diseño propio debería entrar o no a `get_discovery_feed` es una decisión
  de producto/matching, no de esta ADR — hoy no hay ningún motivo en el
  esquema para tratarla distinto de cualquier otra pieza con estilos
  etiquetados, y no se le agrega ningún filtro nuevo.
- **Una moneda de referencia distinta a la que ya usa `professionals.price`.**
  Mismo `char(3)` ISO-4217, mismo criterio.

## Consecuencias

- **Primera vez que MESH muestra un precio por objeto individual**, no solo
  agregado por artista. Es la razón por la que esta decisión se escribe en vez
  de resolverse en el PR: el innegociable 2 ("nunca inventar... precios") pasa
  a aplicarse con la misma exigencia a nivel de una fila de `portfolio_items`
  que ya aplicaba a nivel de `professionals` — cualquier cambio futuro que
  toque cómo se muestra o se calcula este precio hereda esa misma barra.
- **Dos formas de dinero conviven en el esquema**: `MoneyRange` (estimación) y
  `Price` (puntual). Es un costo real y chico — un tipo hermano, no una
  reescritura — y evita la alternativa peor, que sería forzar un rango
  `min = max` en un lugar donde eso siempre sería una mentira de forma.
- **Una FK compuesta con columna generada**, patrón ya usado en `matches`, se
  repite acá. Vale la pena decirlo explícito porque no es una técnica de uso
  diario: si aparece una tercera vez, es candidato a documentarse como
  convención en `database-design`.

## Referencias

- [ADR-003](ADR-003-domain-model.md) — por qué no hay partición 1:1 sin
  diferencia de comportamiento
- [ADR-018](ADR-018-availability.md) — el límite que esta ADR no toca: el
  turno lo asigna el artista desde el chat
- [ADR-020](ADR-020-brief.md) — de donde sale la dimensión `size` de `traits`,
  ya pensada para ser agnóstica de rubro
- `supabase/migrations/20260817000500_professionals.sql` — la forma de precio
  declarado + fechado que esta ADR extiende, no reemplaza
- `supabase/migrations/20260817001000_matches.sql` — el precedente de columna
  generada + FK/índice compuesto (`project_key`)
- `docs/architecture/data-model.md` §2 — a actualizar en el mismo commit que
  la migración
