# MESH — Modelo de seguridad

**Estado:** Propuesto · **Responsable:** security-reviewer · **Revisa:** backend-engineer

---

## 1. Límites de confianza

```
No confiable ────────────────────────────────────────────
  La app móvil, su bundle, su tráfico de red, y todo
  valor que envía. La anon key es pública. La persona
  puede leer el bundle, interceptar el tráfico y llamar
  a la API directamente.
──────────────────────────────────────────────────────────
Confiable
  PostgreSQL + RLS. Este es el único límite de
  autorización que importa. Si una regla no está
  expresada en una política o en una restricción, no
  está impuesta.
──────────────────────────────────────────────────────────
Privilegiado
  Service-role key. Solo máquina del operador y CI.
  Nunca en la app, nunca en una variable con prefijo
  EXPO_PUBLIC_, nunca en un log.
```

**Supuesto central: el cliente es hostil.** La validación del lado del cliente
existe solo para que la UI sea agradable. Toda regla que importa es una
política, una restricción, o un chequeo dentro de una función `SECURITY
DEFINER`.

## 2. Autenticación

- Supabase Auth. MESH nunca guarda, hashea, compara ni transporta una
  contraseña por su cuenta.
- **Ingreso anónimo en el primer arranque** para que se pueda explorar sin muro,
  y para que no exista ningún camino de lectura sin autenticar en el esquema.
  Los usuarios anónimos tienen un `auth.uid()` real y están sujetos a las mismas
  políticas.
- **Upgrade a cuenta durable** vía email + contraseña (o magic link) que vincula
  la misma fila de `auth.users` — gusto, guardados y proyectos se conservan sin
  ninguna migración de datos.
- Los tokens de sesión se guardan en `expo-secure-store` (Keychain / Android
  Keystore), nunca en AsyncStorage ni en MMKV. El refresh lo maneja supabase-js.
- La recuperación de contraseña usa el flujo de Supabase y vuelve a
  `mesh://auth/callback`.
- Cerrar sesión limpia la sesión, el caché de queries y todos los namespaces de
  MMKV con datos de usuario — caché de gusto, cola de interacciones, buffer de
  analytics.

**Contrapartidas de la auth anónima, aceptadas con conocimiento:** abarata la
creación de cuentas para un atacante, así que los ingresos anónimos están
limitados por tasa en el panel de Supabase, los usuarios anónimos reciben el
mismo tratamiento de RLS que cualquiera, y se imponen límites de filas por
usuario en Postgres (§6). La alternativa —un muro de registro antes de cualquier
valor— cuesta más en usuarios reales de lo que ahorra en abuso a esta escala.

## 3. Autorización: RLS en todas las tablas

**Reglas que valen sin excepción:**

1. `alter table … enable row level security;` **y**
   `alter table … force row level security;` en toda tabla de `public`.
   `FORCE` importa: sin eso, el dueño de la tabla saltea sus propias políticas.
2. `revoke all on <tabla> from anon, authenticated;` y después grants explícitos
   solo de los verbos que esa tabla necesita.
3. Toda política nombra su comando (`for select` / `for insert` / …). Nada de
   políticas `for all` — esconden qué verbo está protegiendo una cláusula
   `using`.
4. Toda política `for insert` tiene un `with check`. Una política sin eso es un
   agujero.
5. Ninguna política referencia un id de usuario provisto por el cliente. La
   propiedad siempre es `auth.uid()`.

### Mapa de políticas

| Tabla | SELECT anon/auth | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | fila propia | solo por trigger | fila propia | fila propia |
| `categories`, `styles`, `locations` | todas las filas activas | ✗ | ✗ | ✗ |
| `professionals` | `is_published` | ✗ | ✗ | ✗ |
| `professional_styles` | padre publicado | ✗ | ✗ | ✗ |
| `portfolio_items` | padre publicado | ✗ | ✗ | ✗ |
| `portfolio_item_styles` | padre publicado | ✗ | ✗ | ✗ |
| `media_assets` | subidas propias **o** referenciada por un profesional publicado | subidas propias, a `references`/`avatars` | ✗ | subidas propias |
| `interactions` | propias | propias | propias | propias |
| `taste_profiles` | propio | propio | propio | propio |
| `projects` | propios | propios | propios | propios |
| `project_styles`, `project_references` | proyecto padre propio | padre propio | padre propio | padre propio |
| `matches` | propios | propios | propios | propios |
| `analytics_events` | ✗ | propios (`user_id = auth.uid()`) | ✗ | ✗ |
| `audit_events` | ✗ | ✗ | ✗ | ✗ (sin políticas — solo service role) |

**Todo el catálogo es de solo lectura para el cliente**, y no por descuido: en V1
no hay flujo de reclamo de perfil, así que las tablas de oferta no tienen ningún
grant de escritura para `authenticated` y por lo tanto tampoco políticas de
escritura. `professionals.owner_user_id` existe igual, para que agregar el
reclamo más adelante sea una política nueva y no una migración de datos. Escribir
una política de update para un flujo que no existe sería mantener una superficie
de ataque a cambio de nada.

El SELECT de `media_assets` es el caso sutil: un `using (true)` ingenuo filtraría
las rutas de storage de las imágenes de referencia privadas de otras personas —
la ruta *es* la llave para pedir el objeto. La política tiene dos ramas: la
propia (`owner_user_id = auth.uid()`), definida junto con la tabla, y la del
catálogo, un `EXISTS` que exige que la fila cuelgue de una pieza, un avatar o un
hero de un profesional **publicado**. Esa segunda rama vive en la migración de
portfolio, que es la primera donde existe la tabla que define qué está
publicado.

`media_assets` tampoco tiene UPDATE para nadie: una fila describe un archivo
inmutable. Si el `path` pudiera cambiar, un `checksum` registrado dejaría de
significar algo.

`profiles` no tiene política de INSERT. La fila la crea un trigger sobre
`auth.users`; un cliente que pudiera insertar perfiles podría crear filas con
ids ajenos.

### La garantía, impuesta por test

`supabase/tests/00_rls_guarantee.sql` recorre el catálogo de Postgres —no una
lista de tablas escrita a mano— y falla si:

1. alguna tabla de `public` no tiene RLS habilitado,
2. alguna no lo tiene **forzado**,
3. alguna política usa `for all`,
4. alguna política de insert no tiene `with check`,
5. alguna de update no protege `using` **y** `with check`,
6. alguna tabla sin políticas tiene igual grants de cliente,
7. `anon` tiene algún privilegio sobre alguna tabla de `public`,
8. alguna función `security definer` no fija su `search_path`.

**No se puede agregar una tabla sin políticas.** Corre en CI en cada migración,
y como no conoce ninguna tabla por nombre, una tabla nueva queda cubierta sin
que nadie se acuerde de agregarla.

El punto 6 dice "sin políticas **o** sin grants" y no "≥1 política" por un caso
real: `audit_events` a propósito no tiene ninguna política. Una tabla que ningún
rol de cliente puede tocar es inalcanzable tenga las políticas que tenga, y
escribirle políticas de mentira para satisfacer un test las volvería la
documentación equivocada de lo que hace.

El aislamiento entre usuarios se verifica aparte, en
`supabase/tests/20_cross_user.sql`, ejecutando con `set local role authenticated`
más un claim `sub` — que es exactamente lo que PostgREST hace con un JWT. Correr
esos tests como `postgres`, que tiene BYPASSRLS, los haría pasar siempre: es la
forma más común de tener una suite de RLS que no prueba nada.

## 4. Storage

| Bucket | Visibilidad | Escritura | Convención de rutas |
|---|---|---|---|
| `portfolio` | lectura pública | solo service role | `portfolio/{professional_slug}/{item_id}/{size}.webp` |
| `references` | privado | solo dueño | `references/{user_id}/{uuid}.webp` |
| `avatars` | lectura pública | solo dueño | `avatars/{user_id}/{uuid}.webp` |

Las políticas de storage de los buckets escribibles por el dueño verifican
`(storage.foldername(name))[1] = auth.uid()::text` — el primer segmento de la
ruta es el id de quien llama, así que nadie puede escribir en la carpeta de otra
persona ni fabricando la ruta.

Los objetos privados se sirven vía URLs firmadas de vida corta (≤ 1 hora)
generadas a demanda. Las URLs firmadas nunca se persisten, nunca se loguean y
nunca van en un deep link.

## 5. Validación de subidas

Los chequeos del lado del cliente son UX. Lo que realmente impone es:

- Lista blanca de MIME a nivel bucket: `image/jpeg`, `image/png`, `image/webp`,
  `image/heic`. Nada de SVG — un SVG es un contenedor de scripts.
- Tope de tamaño a nivel bucket: 12 MB.
- Los nombres de archivo siempre son UUIDs generados por el servidor. Los
  nombres provistos por el usuario nunca se usan en una ruta — sin traversal,
  sin bytes nulos, sin trucos de homoglifos unicode.
- El content-type se setea explícitamente en la subida, nunca se infiere de la
  extensión.
- Las imágenes se recodifican durante el pipeline de seed, lo que elimina el
  EXIF (incluido el GPS) como efecto secundario. Las referencias que sube el
  usuario se recodifican y limpian del lado del cliente antes de subirse, y un
  test lo verifica — una foto de referencia sacada en casa no debería llevar las
  coordenadas de esa persona.
- Las subidas cuentan contra una cuota por usuario (§6).

## 6. Prevención de abuso

| Vector | Control |
|---|---|
| Creación masiva de cuentas anónimas | Límite de tasa de Supabase en el ingreso anónimo; límites por IP en el gateway |
| Inundación de interacciones | El UNIQUE `(user_id, portfolio_item_id)` acota las interacciones al tamaño del catálogo; límites de tasa por usuario |
| Spam de proyectos | Máximo 20 proyectos activos por usuario, impuesto por un trigger `BEFORE INSERT`, no por el cliente |
| Abuso de storage con imágenes de referencia | Máximo 10 referencias por proyecto, máximo 50 MB por usuario, impuesto del lado del servidor |
| Inundación de analytics | Solo inserción, sin lectura; se monitorea el volumen; los eventos se descartan, nunca se reintentan agresivamente |
| Cosecha de datos de contacto | `whatsapp_e164` e `instagram_handle` son legibles para profesionales publicados — eso *es* el producto. La mitigación es el consentimiento (los artistas saben que sus datos se muestran) más límite de tasa en la lectura del catálogo, no la oscuridad. |
| Scraping del catálogo | Aceptado como daño bajo en V1 con 12 perfiles públicos y consentidos. Revisitar antes de que el catálogo sea un activo. |

## 7. Secretos

| Secreto | Dónde vive | Dónde nunca puede estar |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Bundle del cliente (público por diseño) | — |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Bundle del cliente (público por diseño) | — |
| `SUPABASE_SERVICE_ROLE_KEY` | `tools/seed/.env.local`, secreto de CI | Cualquier archivo bajo `apps/`, cualquier log, cualquier commit |
| Contraseña de la base | Gestor de contraseñas del operador | En cualquier otro lado |

Controles:
- `.env*` está en gitignore salvo `.env.example`.
- Un chequeo de CI busca `service_role` y el prefijo del JWT de service key en
  el bundle compilado y rompe el build si aparece.
- `tools/seed` se niega a correr si detecta que está ejecutando dentro de un
  contexto de Metro o Expo.
- El escaneo de secretos está habilitado en el repositorio.

## 8. Logging y datos personales

- Nada de logging en producción de tokens, emails, cuerpos de mensajes,
  descripciones de proyecto, texto de búsqueda ni URLs firmadas de storage.
- Los errores se mapean a códigos antes de mostrarse; los errores crudos de
  Postgres nunca llegan a una persona ni a un evento de analytics — filtran
  nombres de tablas y columnas.
- `audit_events` registra quién le hizo qué a qué entidad, con metadatos
  limitados a ids y enums.
- El reporte de crashes, si se agrega, tiene que limpiar los breadcrumbs; no
  está en V1.

## 9. Derechos sobre los datos

- **Exportación:** la persona puede pedir su perfil, interacciones, gusto,
  proyectos y matches en JSON. En V1 se puede atender manualmente; las consultas
  existen como script.
- **Borrado:** borrar el usuario de auth cascadea a todas las filas de su
  propiedad; los objetos de storage bajo `references/{user_id}/` y
  `avatars/{user_id}/` los elimina la misma rutina. Queda registrado en
  `audit_events`.
- **Opt-out de analytics:** `profiles.analytics_opt_in`; cuando está en falso el
  cliente no encola nada.
- **Retiro de artista:** ver
  [`content-policy.md`](../product/content-policy.md) §8.

## 10. Dependencias y cadena de suministro

- `npm audit` en CI; alto/crítico bloquea el merge.
- Lockfiles commiteados. Las dependencias se agregan solo con una razón
  declarada.
- Ninguna dependencia recibe acceso a secretos — el conjunto de dependencias de
  la herramienta de seed se mantiene mínimo y separado del de la app.
- Los upgrades del SDK de Expo son deliberados, probados en dispositivo y
  registrados.

## 11. Checklist de revisión (correr antes de cada release)

- [ ] Toda tabla de `public`: RLS habilitado **y** forzado, ≥ 1 política,
      verbos correctos
- [ ] Toda política `for insert` tiene un `with check`
- [ ] Ninguna política `for all`
- [ ] Los tests de acceso cruzado pasan en todas las tablas de propiedad de
      usuario
- [ ] Ningún string `service_role` en el bundle compilado
- [ ] Las políticas de storage restringen la escritura a la carpeta de quien
      llama
- [ ] Ninguna propiedad nueva de analytics con texto libre
- [ ] Parámetros de deep link validados; ningún link que mute
- [ ] Tokens de sesión solo en `expo-secure-store`
- [ ] `npm audit` limpio en alto/crítico
- [ ] Las tablas nuevas agregadas al mapa de políticas de §3
