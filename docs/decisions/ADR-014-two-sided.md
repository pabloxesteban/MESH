# ADR-014 — MESH tiene dos lados

**Estado:** Aceptado (2026-08-19) · **Fecha:** 2026-08-19 · **Responsable:** product-architect

## Contexto

Hasta acá MESH era un producto de una sola dirección. Alguien busca, aprende su
gusto deslizando obra, y recibe recomendaciones de tatuadores. Después de
[ADR-013](ADR-013-artist-self-signup.md) un tatuador puede darse de alta desde
la app — pero al abrirla veía **exactamente la misma pantalla que cualquier
otro**: un mazo con la obra de otros tatuadores.

El pedido que originó esta decisión lo dice sin vueltas: *"la aplicación para
un usuario normal y para la de un tatuador deberían verse distintas, el
tatuador no quiere scrollear otros tatuadores, el tatuador quiere buscar
posibles clientes"*.

Tenía razón, y el problema era más grande de lo que parecía: la pregunta de
onboarding —"¿ofrecés un servicio o estás buscando?"— existía desde hacía días
y no cambiaba nada. Guardaba una columna que solo decidía si mostrar un botón.

## Problema

¿Qué ve un tatuador cuando abre MESH, y cómo llega a un cliente sin que eso
convierta al producto en un canal de mensajes no pedidos?

## Opciones

1. **El estudio como Inicio.** La primera pantalla del artista es su propio
   perfil: su obra, sus estilos, quién ya le escribió. Cero superficie nueva y
   cero riesgo de privacidad. No responde "buscar posibles clientes": es una
   vitrina, no una búsqueda.
2. **Mazo simétrico de búsquedas.** El artista desliza búsquedas de gente —
   fotos de referencia, estilo, barrio— igual que una persona desliza obra. Es
   el espejo exacto del producto, y el que sí responde el pedido. También el que
   toca datos que nadie aceptó mostrar.
3. **Las dos, por etapas.** Ahora las pestañas, después el mazo.

## Decisión

**Opción 2**, elegida explícitamente por el dueño del producto después de
presentarle las tres, con dos restricciones que no se negociaron por separado
sino que son parte de la decisión:

**Nada se muestra sin que la persona lo encienda.** `projects` gana
`is_open_to_professionals`, que arranca en `false`. Una búsqueda cerrada no la
ve ningún artista, ni por el feed ni por la tabla ni por storage.

**El artista no puede escribir primero.** Manda interés; a la persona le
aparece en su pestaña; el chat lo abre ella. Es la regla que
[ADR-012](ADR-012-chat.md) ya había fijado, y esta feature era exactamente la
que la habría roto sin que nadie lo notara.

Y la consecuencia estructural: **las pestañas dependen de la intención.**

| | Busca | Ofrece |
|---|---|---|
| Inicio | El mazo de obra | El mazo de búsquedas |
| Segunda | Búsqueda por fotos | Tu estudio |
| Tercera | Matches, con los chats | Chats |
| Cuarta | Perfil | Perfil |

La intención se cambia desde Perfil. Una elección de la primera pantalla que no
se puede deshacer no es una preferencia, es una trampa.

## Por qué

**El feed es una proyección, no una tabla.** `get_open_search_feed` es
`SECURITY DEFINER` —al revés que `get_discovery_feed`, que es INVOKER— porque
lo que expone son filas que quien llama no puede leer y no queremos que pueda.
Devuelve columna por columna, elegidas a mano. Lo que **no** devuelve es
`user_id`: para un artista, una búsqueda es una idea sin dueño hasta que su
dueña decida aparecer. Hay un test que falla si alguien agrega esa columna.

**Un paso también se guarda.** Si solo se registrara el interés, el artista
abriría la app y encontraría las mismas búsquedas que ya descartó, para
siempre. `project_interests` guarda un `verdict` (`interest` | `pass`), y la
asimetría es el punto: la persona ve **solo** los intereses. Nadie recibe la
noticia de que la pasaron de largo — exactamente como un artista nunca se
entera de quién pasó su obra en el mazo.

**Deshacer revierte de verdad.** En el mazo de obra, un error de una décima de
segundo pierde una foto. Acá le manda un aviso a una persona. Por eso el
artista puede borrar su propia decisión y la búsqueda vuelve al mazo, en vez de
la regla de "un mensaje no se desmanda" que rige para `messages`. Un interés no
es contenido, es un puntero.

**Solo se muestra lo que pide un estilo que el artista hace.** No es un
puntaje: es un filtro, y es todo el orden que hay (lo demás es por fecha,
lo más nuevo primero). Mostrarle a alguien que hace blackwork una búsqueda de
lettering no es "un match flojo", es ruido, y el ruido vacía el mazo de
sentido. Nada de esto toca `MATCHING_VERSION`: el motor de match sigue siendo
el mismo y sigue corriendo en una sola dirección.

## Consecuencias

**Lo que se abre, dicho sin vueltas.** Una búsqueda abierta expone fotos que la
persona subió para sí misma, más el estilo, el barrio, el presupuesto y la
urgencia si los escribió. Eso lo ve cualquier artista publicado que haga ese
estilo. El interruptor está apagado por default y el texto dice las dos cosas
que importan —qué se muestra y qué no— pero el riesgo existe y es real.

**No hay moderación, otra vez.** Igual que en ADR-012 y ADR-013: no hay
denuncia, ni bloqueo, ni forma de reportar a un artista que manda interés a
todo. El rate limit (30 intereses por hora, y el paso no cuenta) es un tope
técnico, no moderación.

**Cómo se cierra.** Sacarle el `grant execute` a `get_open_search_feed` apaga
el mazo del artista sin tocar nada más; las búsquedas abiertas siguen abiertas
pero no las ve nadie. Para revertir la feature entera: `is_open_to_professionals`
a `false` en todas las filas y listo, sin migrar datos.

**El preview no prueba lo que importa.** El mazo del artista funciona en la
vista previa web con dos búsquedas de ejemplo, pero la garantía real —que una
búsqueda cerrada no la vea nadie— la decide RLS, y ahí no hay base.

## Verificación

`supabase/tests/46_open_searches.sql` — 24 tests. Los que deciden si esto es
publicable: una búsqueda privada no existe para un artista ni conociendo su
uuid; no se manda interés a una búsqueda privada; un paso no le llega a nadie;
cerrar el interruptor la saca del mazo en la lectura siguiente, sin migrar
nada.

`tests/integration/src/demand.test.ts` — 9 tests con la anon key, incluido el
que ninguna otra capa cubre: que **storage** deje bajar la foto de una búsqueda
abierta y no la de una cerrada. Ese test encontró un bug real — la política de
storage preguntaba por `media_assets` y `projects` con los permisos del
artista, que no puede leer ninguna de las dos, así que quedaba muda y el mazo
salía sin imágenes. La misma trampa apareció dos veces en esta migración, y las
dos veces la solución fue la misma: un predicado `SECURITY DEFINER` que
devuelve un booleano sobre un id que quien pregunta ya tiene en la mano
(`is_search_open`, `is_open_search_reference`).
