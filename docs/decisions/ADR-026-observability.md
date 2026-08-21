# ADR-026 — Saber que algo se rompió, sin saber a quién

**Estado:** Aceptado (2026-08-21) · **Fecha:** 2026-08-21 · **Responsable:** security-reviewer

## Contexto

MESH no tiene forma de enterarse de que algo falla. Ni en el cliente ni en el
servidor.

No es una hipótesis. **El bug del `tool_choice` estuvo roto días**: la Edge
Function `read-reference` quedó apuntando a `classify_style` después de un
rename, la API de Anthropic devolvía 400 en cada llamada, y desde afuera se veía
exactamente esto:

```ts
if (!anthropicResponse.ok) {
  return jsonResponse({ error: 'no se pudo clasificar' }, 502)
}
```

"No se pudo clasificar". El mismo mensaje que si el modelo estuviera caído, o
que si se hubiera acabado la cuota. Se encontró leyendo el archivo por otro
motivo, no porque nadie se enterara.

Del lado del cliente es peor: un error de render deja la pantalla en blanco, sin
nada que tocar, y nadie se entera nunca.

## La restricción que manda

**No se puede agregar `@sentry/react-native`.** Es un módulo nativo, y
[ADR-009](ADR-009-almacenamiento-local.md) eligió `expo-sqlite/kv-store` por
sobre MMKV precisamente para no salir de Expo Go. Meter Sentry obliga a un dev
build y tira esa decisión a la basura de costado, sin una ADR que lo discuta.

Así que esta ADR construye **el aparato completo sin ninguna dependencia
nueva**, y deja el enchufe puesto. El día que se decida salir de Expo Go —que
es una decisión de producto legítima— conectar Sentry es un adaptador de veinte
líneas contra `ErrorSink`, y nada más de lo de abajo cambia.

## Decisión

### 1. Los reportes de error son otra cosa que analytics

Analytics mide **qué hace la persona**, y por eso está apagado hasta que alguien
lo enciende. Esto mide **si la app funciona**.

Por eso:

- **Interruptor propio**, separado del de datos de uso. Un solo interruptor
  habría significado que apagar la telemetría de producto nos deja además
  ciegos ante los cierres inesperados — lo último que le conviene a quien apagó
  el interruptor.
- **Encendido por default**, porque lo que viaja no dice nada de nadie.
- **La preferencia vive en el teléfono, no en `profiles`.** Dos motivos: se
  tiene que poder leer antes de que exista la sesión —los errores que más
  importan son los del arranque— y no es una preferencia sobre los datos de la
  persona, es sobre este dispositivo.

### 2. Un reporte no lleva el id de nadie

La interfaz `ErrorReport` es la lista completa de lo que sale del teléfono:
superficie, causa, clase del error, mensaje redactado, pila reducida, fecha,
sesión, plataforma, versión y si fue fatal.

**No hay `user_id`.** Un error no necesita saber de quién fue; para agrupar los
tres errores de una misma sesión rota alcanza con un `session_id` aleatorio por
arranque, que no persiste y no identifica un dispositivo.

Hay un test que enumera las claves de `ErrorReport` y se cae si alguien agrega
una. Ese es el momento de justificarla.

### 3. El mensaje se redacta, porque no lo escribimos nosotros

El `message` de un error lo arma Postgres con los valores de la fila:

```
duplicate key value violates unique constraint "profiles_email_key"
Key (email)=(alguien@ejemplo.com) already exists.
```

Útil para arreglar un bug y un correo ajeno viajando a un tercero, las dos cosas
a la vez.

`redact()` es **lista negra por forma, no por contenido**: reemplaza todo lo que
tenga forma de correo, uuid, teléfono, texto entre comillas, valor después de un
`=` o query de una URL — aunque en ese caso puntual fuera inofensivo. Un
reemplazo de más cuesta un poco de contexto al depurar; uno de menos cuesta un
dato de una persona.

Sus tests usan mensajes de error **reales que MESH puede producir**, no ejemplos
inventados. Si alguno se cae, hay un dato viajando.

### 4. La superficie se pasa a mano

`reportError(error, { surface: 'chat' })`. Derivarla de la ruta activa habría
sido más cómodo y habría metido en el reporte el slug de un artista o el id de
una conversación.

En el `QueryClient` la superficie sale del **primer tramo de la `queryKey`**,
que es siempre un nombre nuestro y constante; los tramos siguientes se descartan
porque ahí viven los ids. Está filtrado por forma, no por lista.

### 5. Un solo lugar atrapa todo lo asincrónico

`queryCache.onError` y `mutationCache.onError`. La alternativa era un `onError`
en cada `useQuery` de la app: media docena se olvidarían el primer día, y los
que faltaran serían justo los que nadie mira.

### 6. Del lado del servidor, una línea de JSON por cosa que pasa

`withLogging()` envuelve cada Edge Function y registra duración, estado y —lo
que faltaba— **las excepciones que antes se perdían enteras**. Y en cada punto
donde se tragaba un error, una línea con el código del upstream.

**Nunca el cuerpo.** Ni el mensaje que alguien escribió, ni la foto, ni el
resumen del asistente. `logLine` tiene una segunda barrera: un campo que no sea
texto, número o booleano no sale — porque ahí es donde viajaría un cuerpo.

Tampoco el id de usuario. Para correlacionar alcanza el `request_id`, que muere
con la petición.

## Lo que NO está

- **Un proveedor.** No hay Sentry, no hay Datadog, no hay nada. `httpSink()`
  acepta cualquier cosa que reciba un POST con JSON, y **devuelve `null` si no
  hay URL configurada** — con `null`, el reportador ni siquiera encola. Guardar
  reportes en el teléfono de alguien para un servidor que no existe es ocupar
  espacio ajeno por las dudas.
- **Alertas.** Que alguien se entere a las tres de la mañana es configuración
  del destino, no código de la app.
- **Métricas de performance.** Cuánto tarda una pantalla en pintar es otra cosa
  y tiene su propio presupuesto en `docs/product/performance.md`.
- **Sesión grabada, mapa de calor, repetición de la sesión.** Nunca. Es
  vigilancia con otro nombre.
- **Breadcrumbs.** La tentación obvia es guardar los últimos N eventos antes del
  error. Cada uno de esos eventos es algo que la persona hizo, y juntos son
  exactamente el registro de comportamiento que analytics tiene apagado por
  default. Si alguna vez se agregan, van con su propia decisión.

## Consecuencias

- **Sin URL configurada, esto no manda nada** — y aun así vale: el
  `ErrorBoundary` evita la pantalla en blanco desde hoy, y los logs del servidor
  ya se ven en la consola de Supabase sin configurar nada.
- Los reportes son un **procesamiento por un tercero** en cuanto haya destino, y
  `docs/legal/privacy.md` lo declara con esa palabra.
- El `ErrorBoundary` es el único componente de clase de la app.
  `componentDidCatch` no tiene equivalente en hooks.

## Cómo se conecta Sentry, el día que se decida

1. Una ADR que acepte salir de Expo Go y su costo.
2. `npx expo install @sentry/react-native` y un dev build.
3. Un archivo nuevo: `sentrySink(): ErrorSink` que llame a `captureEvent` con
   el `ErrorReport` ya redactado.
4. Cambiar `sink: httpSink()` por `sink: sentrySink() ?? httpSink()`.

Nada de `redact.ts`, `report.ts`, `ErrorBoundary.tsx` ni las Edge Functions
cambia. Es el punto de toda esta forma.

## Dónde vive cada parte

| Qué | Dónde |
|---|---|
| La garantía de que no viaja nada personal | `apps/mobile/src/observability/redact.ts` |
| Qué sale del teléfono, exactamente | `apps/mobile/src/observability/report.ts` |
| A dónde va | `apps/mobile/src/observability/sink.ts` |
| La red contra la pantalla en blanco | `apps/mobile/src/observability/ErrorBoundary.tsx` |
| El interruptor | `apps/mobile/src/observability/ErrorReportsToggle.tsx` |
| Los logs del servidor | `supabase/functions/_shared/log.ts` |

## Referencias

- [ADR-009](ADR-009-almacenamiento-local.md) — Expo Go, que es lo que esto no rompe
- [ADR-011](ADR-011-photo-classification.md) · [ADR-021](ADR-021-brief-assistant.md) — las funciones que ahora dejan rastro
- `docs/legal/privacy.md`
