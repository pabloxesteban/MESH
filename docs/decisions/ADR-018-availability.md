# ADR-018 — El almanaque: reglas, no casilleros

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Responsable:** product-architect

## Contexto

Hasta acá la disponibilidad de un artista era **un campo que escribía a mano**:
"tomando turnos", con la fecha en que lo dijo. Honesto, y poco: no dice qué
martes, ni a qué hora, ni si esa tarde ya está llena.

El pedido fue explícito, y también lo fue el flujo: *"el artista tiene que
configurar su disponibilidad. Primero tiene que haber un chat y el objetivo es
que de ese chat se derive al turno asignado y eso quede en el sistema como
ocupado."*

Esto empezó siendo el esquema. Las pantallas se agregaron el mismo día y están
descritas abajo, en «Las tres pantallas».

## Decisión

### 1. La disponibilidad son reglas, y los huecos se derivan

Un artista dice **"martes a sábado de 14 a 20"**, más las excepciones de días
sueltos. No se generan trescientos casilleros vacíos.

Los huecos libres se calculan: **regla del día, menos excepción, menos lo que
ya está tomado.** El cálculo vive en `packages/domain/src/scheduling/slots.ts`,
puro y con tests — porque una agenda falla en los bordes, y los bordes no se
ven mirando una pantalla.

Pre-generar casilleros parece más simple y no lo es: obliga a decidir hasta
cuándo generarlos hacia adelante, y a migrarlos cada vez que el artista cambia
su horario. El estado que se mantiene a mano es el que se desincroniza.

**Una excepción reemplaza a la regla, no se le suma.** Si se sumaran, marcar un
feriado no serviría para nada — justo el caso para el que se marca un día.

### 2. El turno nace de un chat, y lo asigna el artista

`conversation_id` no es decoración: es la prueba de que hubo un ida y vuelta
antes de que alguien ocupe una tarde, y de ahí sale **quién es el cliente**. Si
el cliente viniera por parámetro, un artista podría agendarle un turno a
cualquiera.

Solo el artista agenda. Que el cliente pudiera reservar solo convertiría el
almanaque en un formulario de reservas, que es otro producto — y no es el que
se pidió.

### 3. "Ocupado" lo garantiza Postgres

```sql
exclude using gist (
  professional_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
) where (status = 'scheduled')
```

Chequearlo en TypeScript deja la carrera abierta: dos pedidos simultáneos leen
"libre" y los dos escriben. El rango es `[)` para que dos turnos consecutivos
—uno termina 16:00, el otro empieza 16:00— convivan; con `[]` una agenda llena
sería imposible de cargar.

Los cancelados quedan fuera del índice parcial, así que **cancelar libera el
horario en el mismo instante** sin borrar el historial.

### 4. Dos estados, y los dos los escribe alguien

`scheduled` y `cancelled`. **"Completado" no está.** Que un turno ya pasó se
deriva de `ends_at`, y un estado que nadie se acuerda de marcar queda para
siempre en su valor inicial, mintiendo.

Esto importa más de lo que parece porque **las reseñas se apoyan acá**: se
decidió que solo reseñe quien tuvo un turno, y la condición va a ser un turno
`scheduled` cuyo `ends_at` ya pasó. Sin nadie que tenga que apretar un botón.

### 5. Quién ve qué

| | El horario | Los huecos tomados | El turno |
|---|---|---|---|
| Cualquiera | ✅ si el perfil está publicado | ✅ vía `get_busy_slots()` | ❌ |
| El cliente | ✅ | ✅ | ✅ el suyo |
| El artista dueño | ✅ escribe | ✅ | ✅ los suyos |

**Un hueco ocupado no dice de quién es.** `get_busy_slots()` devuelve dos
columnas —desde y hasta— y ninguna identifica a nadie ni dice de qué es el
turno. Ver el almanaque de un artista y ver su agenda son cosas distintas, y
solo la primera es pública.

### 6. Las tres pantallas

Una por cada cosa que alguien hace con un almanaque, y ninguna hace dos.

| Dónde | Quién | Qué hace |
|---|---|---|
| **Estudio** → `AvailabilityEditor` | el artista | Carga su horario semanal: elige un día y agrega tramos. Un día a la vez, con dos toques —desde y hasta— y sin teclado: un campo libre acepta "25:70". |
| **Chat** → `ScheduleFromChat` | el dueño de la agenda | Da el turno. Solo aparece si quien mira es el artista de ese hilo, y eso se pregunta a la base, no se recibe como prop. |
| **Perfil** → `PublicCalendar` | cualquiera | Cuántos horarios quedan libres los próximos siete días. **El número, nunca los horarios**, y sin botón de reservar: el turno sale de una charla. |

Dos detalles que parecen chicos y no lo son:

- **El botón de dar un turno se decide contra la base.** `ChatScreen` pregunta
  quién es el dueño del profesional de ese hilo y lo compara con quien mira. La
  primera versión lo recibía como prop desde la ruta; eso hace que la pantalla
  esté bien solo si todos sus llamadores aciertan, y basta una ruta nueva para
  ofrecerle a un cliente un botón que la base va a rechazar con un 42501.
- **Los horarios que se ofrecen son los libres de verdad**: regla del día, menos
  las excepciones, menos lo tomado, menos lo que ya pasó si el día es hoy. Si
  alguien tomó el hueco mientras la hoja estaba abierta, el error vuelve como
  "ese horario ya está ocupado" y se vuelven a pedir los ocupados — la hoja no
  se cierra, porque el que está mirando no se equivocó en nada.

## Lo que NO está

- **Seña y pagos.** El turno se agenda y no cuesta nada. Si hay plata, es otra
  decisión con su propio ADR — y es donde el innegociable 3 más va a pesar.
- **Recordatorios.** Avisar "tenés turno mañana" necesita la infraestructura de
  notificaciones que todavía no existe (ver ADR-017).
- **Zonas horarias por artista.** Todo es una sola: Buenos Aires. El cálculo de
  huecos trabaja en minutos desde la medianoche local justamente para que
  agregar zonas después sea cambiar de dónde sale esa medianoche.
- **Duración por tipo de trabajo.** La duración la pone el artista al agendar.

## Consecuencias

- Cambiar el horario semanal **no toca ningún turno ya agendado**. Es lo
  correcto: lo acordado se acordó. El artista puede quedar con un turno fuera
  de su horario nuevo, y eso es un dato real, no una inconsistencia.
- Borrar un chat **no borra el turno** (`on delete set null`): las dos partes lo
  tienen anotado en su semana.
- La restricción de exclusión necesita `btree_gist`. Está en la migración.

## Referencias

- `supabase/migrations/20260820000300_availability.sql`
- `supabase/tests/49_appointments.sql` — el solapamiento y el aislamiento, como tests
- `packages/domain/src/scheduling/slots.ts` — el cálculo de huecos
- `apps/mobile/src/features/scheduling/` — las tres pantallas, el puente de
  zona horaria (`day.ts`) y sus tests
