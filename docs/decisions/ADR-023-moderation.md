# ADR-023 — Denunciar y bloquear

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** security-reviewer

## Contexto

Hasta hace tres días MESH no tenía nada que moderar. El catálogo era curado
—doce perfiles con consentimiento firmado— y el contacto salía a WhatsApp: la
app no alojaba contenido de nadie.

Eso se terminó en cuatro pasos, cada uno con su ADR y todos correctos por
separado:

- [ADR-012](ADR-012-chat.md): chat propio. MESH aloja mensajes.
- [ADR-013](ADR-013-artist-self-signup.md): alta propia. Cualquiera crea un
  perfil y sube obra. Esa ADR ya decía, sin vueltas: *"No hay moderación, ni
  denuncia, ni camino de despublicación. Es un riesgo aceptado a sabiendas con
  el producto sin lanzar."*
- [ADR-019](ADR-019-reviews.md): reseñas. Texto y fotos sobre una persona.
- [ADR-021](ADR-021-brief-assistant.md): un asistente que acepta texto libre.

El producto sigue sin lanzar, pero el riesgo aceptado ya no es el mismo: **la
suma de los cuatro es una app de contenido generado por usuarios**, con dos
lados que se escriben, y sin ninguna forma de avisar que algo está mal ni de
dejar de cruzarse con alguien.

Además de lo evidente, hay dos hechos duros: la guía 1.2 de la App Store exige
mecanismo de denuncia **y** bloqueo de usuarios en toda app con contenido de
usuarios, y una app de tatuajes sin eso no pasa revisión.

## Decisión

Dos tablas, `reports` y `blocks`, y **el bloqueo se impone en la base, no en la
pantalla**.

### 1. Bloquear corta de verdad

Con un bloqueo activo, en cualquiera de las dos direcciones:

| Qué | Dónde se impone |
|---|---|
| No se abre un chat | `conversations_insert_own` |
| No se escribe en uno ya abierto | `messages_insert_participant` |
| No llega una propuesta | `project_interests_insert_own` |
| La búsqueda sale del mazo del artista | `get_open_search_feed()` |
| El perfil sale de las grillas de quien bloqueó | `get_artist_grid()`, `get_discovery_feed()` |

Que las tres primeras sean **políticas** y no chequeos de cliente es todo el
punto: un bloqueo que solo esconde se evade abriendo la app en otro lado.

**Bloquear después de haber hablado es el caso normal, no el raro.** Por eso la
segunda fila existe: cortar solo la apertura del chat habría dejado abierto
exactamente el hilo del que alguien se quiere ir.

### 2. Las grillas filtran una sola dirección, y es a propósito

`get_artist_grid` y `get_discovery_feed` son `security invoker` y filtran solo
los bloqueos **de quien mira**. Que la obra de alguien que te bloqueó siga
apareciendo en Explorar no es un daño: la obra es pública, y el bloqueo corta
donde pasan las cosas — el chat y las propuestas.

El mazo de búsquedas sí filtra en las dos direcciones, porque es una superficie
dirigida: cada fila es el pedido de una persona concreta y termina en un
mensaje.

### 3. Nadie sabe quién lo denunció ni quién lo bloqueó

`reports` y `blocks` se leen solo desde el lado de quien actuó. No hay
notificación, no hay estado visible, no hay forma de inferirlo desde la app.

Un bloqueo que se puede detectar es un bloqueo que se responde, y responder es
exactamente lo que la persona quiso evitar.

Esto obligó a un candado que no es obvio: `is_blocked_pair()` es `security
definer` —tiene que ver filas que RLS le esconde a quien pregunta— así que
**solo contesta si quien llama es una de las dos partes**. Sin esa línea, la
función sería un oráculo público de "¿fulano bloqueó a mengano?", justo lo que
las políticas existen para impedir.

### 4. No se guarda una copia de lo denunciado

Las FK del objetivo son `on delete set null`, no `cascade`. La denuncia
sobrevive al borrado de lo denunciado, pero se queda **sin su objeto**: sabemos
qué tipo de cosa se denunció, no qué decía.

Es una limitación elegida y tiene un costo real: alguien puede denunciar un
mensaje, el autor no puede borrarlo —`messages` es inmutable— pero un artista sí
puede bajar la obra denunciada antes de que alguien la mire, y ahí la denuncia
queda vacía.

La alternativa es que MESH archive copias de mensajes, reseñas y obra ajena por
las dudas, y eso es exactamente lo que no queremos guardar. En la práctica el
borrado suele **ser** la resolución.

`cascade` estaba directamente descartado: con cascade, borrar lo denunciado
borra la denuncia, que es la jugada de quien tiene algo que esconder.

### 5. Una denuncia por persona y por cosa

Un índice único parcial por cada tipo de objetivo. Denunciar diez veces lo mismo
no lo hace más urgente, y sin el índice un solo usuario fabrica una avalancha.

La pantalla traduce el `23505` a «ya lo denunciaste, con una vez alcanza» en vez
de mostrar un error rojo.

### 6. Un artista solo bloquea a quien le escribió

La política lo exige. No es una comodidad: el mazo de búsquedas no trae
`user_id` ([ADR-014](ADR-014-two-sided.md)), así que la conversación es el único
lugar donde a un artista le llega la identidad de alguien. Sin esta condición,
un uuid adivinado alcanzaría para saber si esa persona existe.

Por el mismo motivo, denunciar un mensaje o un turno del asistente exige ser
parte del hilo: una denuncia no puede ser una sonda de existencia.

### 7. El asistente se puede denunciar

Un turno del asistente es un objetivo de denuncia como cualquier otro, y es la
vía por la que nos enteramos de que rompió una de sus siete reglas —un precio,
una disponibilidad, el nombre de un tatuador. [ADR-021](ADR-021-brief-assistant.md)
admite que esas tres las sostiene el prompt y no la forma de la respuesta; sin
este botón, la única forma de enterarnos sería que alguien nos escriba.

## Lo que NO está

- **Ninguna moderación automática.** Ni filtro de palabras, ni clasificador de
  imágenes. Un filtro automático en un catálogo de tatuajes marca la mitad del
  catálogo: hay desnudos, sangre y cicatrices en obra perfectamente legítima.
  Cuando haya volumen, va con su ADR.
- **Panel de moderación.** El equipo trabaja con la service key contra
  `reports`, ordenado por `status, created_at`. Con el volumen de hoy, una
  pantalla propia sería una pantalla sin usuarios.
- **Despublicar un perfil desde la app.** Sigue siendo una acción del equipo.
- **Aviso al denunciante de qué pasó con su denuncia.** Es lo que más se
  extraña, y falta a sabiendas: requiere una bandeja de notificaciones que hoy
  no existe. Queda anotado.
- **Bloquear a alguien que nunca te escribió**, del lado del artista. Ver arriba.

## Consecuencias

- Un bloqueo cuesta dos `exists` por apertura de chat y por mensaje, con índices
  dedicados (`blocks_lookup_idx`). En el mazo, dos más por fila.
- `get_artist_grid` y `get_discovery_feed` ganan un `not exists` cada una. Son
  `security invoker`, así que leen los bloqueos propios sin ninguna función
  privilegiada de por medio.
- Tres políticas existentes se reemplazan (`drop` + `create`). Los tests que ya
  cubrían esas políticas siguen pasando: lo que se agregó es una condición más,
  no un cambio de las que había.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| Tablas, políticas y el corte | `supabase/migrations/20260821000100_moderation.sql` |
| Que el corte sea real | `supabase/tests/55_moderation.sql` |
| Denunciar | `apps/mobile/src/features/moderation/ReportSheet.tsx` |
| Denunciar y bloquear, juntos | `apps/mobile/src/features/moderation/SafetyRow.tsx` |
| El artista bloquea desde el chat | `apps/mobile/src/features/moderation/BlockPerson.tsx` |
| Deshacer | `apps/mobile/src/features/moderation/BlockedList.tsx`, en Perfil |

## Referencias

- [ADR-013](ADR-013-artist-self-signup.md) — el riesgo que esta ADR viene a saldar
- [ADR-014](ADR-014-two-sided.md) — por qué un artista no conoce identidades
- [ADR-021](ADR-021-brief-assistant.md) — las siete reglas que esto ayuda a vigilar
