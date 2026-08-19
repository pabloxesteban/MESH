# ADR-012 — Chat adentro de MESH

**Estado:** Aceptado (2026-08-19) · **Fecha:** 2026-08-19 · **Responsable:** product-architect

## Contexto

V1 decidió explícitamente **no** construir mensajería:
[`data-model.md`](../architecture/data-model.md) lista `Conversation` y
`Message` entre las entidades descartadas, con esta razón: *"el contacto de V1
es WhatsApp/Instagram. Construir un subsistema de mensajería sin uso agrega
superficie de moderación, notificaciones y abuso sin demanda validada."*

Esta ADR revierte esa decisión por pedido explícito del dueño del producto,
después de que se le presentara el costo (tabla, RLS, realtime, moderación,
abuso) y la alternativa más barata — mostrar en Matches quién ya tiene una
conversación abierta por WhatsApp.

## Decisión

Se construye chat propio: `conversations` y `messages`, con RLS estricta y
realtime de Supabase. Ver
`supabase/migrations/20260819000300_conversations.sql`.

**El contacto por WhatsApp/Instagram no se saca.** Sigue siendo el único
camino para un perfil sin reclamar, y queda como acción secundaria en los
perfiles que sí se pueden chatear: escribir adentro de MESH no debería
obligar a nadie a dar su número, y tampoco al revés.

## Restricciones que se eligieron, y por qué

**Solo se puede chatear con un perfil reclamado.** Sin `owner_user_id` no hay
nadie del otro lado a quien le llegue el mensaje. Ofrecer el chat igual sería
una bandeja de salida que no llega a ningún lado — peor que no ofrecerlo,
porque la persona cree que escribió. La política de INSERT lo exige, y la
pantalla no muestra el botón. Consecuencia honesta: con el catálogo actual
—casi todo fixtures sin dueño— el chat arranca casi vacío, y eso es correcto.

**Solo la persona abre el hilo.** El artista responde, nunca inicia. Al revés
sería un canal de mensajes no pedidos hacia gente que solo miró un perfil:
spam por diseño, no por abuso.

**Un mensaje es inmutable.** Sin UPDATE ni DELETE para el cliente. No se edita
lo dicho, y no se borra la mitad de una conversación que otra persona también
tiene. Mismo criterio que `media_assets`.

**El estado de leído no es una columna que el cliente escriba.** Va por
`mark_conversation_read()`, que decide qué columna tocar según quién llama —
mismo patrón que `set_studio_location()`. Con una política de UPDATE, marcar
leído y marcar leído *por el otro* serían la misma escritura con distinto `set`.

**Techo de 60 mensajes por hora**, por trigger `SECURITY DEFINER`. No es una
cuota de producto —nadie escribe 60 por hora de buena fe— sino un límite
contra un cliente modificado mandando en loop.

## Lo que el chat NO tiene, y es deliberado

Nada de esto es una funcionalidad pendiente: son ausencias elegidas, por la
misma regla que prohíbe dark patterns (CLAUDE.md, innegociable 3).

- **Sin "escribiendo…" ni "visto".** Los dos convierten una conversación en una
  obligación de responder rápido. La persona del otro lado está tatuando.
- **Sin notificaciones que empujen a volver.** El no leído se ve al entrar.
- **Sin contador de pendientes.** Un punto, no un número: contar mensajes sin
  leer es una cuenta diseñada para que vuelvas.

## Riesgos aceptados

- **Moderación.** No hay reportes ni bloqueo todavía. Es la deuda más grande
  que deja esta ADR y hay que saldarla antes de abrir el chat a un catálogo
  real y grande. Mitigación parcial hoy: solo se puede escribir a artistas
  curados y reclamados, y el volumen está acotado por el rate limit.
- **Retención de contenido.** Los mensajes se guardan sin vencimiento. Al
  borrar la cuenta caen por `on delete cascade`, pero no hay política de
  retención propia.
- **Expectativa de respuesta.** Un chat adentro de la app sugiere que el
  artista lo mira. Si no lo mira, la conversación queda muerta y la culpa se
  la lleva MESH. Hay que medirlo.

## Consecuencias

- `data-model.md` deja de listar `Conversation`/`Message` como descartadas y
  pasa a documentarlas.
- El mapa de políticas de `security-model.md` suma las dos tablas.
- El aislamiento cruzado se verifica en `supabase/tests/45_conversations.sql`,
  que es el test que decide si esto es publicable.
