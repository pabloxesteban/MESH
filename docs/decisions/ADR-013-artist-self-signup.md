# ADR-013 — Alta propia de artista

**Estado:** Aceptado (2026-08-19) · **Fecha:** 2026-08-19 · **Responsable:** product-architect

## Contexto

Hasta acá había un solo camino para que alguien tuviera un perfil de artista:
MESH lo armaba desde `content/artists/` con `tools/seed` (service role) y le
entregaba a la persona un código de ocho caracteres que canjeaba con
`claim_professional`. El catálogo era **curado por definición**: nadie podía
escribir una fila de `professionals` desde el cliente, y `CLAUDE.md` describía
V1 como "8–15 artistas reales curados".

Eso tenía un costo que no se había visto hasta que hubo que usar el producto:
**no se puede recorrer MESH entero sin la service-role key**. Ni siquiera quien
lo está construyendo. Para probar el flujo de artista —darse de alta, declarar
estilos, publicar la ubicación del estudio, subir obra, recibir un match,
contestar un chat— había que preparar a mano un archivo de contenido, correr el
seeder, generar un código y recién ahí abrir la app. El pedido que originó esta
decisión lo dice sin vueltas: *"para ver el funcionamiento completo de la app
necesito yo mismo crear el perfil como si fuese un tatuador y cargar las
imágenes dentro de la app"*.

## Problema

¿Se abre el alta de artista desde la app, sabiendo que eso termina con el
catálogo exclusivamente curado?

## Opciones

1. **Dejarlo como está y cargar el perfil de prueba con el seeder.** Cero
   superficie nueva. Pero el flujo que se prueba no es el que va a existir: el
   día que MESH quiera más de quince artistas, el alta va a tener que existir
   igual, y va a estrenarse sin haberse usado nunca.
2. **Alta propia con política de INSERT.** El cliente manda la fila. Es la
   opción que menos código nuevo tiene, y la peor: `owner_user_id`,
   `is_published`, `is_fixture` y `category_id` los mandaría el cliente, y
   `with check` tendría que defender cada uno. En particular `is_fixture: true`
   dejaría a cualquiera marcarse como registro de prueba y saltearse los cortes
   que dependen de esa columna (la insignia de fixture, el bloqueo de contacto).
3. **Alta propia con una RPC `SECURITY DEFINER` acotada.** El cliente manda
   nombre y contacto; el servidor decide todo lo demás. Es el mismo patrón que
   ya usan `claim_professional`, `set_studio_location` y
   `mark_conversation_read`.

## Decisión

**Opción 3.** Se agregan tres funciones en
`supabase/migrations/20260819000400_artist_self_signup.sql`:

- `create_own_professional(display_name, instagram, whatsapp)` — crea el perfil
  de quien llama y devuelve el slug.
- `set_own_styles(style_slugs[])` — reemplaza el conjunto de estilos declarados.
- `set_studio_location(lat, lng, neighborhood_slug)` — la versión de dos
  argumentos pasa a tres, para que el barrio también se guarde.

Y en la app, `StudioScreen` deja de ser solo un canje de código: arriba está
**crear tu perfil**, abajo el código para quien ya tiene uno que armamos
nosotros. El orden en pantalla dice cuál es el camino normal.

`claim_professional` **no se toca**. Un perfil que MESH armó se sigue
reclamando con código.

## Por qué

**El servidor decide lo que no se negocia.** El cliente elige nombre y
contacto. Categoría, dueño, publicación, slug y `is_fixture` los fija la
función. No hay forma de mandar `is_fixture: true` desde la app porque el
cliente nunca escribe esa columna.

**Un perfil hecho por una persona no es un registro de prueba.** Aunque el
producto entero esté en pruebas hoy, `is_fixture` significa "esto lo inventamos
nosotros para poder mirar la pantalla". Marcar así el perfil de alguien real
sería mentir en la dirección contraria de lo que esa columna existe para
evitar.

**Un dueño, un perfil.** `professionals_one_per_owner` es un índice único
parcial, no un supuesto del cliente. Sin él, dos toques en "crear" dejan dos
perfiles y `fetchOwnedProfessional` —que hace `limit 1`— empieza a devolver
cualquiera de los dos.

**El slug se deriva, no se pide.** Un slug es una ruta (`mesh://artista/{slug}`)
y nadie debería tener que pensar en eso. Los nombres repetidos se numeran: hay
más de una persona que se llama igual, y eso no es un error de quien se da de
alta.

**Los estilos no son opcionales, y la pantalla lo dice.** El componente Estilo
del matching pesa 0,70. Un perfil sin `professional_styles` saca cero ahí:
existe en el catálogo y no aparece nunca en los resultados de nadie. Por eso
"Tus estilos" no dice "opcional" — dice qué pasa si no está.

**El contacto es obligatorio.** La restricción
`professionals_published_is_contactable` ya lo exigía; la función lo verifica
antes para poder dar un mensaje que se entienda. Un perfil publicado al que no
se le puede escribir es un callejón sin salida para quien lo encuentra.

## Consecuencias

**El catálogo deja de ser exclusivamente curado.** Es el costo real de esta
decisión y no se disimula. Lo que se pierde: hoy, todo lo que aparece en el
mazo pasó por `content/artists/` con consentimiento registrado y validación de
contenido. Con alta propia, un perfil puede entrar sin pasar por nada de eso.

**No hay moderación todavía.** Igual que en [ADR-012](ADR-012-chat.md), se
acepta el riesgo a sabiendas y con el producto sin lanzar. Antes de abrir MESH
a cualquiera hace falta, como mínimo: revisión de perfiles nuevos, denuncia
desde el perfil, y un camino para despublicar. Nada de eso existe hoy.

**Cómo se vuelve a cerrar el día que haga falta.** Es una línea: sacarle el
`grant execute ... to authenticated` a `create_own_professional`. El resto del
producto no cambia — el canje de código sigue funcionando y los perfiles ya
creados siguen existiendo. Un paso intermedio, si se quiere abrir a medias, es
que la función inserte con `is_published = false` y que la publicación pase a
ser una revisión nuestra; el campo y la pantalla que muestra "todavía no está
publicado" ya existen.

**El seeder no se reemplaza.** Sigue siendo el camino para cargar artistas
curados con su consentimiento, sus precios y su bio. Lo que cambia es que ya no
es el *único* camino.

## Verificación

`supabase/tests/26_artist_self_signup.sql` — 18 tests. Los tres que importan:
alguien no puede tener dos perfiles, alguien sin perfil no puede declarar
estilos, y un segundo artista legítimo no toca los del primero. Un barrio no
reconocido no rompe la escritura ni borra el que ya estaba: el geocoder puede
fallar una vez, y perder un dato bueno por eso sería peor.
