# MESH — Arquitectura del sistema

**Estado:** Propuesto · **Responsable:** product-architect

---

## 1. Forma del sistema

```
┌───────────────────────────────────────────────┐
│  apps/mobile  — Expo / React Native / TS      │
│                                               │
│  screens (expo-router)                        │
│  design-system  (tokens + componentes)        │
│  features/      discovery · taste · match ·   │
│                 profile · project · contact   │
│  data/          TanStack Query + supabase-js  │
│  analytics/     sink de eventos con buffer    │
└──────────────┬────────────────────────────────┘
               │ anon key + JWT de usuario, HTTPS
               ▼
┌───────────────────────────────────────────────┐
│  Supabase                                     │
│   Auth   — anónima + email/contraseña         │
│   Postgres — esquema + RLS + RPCs             │
│   Storage — portfolio (público) ·             │
│             references (privado)              │
│   Edge Functions — solo donde haga falta un   │
│             secreto o una lectura cruzada     │
└───────────────────────────────────────────────┘
               ▲
               │ service-role key, solo local
┌──────────────┴────────────────────────────────┐
│  tools/seed — CLI de contenido, nunca en el   │
│               bundle                          │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│  packages/domain — TypeScript puro            │
│  taxonomía · tipos · esquemas Zod ·           │
│  motor de gusto · motor de matching           │
│  consumido por: mobile, seed, tests           │
└───────────────────────────────────────────────┘
```

Sin servidor propio. Supabase es el backend; Postgres es la capa de
autorización.

## 2. Estructura del repositorio, y qué se descartó

```
MESH/
├── apps/mobile/            App Expo. El design system vive en src/design-system.
├── packages/domain/        TS puro. Sin React, sin imports de react-native. Nunca.
├── tools/seed/             CLI con service role: validar → subir media → upsert.
├── supabase/
│   ├── migrations/         SQL numerado. Esquema, políticas, RPCs, índices.
│   ├── functions/          Edge functions (pocas).
│   └── seed.sql            Solo datos de referencia: categorías, estilos, ubicaciones.
├── content/artists/        Contenido curado + registros de consentimiento.
├── docs/
└── .claude/
```

Workspaces de npm, tres workspaces. **`packages/domain` es el único paquete
compartido, y se gana su lugar**: los motores de gusto y matching, la taxonomía
y los esquemas de contenido los usan la app, el seeder y la suite de tests.
Duplicarlos garantizaría que se separen.

**Descartado — `packages/design-system`.** Un solo consumidor, y está acoplado a
React Native. Extraerlo compra complejidad de build y un límite de imports a
cambio de la apariencia de sofisticación. Vive en
`apps/mobile/src/design-system/` con una regla de lint que impide que las
pantallas definan valores de estilo crudos, que es el objetivo real.

**Descartado — `packages/config`.** El tsconfig y el eslint compartidos son dos
archivos. `tsconfig.base.json` y `eslint.config.mjs` en la raíz, extendidos por
cada workspace.

**Descartado — un orquestador de monorepo (Turbo/Nx).** Tres workspaces y un
desarrollador. Los scripts de npm alcanzan y se leen mejor.

Ver [ADR-001](../decisions/ADR-001-stack-and-repo-structure.md).

## 3. Capas dentro de la app

```
screens/            Archivos de ruta de expo-router. Solo composición — sin lógica, sin queries.
features/<nombre>/
    components/     UI de la feature, construida con primitivos del design system
    hooks/          useDiscoveryFeed, useTasteProfile, useMatches …
    queries.ts      el único lugar donde se llama a supabase-js para esta feature
design-system/      tokens, primitivos, movimiento, hápticos
data/               cliente supabase, query client, cola offline, mapeo de errores
analytics/          track()
i18n/               es-AR de origen, en de destino
```

Reglas impuestas por lint:

- `screens/` no puede importar `@supabase/supabase-js`.
- `packages/domain` no puede importar `react`, `react-native` ni `@supabase/*`.
- Nada fuera de `design-system/` puede contener un color hex crudo, un valor de
  espaciado en px o una duración de animación.

## 4. Flujo de datos

**Camino de lectura.** Pantalla → hook de feature → TanStack Query →
`queries.ts` → supabase-js (o un RPC) → Postgres, filtrado por RLS. El cliente
nunca envía una consulta del tipo "dame los datos del usuario X" — envía "dame
mis datos" y la base decide qué significa eso.

**Feed de descubrimiento.** Un RPC de Postgres,
`get_discovery_feed(p_category, p_limit, p_cursor)`, `SECURITY INVOKER`, que usa
`auth.uid()`. Excluye las piezas ya vistas, aplica la mezcla determinística por
usuario y la restricción de diversidad (ver
[`matching.md`](../product/matching.md) §7), y devuelve las piezas con su media y
sus etiquetas de estilo en un solo round trip. Hacerlo del lado del cliente
significaría bajar el catálogo entero.

**Escritura de interacción.** Actualización local optimista → háptico del design
system → upsert encolado. Las interacciones son idempotentes sobre
`(user_id, portfolio_item_id)`, así que reintentar tras una conexión caída es
seguro. Las interacciones offline se encolan en MMKV y se descargan al
reconectar.

**Cálculo del gusto.** Corre **del lado del cliente**, en `packages/domain`, a
partir de las interacciones del propio usuario, y el vector resultante se
persiste en `taste_profiles` para continuidad entre dispositivos. Es una función
pura de filas que la persona ya posee, así que no hay ningún límite de confianza
que defender — y calcularlo localmente hace que la pantalla de gusto se
actualice al instante, sin round trip.

**Matching.** También en `packages/domain`, sobre el vector de gusto del usuario
más el catálogo de profesionales (que es de lectura pública). Con ≤ 50
profesionales esto son microsegundos de trabajo y no necesita servidor. Los
resultados se cachean en `matches` para analytics y para que quien vuelve vea
una lista estable. **Esto cambia a escala**: cuando el catálogo sea demasiado
grande para mandárselo al cliente, el matching se muda a una edge function o a
una función de Postgres con el mismo núcleo puro. El motor está escrito para que
esa mudanza sea un cambio de hosting, no una reescritura.

**Contacto.** Enteramente del lado del cliente: se arma el mensaje con el estado
local, se le muestra a la persona para que lo edite, se abre la URL de
WhatsApp/Instagram y se dispara `contact_clicked`.

## 5. Manejo de estado

| Tipo | Herramienta | Por qué |
|---|---|---|
| Estado de servidor | TanStack Query | Caché, reintentos, invalidación, consciente de offline; elimina la mayor parte del boilerplate de carga y error |
| Estado de UI efímero (posición del mazo, gesto) | Estado local + shared values de Reanimated | Los gestos tienen que correr en el hilo de UI; nada que toque un swipe pasa por estado de React |
| Estado de sesión entre pantallas (categoría actual, filtros) | Zustand, un store chico | Más simple que Context para un puñado de valores |
| Persistencia (caché de gusto, cola de interacciones, buffer de analytics, ajustes) | MMKV | Síncrono, suficientemente rápido para leerlo durante el arranque |

Sin Redux. Sin store global de datos de servidor — para eso está el caché de
queries.

## 6. Arquitectura de performance

- **Arranque:** ningún trabajo de red bloqueante antes del primer frame. Las
  tipografías y la pantalla de intro viajan en el bundle; el feed carga detrás
  de un skeleton.
- **Imágenes:** `expo-image` con caché en disco, placeholders blurhash desde
  `media_assets`, `recyclingKey` en las tarjetas del mazo, `contentFit`
  explícito. Tres tamaños derivados para que el mazo nunca baje una imagen de
  1600px.
- **Prefetch:** las 3 imágenes siguientes del mazo se precargan en `md`; el hero
  del primer match en `lg` cuando se renderiza la lista.
- **Listas:** las grillas de portfolio usan FlashList con un `estimatedItemSize`
  estable.
- **Paginación:** por cursor en todos lados; nada de `OFFSET`.
- **Renders:** el mazo mantiene como mucho 3 tarjetas montadas. El contenido de
  tarjeta se memoiza por `portfolio_item_id`. El estado del gesto nunca cruza a
  React.
- **Queries:** el feed, el perfil y la lista de matches son un round trip cada
  uno. Cualquier pantalla que necesite tres queries recibe un RPC en su lugar.

Presupuestos (medidos en un Android de gama media, build de release): arranque
en frío hasta primera obra visible < 2,5s en 4G; gesto del mazo a 60fps
sostenidos; abrir perfil hasta hero pintado < 800ms con caché caliente.

## 7. Comportamiento offline y ante fallas

Toda superficie que depende de la red implementa **carga / vacío / error /
reintento**, y descubrimiento además implementa **degradado**: si el feed no
puede reponerse, las tarjetas ya cargadas siguen siendo deslizables y las
interacciones se encolan localmente. Los errores se mapean a un conjunto chico
de causas visibles (offline, servidor, no encontrado, permiso) en
`data/errors.ts`; los mensajes crudos de Postgres o Supabase nunca se le muestran
a nadie ni se escriben en analytics.

## 8. Entornos

| | Local | Preview | Producción |
|---|---|---|---|
| Supabase | `supabase start` (Docker) | Proyecto hosteado (staging) | Proyecto hosteado |
| Contenido | Fixtures permitidos | Fixtures permitidos | Fixtures rechazados por el seeder |
| Claves de cliente | Anon key local | Anon key de staging | Anon key de producción |
| Service role | `.env.local`, en gitignore | Secreto de CI | Solo la máquina del operador |

La configuración de cliente es `EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY` — ambas publicables por diseño. Nada sin el
prefijo `EXPO_PUBLIC_` puede leerse desde el código del cliente, y un test
verifica que el bundle no contenga el string `service_role`.

## 9. Extensión a una segunda categoría

Agregar *fotografía* debería requerir:

1. Filas en `categories` y `styles`.
2. Archivos de contenido para los nuevos profesionales.
3. Nombres visibles localizados.
4. Posiblemente un umbral de gusto específico por categoría.

**No** debería requerir migración de esquema, ni cambio en el motor de matching,
ni pantallas nuevas. Este es el test de aceptación arquitectónico de V1: si
agregar una categoría requiere código, el núcleo filtró conocimiento de
categoría y eso es un defecto.

## 10. Límites de escala conocidos (aceptados para V1)

| Límite | Empieza a doler en | Respuesta |
|---|---|---|
| Mandar el catálogo entero al cliente para hacer matching | ~200 profesionales | Mover el matching a una edge function; el motor ya es puro |
| Calcular el gusto en el cliente desde todas las interacciones | ~2.000 interacciones por usuario | Acumulación incremental, o calcular en Postgres |
| Mezcla determinística sobre el conjunto completo de piezas | ~10.000 piezas | Tabla de feed materializada, o keyset sobre un ranking precalculado |
| Sin CDN delante de Storage | Tráfico real | Transformación de imágenes de Supabase / CDN |

Estos están escritos para que sean decisiones y no sorpresas.
