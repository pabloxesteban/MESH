# ADR-027 — Avisos: un hecho, sin texto

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** product-architect

## Contexto

[ADR-023](ADR-023-moderation.md) dejó escrito lo que faltaba, con estas
palabras:

> **No te avisamos qué pasó con tu denuncia.** Es lo que más se extraña y falta
> a sabiendas: requiere una bandeja de notificaciones que hoy no existe.

Denunciar algo y no enterarse nunca de qué pasó es peor que no poder denunciar:
la primera vez se hace, la segunda no. Y no es el único hecho que hoy se pierde
— a alguien le dan un turno o se lo cancelan y solo se entera si vuelve a abrir
el chat.

Pero una bandeja de notificaciones es también **la superficie donde toda app
buena se vuelve mala**. El innegociable 3 lo dice desde el primer día, y se
acotó el 2026-08-20 con una condición exacta:

> una notificación tiene que corresponder a **un hecho real y reciente sobre
> quien la recibe**, tiene que poder apagarse, y no puede inventar urgencia ni
> fabricar un motivo para volver cuando no pasó nada.

Esta ADR construye la bandeja de forma que esa condición sea **estructuralmente
imposible de romper**, no una promesa en un documento.

## Decisión

### 1. Un aviso no tiene texto

Es la decisión de la que dependen todas las demás. La tabla `notifications`
tiene un `kind` de un enum cerrado y una referencia; **no tiene ninguna columna
de texto**. La frase la arma la pantalla con i18n.

Lo que eso hace imposible:

- **Inventar urgencia**, porque no hay dónde escribirla. No existe la fila que
  diga "¡se te escapa!".
- **Filtrar contenido ajeno**, porque no viaja ningún texto.
- **Fabricar un motivo para volver**, porque cada valor del enum corresponde a
  un hecho que ocurrió y quedó registrado en otra tabla.

Agregar un tipo de aviso obliga a tocar **dos lugares**: el enum de Postgres y
el catálogo de i18n. Los dos se revisan. Un `body text` habría dejado la puerta
abierta a que cualquiera escriba cualquier cosa desde cualquier lado.

Hay un test que cuenta las columnas de texto de la tabla y **se cae si alguien
agrega una**.

### 2. Tres tipos, y ninguno es "hace rato que no entrás"

| Tipo | El hecho | Quién lo recibe |
|---|---|---|
| `report_reviewed` | El equipo terminó de mirar tu denuncia | Quien denunció |
| `appointment_scheduled` | Te dieron un turno | La persona, nunca el artista |
| `appointment_cancelled` | Se canceló un turno tuyo | **El otro**, nunca quien canceló |

Las dos direcciones son deliberadas y están cubiertas por tests que se caen si
se invierten. El turno lo asigna el artista desde el chat
([ADR-018](ADR-018-availability.md)), así que avisarle a él sería contarle algo
que acaba de hacer.

`open → reviewing` **no avisa nada**: "la estamos mirando" no es una resolución,
y avisar dos veces por la misma denuncia es ruido.

### 3. Los escriben triggers, no el cliente

`notifications` no le da INSERT a `authenticated`. Un aviso es la **consecuencia
de un hecho**, no algo que alguien decide mandar.

Tampoco UPDATE: `read_at` se mueve por `mark_notifications_read()`. Con UPDATE
abierto, el cliente podría reescribir `kind` y hacerse aparecer un aviso que no
ocurrió — que suena absurdo hasta que uno piensa en una captura de pantalla.

DELETE sí: es su bandeja.

### 4. Apagado no escribe, no es que no muestre

El chequeo del interruptor vive en `push_notification()`, una sola vez.
Repetido en cada trigger se olvidaría en el cuarto, y el cuarto sería el que le
escribe a alguien que dijo que no.

La consecuencia honesta está escrita en la pantalla: **quien lo apaga no va a
poder leerlos después**, porque no se guardaron. Se prefiere eso a acumular
avisos sobre alguien que pidió no tenerlos.

### 5. Sin bandeja vacía y sin número

- **Si no pasó nada, la sección no existe.** Un "no tenés avisos" permanente
  arriba de los chats le enseña a la persona a mirar ahí todos los días, que es
  exactamente el hábito que esto no quiere crear.
- **El no leído es un punto, no un contador.** Un número que crece es
  literalmente lo que el innegociable 3 prohíbe: *"cualquier número cuyo
  propósito sea que alguien vuelva a entrar en vez de informarlo"*.

### 6. La denuncia dice cómo terminó, no qué se hizo

«Miramos lo que denunciaste y tomamos una medida» o «…y no encontramos motivo
para actuar».

Cuál fue la medida no se cuenta: sería contar una sanción sobre otra persona.
Y «no encontramos motivo» no se disfraza de otra cosa — una resolución que
siempre suena positiva no es una resolución, es una fórmula de cortesía.

## Lo que NO está

- **Notificaciones push.** Necesitan `expo-notifications`, que es un módulo
  nativo y saca a MESH de Expo Go — la misma restricción de
  [ADR-009](ADR-009-almacenamiento-local.md) que gobernó
  [ADR-026](ADR-026-observability.md). Y push es donde una notificación honesta
  se vuelve una interrupción: merece su propia decisión, no venir de arriba con
  esta.
- **Avisar cuando alguien guarda tu obra.** [ADR-017](ADR-017-saved-ranking.md)
  lo autorizó y se implementó como un contador en el Estudio, no como aviso. Con
  volumen sería el tipo de aviso que llega diez veces por día y necesita
  agrupación; el contador ya lo resuelve sin interrumpir a nadie. Queda anotado
  que la ADR y la implementación difieren, y que la implementación es la buena.
- **Avisar de un mensaje nuevo.** El no leído del chat ya existe y se ve al
  entrar. Un aviso además sería decir dos veces lo mismo.
- **Un badge en la barra de pestañas.** Ver arriba: es un número cuyo propósito
  es que alguien vuelva.

## Consecuencias

- Tres triggers más sobre `reports` y `appointments`. Son `after` y no bloquean
  la operación que los disparó.
- La bandeja vive arriba de Chats y no en una quinta pestaña: cuatro pestañas y
  ninguna más, y lo que hay ahí son hechos que no requieren nada de la persona.
- Un aviso se borra con lo que lo originó (`on delete cascade`). Si alguien
  borra su cuenta, se van todos con ella.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| La tabla sin texto, y los tres triggers | `supabase/migrations/20260821000400_notifications.sql` |
| Que no haya dónde escribir, y las direcciones | `supabase/tests/58_notifications.sql` |
| La bandeja | `apps/mobile/src/features/notifications/NotificationList.tsx` |
| El interruptor | `apps/mobile/src/features/notifications/NotificationsToggle.tsx` |

## Referencias

- [ADR-023](ADR-023-moderation.md) — el hueco que esto cierra, escrito ahí
- [ADR-017](ADR-017-saved-ranking.md) — donde el innegociable 3 se acotó
- [ADR-018](ADR-018-availability.md) — los turnos, y quién los asigna
