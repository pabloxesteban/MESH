# MESH — Métricas y analytics

**Estado:** Propuesto · **Responsable:** product-architect

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

| Etapa | Definición | Señal objetivo |
|---|---|---|
| **Arranque** | `app_opened` en una instalación nueva | — |
| **Entrada a descubrimiento** | Primer `artwork_viewed` | ≥ 90% de los arranques — menos que eso significa que la pantalla de intro estorba |
| **Completitud de gusto** | `taste_profile_generated` (se alcanzó el umbral) | ≥ 40% de usuarios nuevos |
| **Activación** | Ve ≥ 1 match con razones (`match_viewed`) | ≥ 35% de usuarios nuevos |
| **Interacción con perfil** | `professional_profile_viewed` | ≥ 60% de los activados |
| **Conversión a contacto** | `contact_clicked` | ≥ 15% de los activados — *métrica primaria de V1* |
| **Conversión de proyecto** | `project_completed` → `contact_clicked` | se mide, sin objetivo todavía |
| **Retención** | Retorno D1 / D7 / D30 con alguna interacción decisiva | se mide, sin objetivo todavía |

Los objetivos son hipótesis para una cohorte de validación de decenas de
personas, no benchmarks. Existen para que notemos cuándo la realidad no está de
acuerdo.

## 3. La métrica que decide V1

**Conversión a contacto**, calificada por la devolución de los artistas.

Un `contact_clicked` que produce un mensaje que el artista califica como "un
buen contacto" es todo el producto funcionando. Vamos a preguntarles
directamente a los 8–15 artistas y a registrarlo cualitativamente — con menos de
~50 contactos, una conversación con cada artista es mejor evidencia que
cualquier dashboard.

Contra-métrica: **contactos por artista por semana.** Si MESH canaliza a todo el
mundo hacia dos artistas, el producto está fallando del lado de la oferta aunque
su embudo se vea bien.

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
| `taste_profile_generated` | `style_count`, `interaction_count`, `taste_version` | Sin nombres de estilos — ver §5 |
| `taste_profile_viewed` | `source` | |
| `taste_profile_reset` | `interaction_count` | |
| `match_viewed` | `professional_id`, `band`, `rank`, `matching_version` | |
| `match_list_empty` | `reason` (`not_ready`\|`no_candidates`) | Sigue el camino del vacío honesto |
| `professional_profile_viewed` | `professional_id`, `source` (`match`\|`discover`\|`search`\|`project`) | |
| `contact_clicked` | `professional_id`, `channel` (`whatsapp`\|`instagram`), `has_project` | **Métrica primaria** |
| `contact_message_edited` | `professional_id` | Señala que el mensaje precargado está mal |
| `project_started` | — | |
| `project_completed` | `has_budget`, `has_references`, `style_count` | Solo booleanos y conteos |
| `project_abandoned` | `last_step` | |
| `search_performed` | `filter_count` | Nunca el texto de búsqueda |
| `error_shown` | `surface`, `error_code` | Nunca mensajes ni payloads |

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
