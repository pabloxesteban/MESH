# MESH — Métricas y analytics

**Estado:** Propuesto · **Responsable:** product-architect · **Última
actualización:** 2026-08-21

> **El embudo cambió el 2026-08-21.** MESH mide ahora el camino de un pedido, no
> el de un gusto aprendido. Ver [ADR-031](../decisions/ADR-031-request-first.md)
> y [por-que-mesh.md](por-que-mesh.md). Lo que había medía dos eventos que salen
> de motores apagados desde el 2026-08-19, así que el embudo **tenía el medio
> borrado**: no podía mostrar activación aunque la hubiera.

---

## 1. Qué medimos y por qué

MESH mide si la gente **encuentra a alguien a quien valga la pena contactar**.
No mide, ni grafica, ni optimiza la atención.

Explícitamente **no** se usan como métricas de éxito: total de swipes, duración
de sesión, tiempo en la app, tarjetas por sesión, rachas diarias, tasa de
apertura de notificaciones. Pueden existir como contadores de diagnóstico (por
ejemplo para dimensionar una página) pero nunca aparecen en un objetivo, en el
encabezado de un dashboard ni en una decisión.

## 2. Embudo

La tesis: **decir lo que querés tatuarte cuesta una sola vez, y la respuesta
incluye un precio.** El embudo la sigue paso por paso.

| Etapa | Definición | Evento | Señal objetivo |
|---|---|---|---|
| **Arranque** | Instalación nueva | `app_opened` | — |
| **Empieza un pedido** | Toca "tengo una foto" o "lo cuento con palabras" | `assistant_started` · `project_started` | ≥ 35% de los arranques |
| **Lo termina** | El pedido existe | `project_completed` | ≥ 60% de los que empezaron |
| **Lo abre a los tatuadores** | Contestó que sí a que lo vean | `search_opened` con `is_open: true` | ≥ 70% de los publicados |
| **Le contesta alguien** | Al menos una propuesta con precio | **falta** — ver abajo | ≥ 50% de los abiertos — *métrica primaria de V1* |
| **Mira quién le contestó** | Abre el perfil desde la propuesta | `professional_profile_viewed` | ≥ 80% de los que recibieron |
| **Le escribe** | Abre el chat | `contact_clicked` | ≥ 40% de los que recibieron |
| **Retención** | Vuelve a mirar su pedido | `app_opened` con pedido abierto | se mide, sin objetivo todavía |

Los objetivos son hipótesis para una cohorte de decenas de personas, no
benchmarks. Existen para que notemos cuándo la realidad no está de acuerdo.

**Dos cosas que este embudo dice y conviene leer despacio.**

La etapa que decide es *"le contesta alguien"*, y **no depende de quien busca**:
depende de que del otro lado haya artistas que contesten. Si esa etapa se cae,
el problema es de oferta y ninguna mejora de la app lo arregla. Ver
[por-que-mesh.md §6](por-que-mesh.md), sobre qué lado se llena primero.

Y *"lo abre a los tatuadores"* tiene un objetivo alto a propósito. Desde
ADR-031 la pregunta es obligatoria y no tiene default, así que ese porcentaje
mide algo limpio: **cuánta gente, después de escribir su idea, quiere que le
llegue a alguien.** Si es bajo, la tesis está en problemas — significaría que la
gente arma pedidos para sí misma y no para mandarlos.

### Lo que falta medir

`proposal_received`, del lado de quien busca, cuando llega la primera propuesta
a un pedido suyo. **Hoy no existe.** El interés se registra en el dispositivo
del artista (`search_interested`, con `project_id`) y no hay evento que marque
la llegada del otro lado, así que la etapa que decide V1 no se puede calcular
todavía. Es lo primero que hay que agregar al catálogo de §4, y hasta que
exista se mide a mano contra `project_interests`.

### Lo que se dejó de medir, y por qué

| Etapa vieja | Evento | Qué pasó |
|---|---|---|
| Completitud de gusto | `taste_profile_generated` | El motor de gusto se desenchufó de la app el 2026-08-19 ([D-010](../design/MESH-DESIGN-DECISIONS.md)). El evento existe en el catálogo y **no lo dispara ninguna pantalla**. |
| Activación por match | `match_viewed` | Ídem: no hay pantalla de encajes. |
| Entrada a descubrimiento | `artwork_viewed` | Sigue disparándose desde Explorar y sigue siendo útil como diagnóstico, pero dejó de ser una etapa: mirar obra ya no es el camino hacia nada. |

Los tres eventos **se dejan en el catálogo**, sin borrar. Los motores siguen
versionados y con sus tests en `packages/domain`; si alguna vez se vuelven a
enchufar, el evento tiene que ser el mismo o la serie histórica se parte.

## 3. La métrica que decide V1

**Un pedido publicado que recibe al menos una propuesta con precio**, calificada
por las dos partes.

Es todo el producto funcionando en una sola medición: alguien dijo lo que quería
una vez, le llegó a quien lo puede hacer, y volvió con un número. Ninguna de las
tres cosas la puede dar un feed.

Se califica preguntando, no midiendo. A quien buscó: *¿te sirvió el precio, o
tuviste que escribirle igual para saber?* Al artista: *¿pudiste dar un precio con
lo que te llegó, o te faltaba algo?* Con menos de ~50 pedidos, una conversación
con cada artista es mejor evidencia que cualquier dashboard.

**Contra-métrica: propuestas por artista por semana.** Si MESH le manda todos
los pedidos a dos artistas, el producto está fallando del lado de la oferta
aunque el embudo se vea bien. Y hay una segunda, más incómoda: **pedidos
abiertos sin ninguna propuesta a los siete días.** Ese número es el costo real
de la tesis, y si crece, lo que hay que arreglar no es la app.

## 4. Catálogo de eventos

Todos los eventos llevan: `event_name`, `occurred_at` (cliente, UTC),
`session_id` (aleatorio por sesión de app), `app_version`, `platform` y
`user_id` (puede ser un id de auth anónima). Nada más de forma implícita.

| Evento | Propiedades | Notas |
|---|---|---|
| `app_opened` | `is_first_open` | |
| `onboarding_started` | — | |
| `onboarding_completed` | `interaction_count` | Se dispara al alcanzar el umbral |
| `artwork_viewed` | `portfolio_item_id`, `position` | Sin tiempo de permanencia |
| `artwork_liked` | `portfolio_item_id`, `via` (`gesture`\|`button`) | `via` nos dice si el camino accesible efectivamente se usa |
| `artwork_passed` | `portfolio_item_id`, `via` | |
| `artwork_saved` | `portfolio_item_id`, `via` | |
| `artwork_undone` | `portfolio_item_id`, `previous_verdict` | Tasa alta ⇒ el gesto se dispara demasiado fácil |
| ~~`taste_profile_generated`~~ | `style_count`, `interaction_count`, `taste_version` | **No lo dispara ninguna pantalla** desde D-010. Se deja declarado. |
| ~~`taste_profile_viewed`~~ | `source` | Ídem |
| ~~`taste_profile_reset`~~ | `interaction_count` | Ídem |
| ~~`match_viewed`~~ | `professional_id`, `band`, `rank`, `matching_version` | Ídem |
| ~~`match_list_empty`~~ | `reason` (`not_ready`\|`no_candidates`) | Ídem |
| `professional_profile_viewed` | `professional_id`, `source` (`match`\|`discover`\|`search`\|`project`) | |
| `contact_clicked` | `professional_id`, `channel` (`whatsapp`\|`instagram`), `has_project` | Fue la métrica primaria hasta el 2026-08-21 |
| `contact_message_edited` | `professional_id` | Señala que el mensaje precargado está mal |
| `project_started` | — | |
| `project_completed` | `has_budget`, `has_references`, `style_count` | Solo booleanos y conteos |
| `project_abandoned` | `last_step` | |
| `search_performed` | `filter_count` | Nunca el texto de búsqueda |
| `search_opened` | `is_open` | Al publicar un pedido. Desde ADR-031 no tiene default, así que `is_open` mide una decisión y no una omisión |
| `assistant_started` | — | Abre el hilo del asistente |
| `assistant_brief_closed` | `turn_count`, `has_style`, `trait_count` | El asistente llegó a un pedido. Sin el texto, ver §5 |
| `assistant_thread_discarded` | `turn_count` | El hilo se tiró sin llegar a un pedido |
| `search_interested` | `project_id`, `via` | **Del lado del artista.** Levantó la mano ante un pedido |
| `search_passed` | `project_id`, `via` | Del lado del artista. Nunca le llega a quien pidió |
| `search_undone` | `project_id`, `previous_verdict` | Del lado del artista |
| `error_shown` | `surface`, `error_code` | Nunca mensajes ni payloads |

**Falta uno, y es el que decide V1**: `proposal_received`, del lado de quien
pidió, cuando llega la primera propuesta. Ver §2.

## 5. Reglas de privacidad

1. **Sin SDK de analytics de terceros en V1.** Los eventos se escriben en
   nuestra propia tabla `analytics_events` en Supabase. Sin ad IDs, sin
   IDFA/AAID, sin fingerprinting de dispositivo, sin session replay, sin
   tracking entre apps.
2. **Nunca texto libre en las propiedades.** Ni descripciones de proyecto, ni
   búsquedas, ni mensajes, ni strings de error. Solo conteos, enums, booleanos e
   IDs.
3. **Sin nombres de estilos en los eventos de gusto.** Un vector de gusto es un
   proxy razonable del gusto estético personal y, en algunos casos, de la
   identidad. El vector vive en `taste_profiles`, donde la persona es dueña bajo
   RLS; no se copia a un flujo de analytics. La popularidad agregada de estilos
   se consulta desde `interactions` cuando hace falta.
4. **Sin ubicación más allá de la ciudad que la persona eligió.** Sin GPS en V1.
5. **Los clientes pueden insertar sus propios eventos y no leer ninguno.** RLS
   le da a `authenticated` INSERT con `user_id = auth.uid()`, y ningún SELECT.
6. **Borrar la cuenta borra sus eventos.** `user_id` es `ON DELETE CASCADE`.
7. **Un interruptor visible** en Ajustes desactiva por completo la recolección,
   con valor inicial encendido y una explicación en lenguaje claro. Si está
   apagado, no se encola nada y no se envía nada.

## 6. Notas de implementación

- Una sola función `track()` en `apps/mobile/src/analytics/`. Nada más puede
  escribir eventos. La unión de nombres de eventos es un tipo de TypeScript, así
  que un evento desconocido no compila.
- Los eventos se bufferean en MMKV y se envían en lotes (≤ 20, o al pasar a
  segundo plano) para que analytics nunca bloquee un gesto ni una transición.
- Las fallas se descartan en silencio después de un reintento. Analytics nunca
  debe mostrarle un error al usuario ni entrar en bucle de reintentos con mala
  red.
- Un sink de consola solo para desarrollo imprime los eventos, para poder
  verificar el embudo a mano.
- Agregar un evento requiere agregar una fila a la tabla de §4 en el mismo
  commit.
