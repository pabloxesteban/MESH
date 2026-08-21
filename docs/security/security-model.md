# MESH — Modelo de seguridad

**Estado:** Propuesto · **Responsable:** security-reviewer · **Revisa:** backend-engineer

---

## 1. Límites de confianza

```
No confiable ────────────────────────────────────────────
  La app móvil, su bundle, su tráfico de red, y todo
  valor que envía. La anon key es pública. La persona
  puede leer el bundle, interceptar el tráfico y llamar
  a la API directamente.
──────────────────────────────────────────────────────────
Confiable
  PostgreSQL + RLS. Este es el único límite de
  autorización que importa. Si una regla no está
  expresada en una política o en una restricción, no
  está impuesta.
──────────────────────────────────────────────────────────
Privilegiado
  Service-role key. Solo máquina del operador y CI.
  Nunca en la app, nunca en una variable con prefijo
  EXPO_PUBLIC_, nunca en un log.
```

**Supuesto central: el cliente es hostil.** La validación del lado del cliente
existe solo para que la UI sea agradable. Toda regla que importa es una
política, una restricción, o un chequeo dentro de una función `SECURITY
DEFINER`.

## 2. Autenticación

- Supabase Auth. MESH nunca guarda, hashea, compara ni transporta una
  contraseña por su cuenta.
- **Ingreso anónimo en el primer arranque** para que se pueda explorar sin muro,
  y para que no exista ningún camino de lectura sin autenticar en el esquema.
  Los usuarios anónimos tienen un `auth.uid()` real y están sujetos a las mismas
  políticas.
- **Upgrade a cuenta durable** vía email + contraseña (o magic link) que vincula
  la misma fila de `auth.users` — gusto, guardados y proyectos se conservan sin
  ninguna migración de datos.
- Los tokens de sesión se guardan en `expo-secure-store` (Keychain / Android
  Keystore), nunca en el almacenamiento clave-valor común. El refresh lo maneja
  supabase-js.

  **SecureStore rechaza valores de más de 2048 bytes en Android**, y una sesión
  de Supabase los pasa. La salida fácil es volver a AsyncStorage, que es cambiar
  seguridad por comodidad. `data/secure-storage.ts` en cambio parte el valor:
  guarda un manifiesto con la cantidad de pedazos y los pedazos aparte, limpia
  los sobrantes cuando la sesión nueva es más corta, y trata una sesión truncada
  o un manifiesto corrupto como ausente — porque entregar media sesión le da a
  supabase-js un JSON inválido, y eso es un crash en el arranque.
- **Ningún mensaje de auth distingue "no existe ese correo" de "la contraseña
  está mal".** Esa diferencia le confirma a cualquiera si una persona tiene
  cuenta en MESH, y "tengo tatuajes" no es información de nadie más. Por la
  misma razón, pedir el enlace de recuperación siempre responde lo mismo y el
  texto es condicional: "si ese correo tiene una cuenta…".
- El largo mínimo de contraseña se valida **al crear**, no al entrar: una cuenta
  vieja puede tener una más corta que el mínimo de hoy, y bloquearla en el
  cliente la dejaría afuera de su propia cuenta.
- Cerrar sesión no deja a la app sin sesión: abre una anónima nueva. "Sin
  sesión" no es un estado que la app sepa mostrar — sin `auth.uid()` toda
  consulta devuelve vacío por RLS, y la pantalla mostraría estados vacíos que
  son mentira.
- La recuperación de contraseña usa el flujo de Supabase y vuelve a
  `mesh://auth/callback`.
- Cerrar sesión limpia la sesión, el caché de queries y todos los namespaces de
  almacenamiento local con datos de usuario — caché de gusto, cola de
  interacciones, buffer de analytics.

**Contrapartidas de la auth anónima, aceptadas con conocimiento:** abarata la
creación de cuentas para un atacante, así que los ingresos anónimos están
limitados por tasa en el panel de Supabase, los usuarios anónimos reciben el
mismo tratamiento de RLS que cualquiera, y se imponen límites de filas por
usuario en Postgres (§6). La alternativa —un muro de registro antes de cualquier
valor— cuesta más en usuarios reales de lo que ahorra en abuso a esta escala.

## 3. Autorización: RLS en todas las tablas

**Reglas que valen sin excepción:**

1. `alter table … enable row level security;` **y**
   `alter table … force row level security;` en toda tabla de `public`.
   `FORCE` importa: sin eso, el dueño de la tabla saltea sus propias políticas.
2. `revoke all on <tabla> from anon, authenticated;` y después grants explícitos
   solo de los verbos que esa tabla necesita.
3. Toda política nombra su comando (`for select` / `for insert` / …). Nada de
   políticas `for all` — esconden qué verbo está protegiendo una cláusula
   `using`.
4. Toda política `for insert` tiene un `with check`. Una política sin eso es un
   agujero.
5. Ninguna política referencia un id de usuario provisto por el cliente. La
   propiedad siempre es `auth.uid()`.

### Mapa de políticas

| Tabla | SELECT anon/auth | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | fila propia | solo por trigger | fila propia | fila propia |
| `categories`, `styles`, `locations` | todas las filas activas | ✗ | ✗ | ✗ |
| `professionals` | `is_published` **o** dueño (sin publicar) | ✗ | ✗ (solo vía RPC — ver abajo) | ✗ |
| `professional_styles` | padre publicado | ✗ | ✗ | ✗ |
| `portfolio_items` | padre publicado **o** dueño | dueño del padre | dueño del padre | dueño del padre |
| `portfolio_item_styles` | padre publicado **o** dueño | dueño del padre | ✗ | dueño del padre |
| `media_assets` | subidas propias **o** referenciada por un profesional publicado | subidas propias, a `references`/`avatars` | ✗ | subidas propias |
| `interactions` | propias | propias | propias | propias |
| `taste_profiles` | propio | propio | propio | propio |
| `projects` | propios | propios | propios | propios |
| `project_styles`, `project_references` | proyecto padre propio | padre propio | padre propio | padre propio |
| `matches` | propios | propios | propios | propios |
| `conversations` | participante (la persona, o el dueño del perfil) | la persona, y solo contra un perfil publicado **y** reclamado | ✗ (solo vía `mark_conversation_read()`) | ✗ |
| `messages` | participante del hilo padre | participante, y `sender_user_id = auth.uid()` | ✗ | ✗ |
| `project_interests` | el artista dueño (todas las suyas) · la persona (solo `verdict = 'interest'`) | el artista dueño, con perfil publicado y sobre una búsqueda abierta | ✗ | las dos partes |
| `saved_items` | propios | propios (`user_id = auth.uid()`) | ✗ (guardar es insert, desguardar es delete) | propios |
| `availability_rules`, `availability_exceptions` | de cualquier profesional **publicado** | el dueño del perfil | ✗ | el dueño |
| `appointments` | las dos partes | ✗ (solo vía `schedule_appointment()`) | ✗ (solo vía `cancel_appointment()`) | ✗ |
| `reviews` | **solo las propias** (lo público sale de `get_reviews()`) | quien tuvo un turno propio, con ese artista, no cancelado y ya terminado | la autora, con las columnas de origen congeladas por trigger | la autora |
| `reports` | **solo las propias** (el denunciado no sabe que existe) | propias, y solo sobre algo que uno puede ver | ✗ (el estado lo mueve el equipo) | propias, y solo mientras `status = 'open'` |
| `blocks` | **solo del lado de quien bloqueó** | propios; un artista solo bloquea a quien le escribió | ✗ | propios (desbloquear es borrar) |
| `traits` | todas las filas activas | ✗ | ✗ | ✗ |
| `project_traits` | proyecto padre propio | padre propio | ✗ (sacar y poner) | padre propio |
| `assistant_threads` | propios | propios (`user_id = auth.uid()`) | ✗ (solo vía `attach_thread_project()`) | propios |
| `assistant_turns` | del hilo padre propio | del hilo propio **y solo `role = 'person'`** | ✗ | ✗ (se borra el hilo entero) |
| `analytics_events` | ✗ | propios (`user_id = auth.uid()`) | ✗ | ✗ |
| `audit_events` | ✗ | ✗ | ✗ | ✗ (sin políticas — solo service role) |

**Nadie lee una fila de guardado ajena, y nadie sabe quién guardó.**
`saved_items` no tiene ninguna política que le deje a un artista ver las filas
de su obra. Lo que sí puede desde el 2026-08-20 —ver ADR-017, que enmienda
ADR-016— es **contar**, por dos funciones `security definer` que devuelven
agregados y columnas elegidas a mano:

- `get_top_saved()` — el ranking público de una ventana.
- `get_own_save_counts()` — los conteos de la obra propia, y solo la propia:
  filtra por `owner_user_id = auth.uid()` adentro de la función, que es lo que
  impide que `security definer` la convierta en una forma de contar los
  guardados de cualquiera.

**Ninguna de las dos devuelve `user_id`.** Se abrió el agregado, no la
identidad. Está verificado en `supabase/tests/48_saved_items.sql`, que falla si
alguien le agrega una columna de identidad a cualquiera de las dos.

**Ver el almanaque y ver la agenda son cosas distintas.** El horario de un
artista publicado es público —es lo que la persona viene a mirar antes de
escribirle— y los huecos tomados también, vía `get_busy_slots()`. Pero esa
función devuelve **desde y hasta, nada más**: ningún `user_id`, ninguna nota,
ninguna conversación. Un hueco ocupado no dice de quién es. Ver ADR-018.

`appointments` no tiene política de INSERT ni de UPDATE: agendar y cancelar
pasan por funciones, porque los invariantes son varios —la conversación tiene
que ser del artista, el cliente sale de ahí y no de un parámetro, el pasado no
se agenda— y no todos caben en un `with check`.

**Una reseña dice que pasó, no quién.** `reviews` lleva `user_id`, así que la
política de SELECT de la tabla es solo lo propio; lo público sale de
`get_reviews()`, `security definer`, con columnas elegidas a mano y **sin
ninguna que identifique a nadie**. La reseña de un tatuaje dice dónde estuvo una
persona y qué se hizo en el cuerpo: firmarla es una decisión suya y nadie la
tomó. Verificado en `supabase/tests/51_reviews.sql`, que falla si alguien le
agrega una columna de identidad.

**El artista no puede tocar la reseña que le dejaron.** No aparece en ninguna
política de escritura de `reviews`, y tampoco lee la tabla. La puerta de atrás
—cancelar el turno del que nació la reseña, que la borraría por `on delete
cascade`— está cerrada: `cancel_appointment()` rechaza cancelar un turno que ya
terminó. Es una enmienda a ADR-018 hecha desde ADR-019, y los dos tests que la
sostienen están en `51_reviews.sql`.

**`professionals` sigue sin política de INSERT ni de UPDATE para el cliente**,
ni siquiera para el dueño. Todo lo que un artista escribe sobre su propia fila
pasa por una RPC `SECURITY DEFINER` angosta, owner-scoped por `owner_user_id =
auth.uid()`:

| RPC | Qué toca |
|---|---|
| `claim_professional(code)` | `owner_user_id`, `claimed_at`, sobre un perfil que MESH armó |
| `create_own_professional(nombre, ig, wa)` | crea la fila entera, con las columnas sensibles fijadas por el servidor |
| `set_own_styles(slugs[])` | `professional_styles` del perfil propio |
| `set_studio_location(lat, lng, barrio)` | `studio_lat`, `studio_lng`, `location_id` |

El portafolio (`portfolio_items`, `portfolio_item_styles`) sí se escribe por
política normal, con la propiedad resuelta por el mismo predicado.

Por qué RPCs y no políticas: la fila de `professionals` tiene precio,
disponibilidad, `is_published` e `is_fixture` además de lo que el dueño edita.
Una sola política de update abriría todo eso con un `with check` que solo
debería cubrir tres columnas, y una política de insert dejaría al cliente
mandar `is_fixture: true` — o sea, marcarse como registro de prueba y saltearse
los cortes que dependen de esa columna. Un `grant update` por columnas ya se
probó y se descartó en el flujo de reclamo (rompe cualquier `select *`; ver el
comentario de `professional_claims` en la migración de portfolio).

Una persona tiene como mucho un perfil, y eso lo impone la base
(`professionals_one_per_owner`, índice único parcial), no el cliente. Ver
`supabase/migrations/20260818000300_artist_portfolio.sql`,
`supabase/migrations/20260818000400_studio_location.sql`,
`supabase/migrations/20260819000400_artist_self_signup.sql`,
`supabase/tests/25_artist_ownership.sql`,
`supabase/tests/26_artist_self_signup.sql` y
[ADR-013](../decisions/ADR-013-artist-self-signup.md).

**Lo que esto abre, dicho sin vueltas:** hasta acá nadie podía crear una fila de
`professionals` desde el cliente, y el catálogo era curado por definición. Ya no.
No hay moderación, ni denuncia, ni camino de despublicación. Es un riesgo
aceptado a sabiendas con el producto sin lanzar, y la vuelta atrás es una línea
—sacarle el `grant execute` a `create_own_professional`—, no una migración.

### Denunciar y bloquear

Dos tablas que solo se leen desde el lado de quien actuó, y un bloqueo que se
impone **en las políticas**, no en la pantalla. Ver
[ADR-023](../decisions/ADR-023-moderation.md).

Con un bloqueo activo, en cualquier dirección: no se abre un chat
(`conversations_insert_own`), no se escribe en uno ya abierto
(`messages_insert_participant`), no llega una propuesta
(`project_interests_insert_own`) y la búsqueda sale del mazo
(`get_open_search_feed`). Un bloqueo que solo esconde se evade abriendo la app
en otro lado.

Tres cosas no obvias que sostienen esto:

- **`is_blocked_pair()` es `security definer` y por eso lleva su propio
  candado.** Tiene que ver filas que RLS le esconde a quien pregunta —si el
  otro lo bloqueó a él—, así que **solo contesta si quien llama es una de las
  dos partes**. Sin esa línea sería un oráculo público de "¿fulano bloqueó a
  mengano?".
- **Denunciar exige poder ver lo denunciado.** Un mensaje solo lo denuncia un
  participante del hilo; un turno del asistente, el dueño del hilo. Sin esas
  guardas, el éxito o el fallo del insert diría si ese uuid existe: una denuncia
  no puede ser una sonda de existencia.
- **Un artista solo bloquea a quien le escribió.** Es la misma razón: el mazo no
  trae `user_id`, así que la conversación es el único lugar donde esa identidad
  le llegó.

Las FK del objetivo de una denuncia son `on delete set null`, no `cascade`: con
cascade, borrar lo denunciado borraría la denuncia — que es la jugada de quien
tiene algo que esconder.

### El hilo con el asistente

Un `assistant_thread` es de una sola persona y **no lo lee nadie más**: ni otro
usuario, ni un artista, ni sabiendo su id. Es la superficie donde alguien cuenta
qué se quiere tatuar y por qué, así que se trata como sus fotos de referencia.
Ver [ADR-021](../decisions/ADR-021-brief-assistant.md).

Lo que sostiene la ADR entera es **una línea de la política de INSERT**:

```sql
create policy assistant_turns_insert_own on public.assistant_turns
  for insert to authenticated
  with check (role = 'person' and ...)
```

Sin `role = 'person'`, un cliente modificado fabrica una respuesta del asistente
—un precio, una disponibilidad, un "fulano te lo hace"— y la muestra como si
MESH la hubiera dicho. Las tres prohibiciones fuertes de esa ADR no valen nada
si el cliente puede escribir del lado del bot.

El turno del asistente lo escribe `supabase/functions/brief-assistant` **con la
service key**, y es lo único para lo que la usa. Antes verifica el hilo **con el
JWT de quien llama**: si RLS no se lo devuelve, no es suyo y la función no
escribe nada. Verificado en `supabase/tests/53_assistant.sql`.

Dos cosas más que se le deben a quien usa esto:

- **El hilo se borra entero**, con todo lo que se dijo adentro, y el DELETE es
  del cliente a propósito.
- **Nada de lo que el asistente escribe cruza hacia un artista** salvo el pedido
  que la persona leyó, editó y confirmó — que se guarda en
  `projects.description`, o sea como texto suyo. La transcripción no sale nunca.

### Las búsquedas de la gente

Un `project` es privado por default y sigue siéndolo: `projects_select_own` no
se tocó. Lo nuevo es `is_open_to_professionals`, que arranca en `false` y solo
enciende la persona. Ver [ADR-014](../decisions/ADR-014-two-sided.md).

Con el interruptor encendido, un artista publicado que haga alguno de los
estilos pedidos puede:

- leer **la proyección** que devuelve `get_open_search_feed()` — no la tabla, y
  sin `user_id`;
- bajar las fotos de referencia, por la política
  `"references: leer las de búsquedas abiertas"`;
- insertar una fila en `project_interests`.

Nada más. No puede leer `projects`, ni `project_styles`, ni
`project_references`, ni abrir una conversación: el chat lo abre la persona
(ADR-012), y esta feature era la que habría roto esa regla sin que nadie lo
notara.

**Dos predicados `SECURITY DEFINER` sostienen esto**, y la razón es la misma en
los dos casos: una política que consulte una tabla que el escritor no puede leer
se evalúa con SUS permisos y siempre da falso. `is_search_open(uuid)` responde
si una búsqueda está abierta; `is_open_search_reference(text)` responde si una
ruta de storage cuelga de una búsqueda abierta. Los dos devuelven un booleano
sobre un dato que quien pregunta ya tiene en la mano, y no exponen ninguna
columna.

**Un `pass` no le llega a nadie.** `project_interests` guarda las dos
decisiones del artista para que su mazo no repita, pero la política de SELECT de
la persona exige `verdict = 'interest'`. Nadie recibe la noticia de que la
pasaron de largo, igual que un artista nunca se entera de quién pasó su obra.

**Rate limit:** 30 intereses por hora por profesional (`enforce_interest_rate`).
El paso no cuenta — descartar rápido es el uso normal del mazo. Es un tope
técnico, no moderación: no hay denuncia ni bloqueo todavía.

El SELECT de `media_assets` es el caso sutil: un `using (true)` ingenuo filtraría
las rutas de storage de las imágenes de referencia privadas de otras personas —
la ruta *es* la llave para pedir el objeto. La política tiene dos ramas: la
propia (`owner_user_id = auth.uid()`), definida junto con la tabla, y la del
catálogo, un `EXISTS` que exige que la fila cuelgue de una pieza, un avatar o un
hero de un profesional **publicado**. Esa segunda rama vive en la migración de
portfolio, que es la primera donde existe la tabla que define qué está
publicado.

`media_assets` tampoco tiene UPDATE para nadie: una fila describe un archivo
inmutable. Si el `path` pudiera cambiar, un `checksum` registrado dejaría de
significar algo.

`profiles` no tiene política de INSERT. La fila la crea un trigger sobre
`auth.users`; un cliente que pudiera insertar perfiles podría crear filas con
ids ajenos.

### La garantía, impuesta por test

`supabase/tests/00_rls_guarantee.sql` recorre el catálogo de Postgres —no una
lista de tablas escrita a mano— y falla si:

1. alguna tabla de `public` no tiene RLS habilitado,
2. alguna no lo tiene **forzado**,
3. alguna política usa `for all`,
4. alguna política de insert no tiene `with check`,
5. alguna de update no protege `using` **y** `with check`,
6. alguna tabla sin políticas tiene igual grants de cliente,
7. `anon` tiene algún privilegio sobre alguna tabla de `public`,
8. alguna función `security definer` no fija su `search_path`.

**No se puede agregar una tabla sin políticas.** Corre en CI en cada migración,
y como no conoce ninguna tabla por nombre, una tabla nueva queda cubierta sin
que nadie se acuerde de agregarla.

El punto 6 dice "sin políticas **o** sin grants" y no "≥1 política" por un caso
real: `audit_events` a propósito no tiene ninguna política. Una tabla que ningún
rol de cliente puede tocar es inalcanzable tenga las políticas que tenga, y
escribirle políticas de mentira para satisfacer un test las volvería la
documentación equivocada de lo que hace.

El aislamiento entre usuarios se verifica aparte, en
`supabase/tests/20_cross_user.sql`, ejecutando con `set local role authenticated`
más un claim `sub` — que es exactamente lo que PostgREST hace con un JWT. Correr
esos tests como `postgres`, que tiene BYPASSRLS, los haría pasar siempre: es la
forma más común de tener una suite de RLS que no prueba nada.

## 4. Storage

| Bucket | Visibilidad | Escritura | Convención de rutas |
|---|---|---|---|
| `portfolio` | lectura pública | solo service role | `portfolio/{professional_slug}/{item_id}/{size}.webp` |
| `references` | privado | solo dueño | `references/{user_id}/{uuid}.webp` |
| `avatars` | lectura pública | solo dueño | `avatars/{user_id}/{uuid}.webp` |
| `reviews` | lectura pública | solo dueño | `reviews/{user_id}/{uuid}.jpg` |

Las políticas de storage de los buckets escribibles por el dueño verifican
`(storage.foldername(name))[1] = auth.uid()::text` — el primer segmento de la
ruta es el id de quien llama, así que nadie puede escribir en la carpeta de otra
persona ni fabricando la ruta.

Los objetos privados se sirven vía URLs firmadas de vida corta (≤ 1 hora)
generadas a demanda. Las URLs firmadas nunca se persisten, nunca se loguean y
nunca van en un deep link.

**`reviews` es de lectura pública y eso es una decisión, no un descuido**: la
foto se muestra en el perfil del artista. Por eso la pantalla lo dice antes de
subir nada, y por eso la recodificación que limpia el EXIF importa más acá que
en ningún otro lado — es una foto sacada en el estudio, con las coordenadas del
estudio adentro.

`portfolio` no tiene ninguna política de escritura para el cliente: lo escribe
el service role y, desde ADR-013, el artista dueño del slug. Ningún bucket tiene
política de UPDATE — reemplazar una imagen es subir una nueva y borrar la vieja, porque un
update cambiaría los bytes debajo de una fila de `media_assets` que ya registró
un checksum.

Las rutas se arman en un solo lugar, `packages/domain/src/storage/paths.ts`, que
las usan tanto el seeder como la app. Una ruta armada de dos formas distintas es
una política de storage que protege una de las dos. Ese módulo rechaza cualquier
id que no sea un UUID, así que un nombre de archivo provisto por una persona no
puede contener `../` ni llegar a formar parte de una ruta.

Verificado en `supabase/tests/40_storage.sql`: A escribe en su carpeta, A no
escribe en la de B ni fabricando la ruta, un objeto sin carpeta se rechaza, nadie
escribe en el catálogo desde el cliente, B no ve la referencia privada de A, y
ninguna política de storage nombra a `anon`.

## 5. Validación de subidas

Los chequeos del lado del cliente son UX. Lo que realmente impone es:

- Lista blanca de MIME a nivel bucket: `image/jpeg`, `image/png`, `image/webp`,
  `image/heic`. Nada de SVG — un SVG es un contenedor de scripts.
- Tope de tamaño a nivel bucket: 12 MB (2 MB para avatares).
- Los nombres de archivo siempre son UUIDs generados por el servidor. Los
  nombres provistos por el usuario nunca se usan en una ruta — sin traversal,
  sin bytes nulos, sin trucos de homoglifos unicode.
- El content-type se setea explícitamente en la subida, nunca se infiere de la
  extensión.
- Las imágenes se recodifican durante el pipeline de seed, lo que elimina el
  EXIF (incluido el GPS) como efecto secundario. Las referencias que sube el
  usuario se recodifican y limpian del lado del cliente antes de subirse, y un
  test lo verifica — una foto de referencia sacada en casa no debería llevar las
  coordenadas de esa persona.
- Las subidas cuentan contra una cuota por usuario (§6).

## 6. Prevención de abuso

| Vector | Control |
|---|---|
| Creación masiva de cuentas anónimas | Límite de tasa de Supabase en el ingreso anónimo; límites por IP en el gateway |
| Inundación de interacciones | El UNIQUE `(user_id, portfolio_item_id)` acota las interacciones al tamaño del catálogo; límites de tasa por usuario |
| Spam de proyectos | Máximo 20 proyectos **sin archivar** por usuario, impuesto por un trigger `BEFORE INSERT`, no por el cliente. Los archivados no cuentan: archivar es la salida, y hacerla contar convertiría la cuota en una trampa sin puerta |
| Abuso de storage con imágenes de referencia | Máximo 10 referencias por proyecto, máximo 50 MB por usuario, los dos con trigger `BEFORE INSERT`. La media curada no tiene cuota — la sube el seeder, no una persona |
| Inundación de analytics | Solo inserción, sin lectura; se monitorea el volumen; los eventos se descartan, nunca se reintentan agresivamente |
| Avalancha de denuncias | Un índice único parcial por persona y por objetivo. Denunciar diez veces lo mismo no lo hace más urgente |
| Sondeo de existencia por denuncia o bloqueo | Toda denuncia y todo bloqueo exigen poder ver el objetivo: participar del hilo, ser dueño del hilo del asistente, o haber conversado. Un uuid adivinado es rechazado igual que uno inexistente |
| Inundación del asistente | 40 turnos por hilo y 120 turnos de persona por hora, los dos con trigger `BEFORE INSERT`. El tope por hilo además acota el contexto que se le manda al modelo: sin él, el costo por hilo no tiene techo |
| Reconstrucción del negocio de un artista con `get_reply_habit()` | Devuelve un solo valor de un enum de tres. Sin fechas, sin conteos, sin identidades: llamarla en loop no dice con quién habló ni cuántas conversaciones tiene |
| Cosecha de datos de contacto | `whatsapp_e164` e `instagram_handle` son legibles para profesionales publicados — eso *es* el producto. La mitigación es el consentimiento (los artistas saben que sus datos se muestran) más límite de tasa en la lectura del catálogo, no la oscuridad. |
| Scraping del catálogo | Aceptado como daño bajo en V1 con 12 perfiles públicos y consentidos. Revisitar antes de que el catálogo sea un activo. |

Los triggers de cuota son `SECURITY DEFINER` con `search_path` fijado, a
propósito: cuentan filas para decidir si aceptar una más, y una cuenta que RLS
pudiera recortar sería una cuota evadible. Verificados en
`supabase/tests/50_quotas.sql`, ejecutados desde el rol `authenticated` — que es
desde donde se intentaría evadirlos.

## 7. Secretos

| Secreto | Dónde vive | Dónde nunca puede estar |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Bundle del cliente (público por diseño) | — |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Bundle del cliente (público por diseño) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | `tools/seed/.env.local`, secreto de CI | Cualquier archivo bajo `apps/`, cualquier log, cualquier commit |
| `ANTHROPIC_API_KEY` | Secreto de las Edge Functions `read-reference` y `brief-assistant` (`supabase/.env` local, `supabase secrets set` en producción) | Cualquier archivo bajo `apps/`, cualquier variable `EXPO_PUBLIC_*`, cualquier log, cualquier commit |
| Contraseña de la base | Gestor de contraseñas del operador | En cualquier otro lado |

Controles:
- `.env*` está en gitignore salvo `.env.example`.
- Un chequeo de CI busca `service_role` y el prefijo del JWT de service key en
  el bundle compilado y rompe el build si aparece.
- `tools/seed` se niega a correr si detecta que está ejecutando dentro de un
  contexto de Metro o Expo.
- El escaneo de secretos está habilitado en el repositorio.

## 8. Logging y datos personales

- Nada de logging en producción de tokens, emails, cuerpos de mensajes,
  descripciones de proyecto, texto de búsqueda ni URLs firmadas de storage.
- Los errores se mapean a códigos antes de mostrarse; los errores crudos de
  Postgres nunca llegan a una persona ni a un evento de analytics — filtran
  nombres de tablas y columnas.
- `audit_events` registra quién le hizo qué a qué entidad, con metadatos
  limitados a ids y enums.
- El reporte de crashes, si se agrega, tiene que limpiar los breadcrumbs; no
  está en V1.

## 9. Derechos sobre los datos

- **Exportación:** la persona puede pedir su perfil, interacciones, gusto,
  proyectos y matches en JSON. En V1 se puede atender manualmente; las consultas
  existen como script.
- **Borrado:** borrar el usuario de auth cascadea a todas las filas de su
  propiedad; los objetos de storage bajo `references/{user_id}/` y
  `avatars/{user_id}/` los elimina la misma rutina. Queda registrado en
  `audit_events`.
- **Opt-out de analytics:** `profiles.analytics_opt_in`; cuando está en falso el
  cliente no encola nada.
- **Retiro de artista:** ver
  [`content-policy.md`](../product/content-policy.md) §8.

## 10. Dependencias y cadena de suministro

- `npm audit` en CI; alto/crítico bloquea el merge.
- Lockfiles commiteados. Las dependencias se agregan solo con una razón
  declarada.
- Ninguna dependencia recibe acceso a secretos — el conjunto de dependencias de
  la herramienta de seed se mantiene mínimo y separado del de la app.
- Los upgrades del SDK de Expo son deliberados, probados en dispositivo y
  registrados.

## 11. Checklist de revisión (correr antes de cada release)

Última corrida: **2026-08-18**, resultado en
[`audit-2026-08-18.md`](audit-2026-08-18.md). Un hallazgo (parámetros de deep
link sin validar), corregido; un ítem informativo aceptado y documentado.

- [ ] Toda tabla de `public`: RLS habilitado **y** forzado, ≥ 1 política,
      verbos correctos
- [ ] Toda política `for insert` tiene un `with check`
- [ ] Ninguna política `for all`
- [ ] Los tests de acceso cruzado pasan en todas las tablas de propiedad de
      usuario
- [ ] Ningún string `service_role` en el bundle compilado
- [ ] Las políticas de storage restringen la escritura a la carpeta de quien
      llama
- [ ] Ninguna propiedad nueva de analytics con texto libre
- [ ] Parámetros de deep link validados; ningún link que mute
- [ ] Tokens de sesión solo en `expo-secure-store`
- [ ] `npm audit` limpio en alto/crítico
- [ ] Las tablas nuevas agregadas al mapa de políticas de §3
