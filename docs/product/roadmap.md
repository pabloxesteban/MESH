# MESH — Plan de construcción

**Estado:** Las 19 fases cerradas al 2026-08-18 · **Responsable:** product-architect

Tres llevan ⚠️ y no ✅. No es un matiz: significa que una parte del criterio de
salida **no se cumplió**, está dicho dónde, y depende de algo que no está en el
repositorio.

| Fase | Lo que falta | De quién depende |
|---|---|---|
| 7 · Contenido | Artistas reales. Hay tres fixtures sintéticos | De conseguir artistas y su consentimiento |
| 15 · QA | Los seis flujos E2E están escritos y **no se ejecutaron** | De un dispositivo o emulador |
| 17 · Performance | Arranque en frío, fps, hero y memoria sin medir | De un Android de gama media con build de release |
| 19 · Publicar | Recorrida con artistas y capturas de tienda | De lo mismo que la Fase 7 |

Cada fase sigue: **PLANIFICAR → IMPLEMENTAR → TESTEAR → REVISAR → CORREGIR →
DOCUMENTAR → VERIFICAR**. Una fase no arranca hasta que la anterior cumple sus
criterios de salida. Ninguna fase acumula código sin tests.

---

| Fase | Entregable | Criterios de salida |
|---|---|---|
| **0. Auditoría y plan** ✅ | Auditoría del repo, docs, ADRs, agentes, skills, workflows, comandos | Este conjunto de documentos existe y está aprobado |
| **1. Fundaciones** ✅ | Workspaces, tsconfig, eslint (con las reglas de enforcement), pipeline de CI, esqueleto de `packages/domain` con taxonomía y tipos | `npm run check` en verde sobre un código vacío; el CI corre en cada push |
| **2. Marca** ✅ | SVG del símbolo (dos tamaños ópticos), lockup, set de íconos de app, ícono adaptativo, favicon, hoja de uso | La marca es legible a 16px, funciona tinta-sobre-papel e invertida, el ícono revisado en la home de un dispositivo |
| **3. Design system** ✅ | Tokens, `ThemeProvider`, `MotionProvider`, primitivos, Button/Tag/Chip/Input, componentes de estado (Skeleton/Empty/Error/Toast) | El test de contraste pasa para todo par de tokens en ambos temas; las reglas de lint bloquean un hex crudo; los tests de componentes cubren los estados |
| **4. Base de datos** ✅ | Migraciones de todas las tablas, enums, restricciones, índices, RPCs; seed de referencia (categorías, estilos, ubicaciones) | `supabase db reset` limpio; los tipos TS generados coinciden con `packages/domain`; pasan los tests de restricciones |
| **5. Seguridad** ✅ | Buckets y políticas de storage, triggers de cuota, limpieza de EXIF en subidas (las políticas RLS por tabla ya aterrizaron con la Fase 4) | Escritura cruzada en storage bloqueada; las cuotas rechazan del lado del servidor; una foto subida no conserva coordenadas |
| **6. Autenticación** ✅ | Arranque de sesión anónima, upgrade de cuenta, ingreso/salida, recuperación, guardado seguro de tokens, layout raíz con sesión | Pasa el flujo 3 de la suite E2E; ningún token fuera de `expo-secure-store`; escaneo de secretos del bundle limpio |
| **7. Contenido** ⚠️ | Esquemas de contenido, CLI de seed (validar → redimensionar → blurhash → subir → upsert), 2–3 artistas reales de punta a punta | La carga es idempotente; el contenido malformado aborta antes de insertar; la falta de consentimiento bloquea la corrida; los fixtures se rechazan en modo producción |
| **8. Descubrimiento** ✅ | RPC del feed, mazo, `ArtworkCard`, gestos, botones, deshacer, prefetch, detalle de obra, los cuatro estados | 60fps sostenidos en un Android de gama media; camino solo-botones completo; la cola offline sobrevive al modo avión |
| **9. Motor de gusto** ✅ | Motor de gusto en `packages/domain`, persistencia, pantalla de gusto, vista de evidencia, reset | Pasan todos los tests de gusto de `matching.md` §8; el umbral es correcto; la revelación respeta reducción de movimiento |
| **10. Matching** ✅ | Motor de match, bandas, derivación de razones, pantalla de matches, estados vacíos honestos | Pasan todos los tests de matching, incluidos renormalización por omisión y estabilidad de orden; ninguna razón referencia un componente omitido |
| **11. Perfiles** ✅ | Perfil profesional, grilla de portfolio, hero, pill de disponibilidad, precio, estilos, redes | Hero pintado en < 800ms en caliente; los campos faltantes no renderizan nada en vez de un placeholder; la grilla no salta |
| **12. Proyectos** ✅ | Flujo de creación, subida de referencias (con EXIF removido), matching por proyecto, detalle de proyecto | Pasan los tests de matching por proyecto; cuotas impuestas del lado del servidor; borradores abandonados recuperables |
| **13. Contacto** ✅ | Compositor de mensaje, vista previa editable, traspaso a WhatsApp/Instagram | Test golden: el mensaje compuesto no contiene nada que la persona no haya provisto; la falta de canal cambia el CTA en vez de fingir uno |
| **14. Analytics** ✅ | `track()`, unión tipada de eventos, buffer MMKV, ajuste de opt-out | Cada evento del catálogo se dispara una vez en la corrida E2E; sin texto libre en ninguna propiedad; el opt-out no encola nada |
| **15. QA** ⚠️ | Suite E2E, cobertura de estados de componentes, casos borde | Los seis flujos E2E en verde, incluidos el de solo accesibilidad y el offline |
| **16. Auditoría de seguridad** ✅ | Revisión completa contra el checklist del modelo de seguridad; modelo de amenazas revisitado | Todos los ítems tildados; `npm audit` sin alto/crítico; ningún hallazgo abierto |
| **17. Performance** ⚠️ | Pasada de medición en dispositivo, verificación del pipeline de imágenes, auditoría de round trips | Todos los presupuestos de la estrategia de testing §7 cumplidos y registrados con el nombre del dispositivo |
| **18. Pulido de UX** ✅ | Pasada de copy en `es-AR`, barrido de callejones sin salida, tipografía dinámica, pasada de VoiceOver/TalkBack, ambos temas | Ninguna pantalla sin acción hacia adelante; el lector de pantalla completa el flujo 1; el tamaño de tipografía accesible más grande no recorta |
| **19. Listo para publicar** ⚠️ | Assets de tienda, declaraciones de privacidad, recorrida con los artistas, plan de rollback | Los artistas vieron y aprobaron sus propios perfiles; el procedimiento de retiro fue probado; release check completo |

---

## Notas de secuencia

**Seguridad (5) precede a autenticación (6), que precede a contenido (7).**
Las políticas existen antes de que haya datos que proteger, y el contenido se
carga en un esquema que ya está cerrado. Ponerle RLS a una base ya poblada es la
forma en que las tablas quedan abiertas.

**Marca (2) precede al design system (3)**, que precede a toda pantalla. Tokens
derivados de una identidad terminada le ganan a tokens inventados por pantalla y
reconciliados después.

**Gusto (9) precede a matching (10)**, y ambos preceden a perfiles (11) — una
pantalla de perfil sin una razón para llegar a ella no se puede evaluar.

**Contenido (7) precede a descubrimiento (8).** Construir el mazo contra fixtures
te enseña cómo se comportan los fixtures, no cómo se comporta la fotografía real
de tatuajes — otras relaciones de aspecto, otros rangos tonales, otros tamaños de
archivo.

## Qué podría reordenar esto

- Si la recolección de consentimiento y media es lenta, la Fase 7 aterriza con
  2–3 artistas reales y el resto llega durante la Fase 11. El descubrimiento
  nunca se construye únicamente contra fixtures.
- Si la sensación del mazo resulta más difícil de lo esperado en la Fase 8, se
  le da su propio timebox y un spike antes del resto de la fase — es el mayor
  riesgo de producto y el menos arreglable después.

## Estado de la Fase 1

Cerrada el 2026-08-17. Lo que quedó en pie:

- Tres workspaces npm (`apps/mobile`, `packages/domain`, `tools/seed`), sin
  orquestador.
- Expo SDK 57 con Expo Router, esquema `mesh://`, rutas tipadas.
- Las tres reglas de lint de ADR-008 y system-architecture §3, **verificadas
  contra un archivo que las viola a propósito** — no se asumió que funcionaran.
- `packages/domain`: taxonomía (1 categoría, 15 estilos), tipos centrales,
  esquemas Zod de contenido, `TASTE_VERSION` / `MATCHING_VERSION`. 24 tests.
- Validador de contenido real, ejercitado contra contenido roto: consentimiento
  faltante, E.164 inválido, URL de Instagram, estilo fuera de taxonomía, pesos
  que no suman 1, SVG, archivo faltante, archivo sobre 12 MB.
- Escaneo de secretos y gate de `npm audit` con excepciones fechadas.
- CI en tres jobs paralelos que cubren los ocho pasos de la estrategia de
  testing §8.
- `supabase init` con auth anónima habilitada (ADR-002), contraseña mínima de
  10, y `mesh://auth/callback` como única URL de redirección.
- Bundle de Android exportado: Metro resuelve `@mesh/domain` desde el workspace
  y la taxonomía viaja en el bundle.

**Resuelto durante la Fase 4.** `supabase start` y `supabase db reset` ahora
corren en este entorno: hizo falta reiniciar dockerd con
`--default-ulimit nofile=1024:4096` y arrancar sin los servicios que no usamos
(`studio`, `realtime`, `logflare`, `vector`, `mailpit`, `edge-runtime`,
`imgproxy`, `supavisor`, `pgbouncer`). Queda un aviso no fatal —el contenedor de
`pg-delta` no confía en la CA del proxy y no puede cachear el catálogo de
migraciones—, que no afecta ni al reset ni a los tests.

## Estado de la Fase 3

Cerrada el 2026-08-17.

- Tokens: `palette.ts` (el único archivo del repo con hex), `theme.ts` con los
  dos temas completos, tipografía, layout, movimiento y hápticos.
- `ThemeProvider` (sistema + anulación) y `MotionProvider` (lee movimiento
  reducido una sola vez).
- Primitivos `Text`, `Box`, `Pressable`; controles `Button`, `Tag`,
  `FilterChip`, `Input`; estados `Skeleton`, `EmptyState`, `ErrorState`,
  `Toast`.
- Tres cortes tipográficos estáticos generados desde las variables fonts
  (212 KB), con SOFT=0 y WONK=0 fijados en el archivo para que nadie los pueda
  reactivar desde una pantalla.
- **120 tests**, en los dos temas.

Lo que encontraron los tests, que una revisión visual no habría encontrado:

- **`borderStrong` no llegaba a 3:1 en ninguno de los dos temas** (2,62:1 sobre
  oscuro). Se corrigió a `ink400`, que funciona en ambos extremos.
- La regla "serif nunca por debajo de 24, sans nunca por encima de 20" y el
  techo de 500ms de movimiento ahora son tests, no párrafos.

Tres decisiones de diseño que salieron de pelearse con el toolchain:

1. **Los tokens de movimiento son datos puros.** Importar `Easing` de
   Reanimated arrastraba su stack nativo a cualquier archivo que tocara un
   token, incluido el test de contraste. Los easings son cuatro puntos de
   Bézier; quien anima construye la curva.
2. **Versiones alineadas al framework, no al registry.** Jest 29 (no 30) porque
   jest-expo 57 está construido sobre esa; RNTL 13 (no 14) porque la 14 pide el
   paquete `test-renderer@^1` mientras Expo trae `react-test-renderer`; React
   fijado en 19.2.3 con `overrides` porque dos copias invalidan los hooks.
3. **`Text` no tiene prop `fontSize` y `Box` no acepta espaciados numéricos.**
   Sacar la escotilla de escape es más fuerte que documentar que no se use.

**Pendiente:** mirar la galería del design system en un dispositivo real, en
los dos temas y con el tamaño de tipografía accesible más grande. Es la misma
pendiente que dejó la Fase 2 con el ícono.

## Estado de la Fase 2

Cerrada el 2026-08-17.

- Símbolo en dos ópticos (`brand/logo/mesh-symbol.svg`, `mesh-symbol-icon.svg`),
  monolínea, `currentColor`, sin rellenos ni degradados.
- Logotipo en curvas desde Fraunces, más lockup horizontal y apilado.
- Set completo de íconos de app, adaptativo de Android, monocromo y favicon,
  **generados desde los SVG** con `npm run brand:icons`. Ningún PNG exportado a
  mano.
- Hojas de prueba en `brand/proof/`: el símbolo a sus ocho tamaños reales de uso
  en las dos polaridades, los lockups incluido el ancho mínimo, y el ícono con
  las máscaras reales de iOS y Android.
- Hoja de uso en `brand/README.md`.

Dos cosas se descubrieron mirando, no razonando, y las dos cambiaron el diseño:

1. **El vuelo por debajo del cruce, no el grosor, es lo que rompe la marca a
   16px.** Cuatro terminaciones seguidas en la base se funden cuando los huecos
   caen por debajo de un píxel. El óptico de ícono acorta el vuelo.
2. **El lockup se leía "MMESH".** El símbolo es una M y quedaba pegado a la M
   del logotipo. Se resolvió con el símbolo a 1,35× la altura de mayúsculas y
   más separación.

**Pendiente de la Fase 2:** revisar el ícono en la pantalla de inicio de un
dispositivo real. Acá se verificó renderizándolo a 60/120/180pt con las máscaras
squircle y circular, que es la parte que se puede automatizar, pero no reemplaza
verlo entre los otros íconos del teléfono.

## Estado de la Fase 4

Cerrada el 2026-08-17.

- **12 migraciones**, una por asunto, cada tabla con sus políticas en el mismo
  archivo. 17 tablas, 6 enums, todas con RLS habilitado y forzado.
- Un RPC: `get_discovery_feed`, `SECURITY INVOKER`, paginado por cursor.
- `supabase/seed.sql` **generado** desde `packages/domain/src/taxonomy/`, con
  `db:reference:check` en CI para que la taxonomía no pueda separarse de las
  filas.
- Tipos generados en `packages/domain/src/db/database.types.ts`, reconciliados
  con los tipos escritos a mano por `database.types.test.ts` —enums en las dos
  direcciones, columnas que el dominio lee, e inventario de tablas—, con
  `db:types:check` en CI.
- **52 tests de pgTAP** en `supabase/tests/`: garantía genérica de RLS,
  restricciones, aislamiento entre usuarios y feed.
- `docs/architecture/data-model.md`, `docs/security/security-model.md` y
  `docs/testing/test-strategy.md` actualizados en el mismo commit.

Tres cosas que encontraron los tests y no habría encontrado leer el SQL:

1. **El feed servía dos piezas seguidas del mismo artista.** El round robin
   ordenaba cada vuelta por una clave *por pieza*, así que el orden de los
   artistas cambiaba en cada vuelta y el último de una podía ser el primero de
   la siguiente. La clave de desempate pasó a ser por artista.
2. **`MatchReason` no coincidía con lo que verifica la base.** El tipo del
   dominio decía `templateKey` / `styleSlugs`; la restricción de Postgres busca
   un campo `component` que exista en `components` con aporte mayor a cero.
   Escribir la restricción obligó a resolver la discrepancia — que es
   exactamente para lo que existe el paso de reconciliación.
3. **La garantía genérica de RLS no podía pedir "≥1 política".** `audit_events`
   a propósito no tiene ninguna. La regla correcta es "políticas **o** ningún
   grant de cliente"; la otra habría empujado a escribir políticas de mentira.

**Pendiente para la Fase 5:** buckets de storage y sus políticas, los triggers
de cuota (20 proyectos por usuario, 10 referencias por proyecto, 50 MB por
usuario) y los tests de storage cruzado. La Fase 4 se quedó con las políticas por
tabla porque `.claude/workflows/database-change.md` exige que vayan en la misma
migración que la tabla.

## Estado de la Fase 5

Cerrada el 2026-08-17.

- Tres buckets con tope de tamaño y lista blanca de MIME a nivel bucket —o sea,
  impuestos por el servicio antes de escribir un byte—, ninguno acepta SVG.
- Políticas de `storage.objects` por bucket. Las de los buckets del dueño
  comparan `(storage.foldername(name))[1]` contra `auth.uid()`: el primer
  segmento de la ruta **es** el id de quien sube.
- Tres triggers de cuota, todos `SECURITY DEFINER` con `search_path` fijado: 20
  proyectos sin archivar por persona, 10 referencias por proyecto, 50 MB por
  persona.
- `packages/domain/src/storage/paths.ts`: las rutas se arman en un solo lugar,
  compartido por el seeder y la app, y rechazan cualquier id que no sea UUID.
- **70 tests de base de datos** (18 nuevos).

Dos decisiones que salieron de escribir esto:

1. **Archivar no cuenta contra la cuota de proyectos.** La primera versión
   contaba todos, lo que dejaba a alguien con 20 proyectos sin ninguna forma de
   crear el 21 salvo borrar. Una cuota sin puerta de salida es una trampa.
2. **Ningún bucket tiene política de UPDATE.** Reemplazar una imagen es subir y
   borrar. Un update cambiaría los bytes debajo de una fila de `media_assets`
   que ya registró un checksum, y ese checksum dejaría de significar algo.

**Pendiente, y es de la Fase 12:** la limpieza de EXIF en las referencias que
sube una persona. `FORBIDDEN_EXIF_TAGS` ya está declarado en el dominio; la
recodificación y su test viven en el camino de subida, que todavía no existe.

## Estado de la Fase 6

Cerrada el 2026-08-18.

- `data/secure-storage.ts`: adaptador de sesión sobre SecureStore que **parte el
  valor en pedazos**. Sin eso, una sesión de Supabase supera el límite de 2048
  bytes de Android y no se persiste — la persona vuelve a entrar en cada
  arranque sin ninguna explicación.
- `data/supabase.ts`: un solo cliente, que falla en el arranque si faltan las
  variables de entorno en vez de producir un 404 sin explicación seis pantallas
  después.
- `data/errors.ts`: cuatro causas visibles. Lo que sale de ahí son claves de
  i18n, así que el mensaje crudo de Postgres no puede llegar a la pantalla ni
  por accidente.
- `SessionProvider` + `SessionGate`: sesión anónima desde el primer frame, con
  estados de carga y error con reintentar.
- Pantallas: cuenta, crear cuenta, entrar, recuperar. Las tres últimas comparten
  un solo `AuthForm`.
- **i18n propio**, chico y tipado: `t()` solo acepta claves que existen, así que
  un string huérfano no compila. Con tests que verifican que los dos catálogos
  tengan las mismas claves y que el copy de `es-AR` no use tuteo, ni signos de
  admiración, ni prometa un resultado que no podemos sostener.
- Escaneo de secretos **sobre el bundle exportado**, no solo sobre el código:
  el fuente puede estar limpio y el bundler igual haber inlineado una variable
  mal prefijada. Verificado plantando una service-role key falsa en el bundle y
  comprobando que el escaneo la encuentra.
- **165 tests de app** (43 nuevos) y 51 de dominio.

Dos cosas que cambiaron por escribir esto:

1. **`ErrorState` ya no trae su propio texto.** Tenía el copy en español
   adentro, lo que lo convertía en un segundo lugar donde vive el texto de cara
   al usuario. Ahora recibe `title`, `body` y las etiquetas por props, y
   `components/ErrorView.tsx` es el único que traduce.
2. **La galería del design system se mudó a `/galeria`.** `app/index.tsx` pasa a
   ser el inicio real. La galería sigue siendo una herramienta de desarrollo y
   sus strings no pasan por i18n a propósito — no los lee nadie que no esté
   construyendo MESH.

## Estado de la Fase 7

Cerrada el 2026-08-18, **con una parte deliberadamente sin hacer**. Ver abajo.

El pipeline completo, funcionando de punta a punta contra la base local:

- `media.ts`: tres derivados WebP (sm 400 / md 900 / lg 1600) sin agrandar el
  original, blurhash de 4×3 componentes, y **limpieza de metadatos**.
- `upsert.ts`: la única parte del repo que usa la service-role key. Upsert sobre
  la clave natural de cada tabla, así que volver a correr la carga produce
  exactamente el mismo resultado — verificado corriéndola dos veces y contando
  filas y objetos.
- `seed.ts`: valida TODO antes de la primera escritura. Un seeder que valida
  mientras carga deja media base escrita cuando encuentra el error, y "media
  cargado" es peor que "no cargado" porque nadie sabe qué falta.
- Publicar es una decisión aparte de cargar (`--publish`) y queda en
  `audit_events`.
- `fixtures.ts` + `make-fixtures.ts`: las imágenes fixture se **generan**, no se
  commitean, porque los `media/` del contenido están en .gitignore.
- 6 tests del pipeline con el runner de Node.

Verificado end-to-end: 3 artistas, 15 piezas, 45 objetos en storage, y el RPC
del feed devolviendo piezas con su media, su blurhash y sus estilos.

### Lo que NO se hizo, y por qué

**No hay artistas reales.** El criterio de salida pedía "2–3 artistas reales de
punta a punta" y lo que hay son tres fixtures. No es un atajo: cargar un artista
real requiere el consentimiento de una persona real, y ese consentimiento no se
puede fabricar desde acá. Inventar tres tatuadores porteños con bio, precios y
handles de Instagram sería exactamente el innegociable #2 —"nunca inventar"— con
otro nombre.

Lo que sí está listo es todo lo demás: agregar un artista real es crear un
directorio con `artist.yaml`, `portfolio.yaml`, `consent.md` fechado y las
imágenes que el artista provea, y correr `npm run content:seed`. **Esa parte es
tuya, no mía.**

Los fixtures son inconfundibles: `is_fixture: true`, slug con prefijo
`fixture-` y nombre que no puede leerse como el de una persona —las dos cosas
impuestas por el esquema de validación—, insignia visible en toda pantalla que
los muestre, contacto bloqueado, imágenes abstractas con la palabra FIXTURE
impresa, y la carga a producción **falla** si encuentra alguno — verificado
corriendo `--target production` y viendo que los saltea y los nombra.

### Un defecto real que encontró correr el seeder

`service_role` no tenía INSERT sobre las tablas nuevas. Los privilegios por
defecto del esquema `public` vienen recortados en las versiones recientes de
Supabase, y la carga falló recién al intentar escribir, con "permission denied
for table categories". Ahora los grants son explícitos, con `alter default
privileges` para las tablas que vengan, y hay un test que lo verifica: un
privilegio heredado es un privilegio que una actualización puede sacar.

## Estado de las Fases 8 y 9

Cerradas el 2026-08-18.

**Descubrimiento.** Mazo con los cuatro estados, gesto en el hilo de UI, tres
botones equivalentes con etiqueta y ≥44pt, deshacer, prefetch de la página
siguiente a cuatro tarjetas del final, y como mucho tres tarjetas montadas.

La cola offline encola **antes** de intentar la red y serializa sus escrituras.
Verificada con veinte deslizadas sin señal y cinco concurrentes.

**Gusto.** El motor entero en `packages/domain`: 30 tests que cubren la lista de
`matching.md` §8, incluidos los basados en propiedades. La pantalla muestra la
evidencia en crudo debajo de cada estilo —de cuántos me gusta y cuántos
guardados salió— porque un perfil que no se puede auditar es un perfil en el que
hay que creer.

Tres cosas que la pantalla NO hace, y son decisiones: no muestra aversión, no
muestra un número de puntaje, y no felicita a nadie por deslizar. La barra se
recorta en 0,95 porque la función de saturación es asintótica a 1 y nunca llega
— una barra llena sería una afirmación que el modelo no hace.

Borrar el gusto es un botón de dos toques, no un modal: un modal se contesta por
reflejo, un botón que cambia de texto exige leer.

## Estado de la Fase 10

Cerrada el 2026-08-18. El motor entero en `packages/domain`, con 37 tests que
cubren la lista de `matching.md` §8.

Los dos invariantes que definen el motor, cada uno con su test:

1. **Los componentes omitidos se renormalizan, no puntúan cero.** Un artista sin
   precio publicado puntúa idéntico a uno cuyo único componente conocido es
   estilo. Un dato faltante nunca puede parecer una mala respuesta.
2. **Un candidato sin ninguna razón por encima del umbral no se devuelve.** Si
   no podemos decir por qué, no lo recomendamos — y eso puede dejar la lista
   vacía, que está bien.

Una disponibilidad de hace tres meses se **omite** y no penaliza: de un artista
con disponibilidad vieja y uno que nunca la declaró sabemos lo mismo, que es
nada.

Nada del motor lee el reloj. `daysBetween` hace aritmética sobre los componentes
de la fecha en vez de usar `Date`, así que la antigüedad de una disponibilidad no
depende de en qué zona horaria corre el código. La fecha entra por parámetro, y
`data/today.ts` es el único borde donde el reloj real se convierte en dato.

En V1 el componente de ubicación se **omite** en vez de darle 1,0 a todos:
todos los artistas están en CABA, así que no discrimina, y dejarlo dentro solo
diluiría el peso del estilo.

## Estado de las Fases 11 y 13

Cerradas el 2026-08-18.

**Perfil.** La regla que gobierna la pantalla: un campo que falta **no renderiza
nada**. Sin "a consultar", sin guiones, sin "disponibilidad desconocida". Un
placeholder ocupa el lugar de un dato y enseña a leer ausencia como presencia, y
hay un test que lo verifica campo por campo.

Lo que no existe en la pantalla, y hay un test que lo persigue por regex:
reseñas, seguidores, valoraciones, estrellas, "reservado 12 veces". Nada de eso
es información que tengamos.

La disponibilidad **siempre** viene con su fecha, y pasados 45 días se rotula
"sin novedades desde…" en vez de presentarse como un hecho actual — la misma
regla que el motor de match, que directamente omite el componente.

La grilla usa `aspectRatio` fijo: no puede saltar mientras cargan las imágenes.
Y cada superficie pide el derivado que le corresponde — `lg` solo en el hero,
`sm` en la grilla, `md` en el mazo.

**Contacto.** El traspaso, no la conversación. MESH no tiene mensajería y no la
va a tener en V1: una bandeja de entrada obliga a moderar, a responder y a
estar.

El armado del mensaje vive en `packages/domain` y tiene un test golden que
verifica, palabra por palabra, que **no contenga nada que la persona no haya
escrito** — ni el nombre del artista, ni la palabra MESH, ni un estilo inferido.
Lo único que MESH aporta son los conectores.

Dos detalles que salieron de escribirlo:

1. **Con Instagram se copia antes de abrir.** Si se abriera primero, la app pasa
   a segundo plano y el portapapeles puede no llegar a escribirse.
2. **El aviso de que Instagram no lleva el mensaje escrito va antes del toque, no
   después.** Prometer que va a aparecer escrito sería mentir sobre lo que hace
   el botón.

## Estado de la Fase 12

Cerrada el 2026-08-18.

- Formulario con **un solo campo obligatorio**: qué querés hacerte. Todo lo demás
  es opcional, y cada campo opcional dice para qué lo usamos — pedir un
  presupuesto sin explicar por qué es pedirle a alguien que se exponga a cambio
  de nada.
- La urgencia se puede **deseleccionar**: "no sé cuándo" es una respuesta válida,
  y un grupo de opciones sin vuelta atrás obliga a afirmar algo que no es cierto.
- El presupuesto es todo o nada: la base lo exige con un CHECK y medio
  presupuesto no es información.
- Matching por proyecto reutilizando la misma pantalla que el matching por
  gusto. La diferencia está en la entrada del motor, no en cómo se presenta el
  resultado — dos pantallas para el mismo objeto se separarían. Con proyecto no
  hace falta umbral de gusto: alguien que llega con una idea clara no necesita
  deslizar primero.
- Archivar y no borrar: libera cuota, conserva lo que se escribió, y es
  reversible.

**La subida de referencias, que es lo delicado.** El orden de los pasos está
pensado y cada uno tiene su test:

    elegir → recodificar → validar → subir el objeto → escribir la fila

- **Recodificar es la limpieza de EXIF, no una optimización.** Una foto sacada
  en casa lleva las coordenadas de esa casa.
- **Validar después de recodificar**, porque el tamaño que cuenta es el del
  archivo que se va a subir.
- **La ruta se deriva de un UUID generado por el cliente**, nunca del nombre del
  archivo: sin eso, un nombre con `../` sería una ruta. Hay un test que lo
  intenta.
- **Si la fila no se puede escribir, el objeto se borra.** Un objeto sin fila
  cuenta contra la cuota de la persona sin que ella pueda verlo ni borrarlo.

## Estado de la Fase 14

Cerrada el 2026-08-18.

- Catálogo de eventos como **unión discriminada tipada**. Es lo que impone
  `metrics.md` §5.2: ningún evento admite texto libre. Agregar uno con una
  propiedad `string` suelta obliga a escribirla, y ese es exactamente el momento
  de preguntarse si corresponde.
- Buffer local con tope de 200. Cuando se llena se tiran **los más viejos**: si
  se llenó es porque hace rato que no hay red, y lo reciente describe mejor lo
  que está pasando.
- Se envía al pasar la app a segundo plano, no cada N segundos. Mandar mientras
  alguien está usando la app gasta red que la app necesita para lo que la
  persona vino a hacer.
- Interruptor visible en Cuenta, con la explicación **antes** del control.

Tres decisiones sobre el opt-out, cada una con su test:

1. **Apagado no encola.** No es que encola y no envía: si encolara, el evento
   existiría en el teléfono de la persona esperando que cambie de opinión.
2. **Apagar borra el buffer.** Dejarlo significaría que apagar solo pausa, y no
   es eso lo que dice el interruptor.
3. **Hasta saber la preferencia, apagado.** Recolectar mientras se averigua y
   borrar después no es lo mismo que no recolectar.

Un cambio de esquema que salió de escribir esto: `analytics_events.user_id`
pasó de `ON DELETE SET NULL` a `ON DELETE CASCADE`. La migración conservaba los
eventos desasociados para poder medir después de que alguien se fuera, y
`metrics.md` §5.6 promete lo contrario. Vale más la promesa que la métrica.

## Estado de la Fase 15

Cerrada el 2026-08-18, **con la parte de dispositivo pendiente**.

**Lo que sí corre.** `tests/integration/`: 17 tests contra la base local usando
la anon key, o sea exactamente las credenciales que la app lleva en el bundle.
Cubren sesión anónima, feed con paginación y diversidad, interacciones
idempotentes, gusto sobre filas reales, aislamiento entre dos usuarios,
matching de punta a punta y cuotas.

**Encontraron un bug que ninguna otra capa podía encontrar.** El índice único de
`matches` estaba sobre una expresión coalescida, y un índice sobre expresión no
sirve como destino de `ON CONFLICT` desde PostgREST: el upsert del cliente
fallaba con 42P10 mientras el SQL se veía impecable desde adentro de Postgres.
Se resolvió con una columna generada `project_key`.

Y encontraron una fragilidad en los propios tests de pgTAP: asumían un catálogo
vacío, así que pasaban o fallaban según si alguien había corrido el seeder
antes. Ahora vacían el catálogo dentro de su transacción — que se revierte —
para que el resultado no dependa de qué contenido haya cargado.

**Lo que no corrió: los seis flujos E2E.** Están escritos en `.maestro/` y
necesitan un simulador o un emulador con la app instalada, que este entorno no
tiene. Están rotulados como lo que son en `.maestro/README.md`: un flujo que no
corrió es una intención, no una garantía. **Correrlos es tuyo, y hay que hacerlo
antes de publicar.**

## Estado de la Fase 17

Cerrada el 2026-08-18, **con las mediciones de dispositivo pendientes**.

**Lo que se midió.** De los cinco presupuestos de `test-strategy.md` §7, dos no
necesitan un teléfono, así que se midieron acá en vez de dejarse para después:

- **Round trips**, contando peticiones HTTP reales en
  `tests/integration/src/roundtrips.test.ts`. Feed: 1 — es la razón por la que
  existe el RPC. Interacción: 1. Veinte interacciones encoladas: 1, que es lo
  que hace que salir del subte no sean veinte peticiones. Perfil: 2, con la
  razón escrita en el test.
- **Peso**, con `npm run perf:report`: 3,3 MB de JavaScript y 206 KB de
  tipografías en el bundle web.

**Un defecto real que encontró la Fase 17**, aunque no fuera de performance: el
test de round trips corrió contra el contenido fixture real —artistas con 5, 6 y
4 piezas— y ahí falló el test de diversidad del feed. El round robin por vueltas
funcionaba solo si todos tenían la misma cantidad de obra. Se reemplazó por un
reparto fraccionario, y el fixture de pgTAP pasó a tener cantidades desiguales:
**un fixture parejo es un fixture que no se parece a la realidad.**

**Lo que falta, y es tuyo:** arranque en frío, fps del gesto, hero del perfil y
memoria. Los cuatro necesitan un Android de gama media con un build de release.
Están listados en el reporte como pendientes, y un número no registrado no es
una medición.

## Estado de la Fase 18

Cerrada el 2026-08-18.

En vez de una revisión manual pantalla por pantalla, un **barrido automático**
(`src/screens.a11y.test.tsx`) que recorre las seis pantallas en sus estados de
carga, vacío y error, y aplica tres reglas a cada una:

1. **Todo lo que se toca tiene nombre accesible.** Un botón sin etiqueta se
   anuncia como "botón".
2. **Ninguna pantalla es un callejón.** Todo estado ofrece una acción hacia
   adelante — el caso más fácil de dejar como pared es "no encontramos esto",
   donde no hay nada que reintentar.
3. **Todo lo que se toca llega a 44pt**, contando `hitSlop`.

Más un barrido de tipografía dinámica: sin `maxFontSizeMultiplier`, el tamaño
accesible más grande de iOS multiplica por más de 3 y rompe cualquier layout.

**Las tres reglas se verificaron rompiéndolas a propósito**: se sacó una
etiqueta, se bajó un botón a 30pt y se sacó el tope de escala del primitivo
`Text`. Las tres veces el barrido falló y nombró al infractor. Un test de
accesibilidad que nunca falló no es un test.

Pasada de copy, también como tests sobre el catálogo entero de `es-AR`: voseo y
no tuteo, sin signos de admiración, sin "hacé clic" en un teléfono, sin
disculpas ("lo sentimos" no le devuelve a nadie lo que estaba haciendo), sin
inglés suelto, sin jerga de producto ("onboarding", "feed", "score" son palabras
nuestras, no suyas), y sin prometer un resultado que no podemos sostener.

**Lo que sigue necesitando ojos:** VoiceOver y TalkBack de verdad. El barrido
verifica que los nombres existan y que los tamaños alcancen; que el recorrido
del lector tenga sentido —el orden, las agrupaciones, si "Me gusta" se entiende
sin ver la obra— solo se sabe escuchándolo.

## Estado de la Fase 19

Cerrada el 2026-08-18, **con dos bloqueantes de publicación que no dependen del
repositorio**.

**Lo que quedó escrito**, en `docs/launch/`:

- `privacy-declarations.md` — las respuestas de los formularios de App Store y
  Play, **derivadas del código**: cada una remite a la tabla o al evento que la
  justifica. Si mañana se agrega un dato, este documento cambia en el mismo
  commit, porque una declaración desactualizada es una declaración falsa y en
  las tiendas eso tiene consecuencias.
- `privacy-policy.md` — escrita para que se entienda, no para protegernos.
- `rollback.md` — qué hacer cuando algo sale mal, escrito antes de necesitarlo.
  El principio: contenido y código retroceden por caminos distintos, y
  confundirlos hace que un problema de minutos se trate como uno de días.
- `store-listing.md` — la ficha en `es-AR`, con la sección de "lo que MESH no
  hace" incluida a propósito.
- `artist-walkthrough.md` — el procedimiento de recorrida, campo por campo.

**Un hallazgo de la auditoría que cambió el plan de retroceso:** despublicar a
un artista oculta sus filas al instante pero **no** sus imágenes, porque el
bucket de portfolio es de lectura pública. Borrar los objetos es un paso
obligatorio del retiro, no una limpieza posterior.

**Una decisión de producto:** no va a haber video de vista previa en V1. Un
video de una app que todavía no se probó con nadie promete más de lo que
sabemos.

### El ensayo del camino de producción (2026-08-19)

Antes de que llegue el contenido real, **corrí el camino de producción** para
que el día que lleguen las fotos cargar sea un comando y no una tarde de
sorpresas. Encontró tres defectos, y los tres son de los que solo existen con
contenido real — por eso meses de construir con fixtures no los tocaron.

1. **El camino estaba inusable.** `--target production` abortaba ante el primer
   fixture, y los diez fixtures viven en este repositorio y van a seguir acá.
   Cargar a la primera artista real habría exigido borrarlos. Ahora se saltean
   y se nombran uno por uno.
2. **`--publish` publicaba todo lo cargado.** Alguien despublicado a mano
   —porque pidió salir unos días— volvía a aparecer en la siguiente corrida.
   Ahora existe `--only <slug>`, y la documentación lo trata como el guard que
   es, no como una comodidad.
3. **Cargar despublicaba.** `is_published` se escribía en `false` en cada
   corrida, así que corregir una bio sacaba a la persona de la app en silencio
   — que es exactamente lo que `rollback.md` caso 2 promete resolver en una
   hora. Ahora solo se escribe en el alta.

El tercero se descubrió mirando un número que no cerraba: después de cargar de
a un artista quedaban nueve publicados de diez.

Lo que el ensayo **no** puede reemplazar: fotos reales. El EXIF, la
orientación y los tamaños ya están cubiertos y testeados, pero recién con las
fotos de alguien se ve cómo se recorta su obra en la grilla.

### Los dos bloqueantes

1. **La recorrida con los artistas no se puede hacer**: no hay artistas reales,
   solo los tres fixtures sintéticos. Conseguirlos requiere hablar con personas
   y obtener su consentimiento, que no es algo que se resuelva desde acá.
2. **Las capturas de tienda no se pueden sacar**, y tampoco habría que
   fabricarlas: una captura con fixtures muestra una insignia de prueba sobre
   imágenes abstractas. Se sacan con contenido real, después de la recorrida.

Los dos dependen de la misma cosa, y esa cosa es tuya.

### Entrar con Google (2026-08-20)

Dar de alta un perfil desde la app solo sirve si **queda guardado**, y queda
guardado en una cuenta. Hasta acá la única forma de tener cuenta era elegir una
contraseña de diez caracteres — justo después de subir seis fotos, que es
exactamente donde alguien abandona.

Ahora hay un botón de Google arriba del formulario, y la decisión que lo
gobierna está en [ADR-015](../decisions/ADR-015-social-sign-in.md): **con sesión
anónima se vincula la identidad, no se abre un usuario nuevo.** Elegir mal ahí
no falla ni tira error: deja el perfil de artista recién cargado en un usuario
al que nadie va a volver a entrar. Es el mismo riesgo que ADR-002 evitó para el
correo, y no se ve en ninguna pantalla — por eso la decisión es una función
pura con nombre propio y su test es el primero del archivo.

**Corre en Expo Go**, sin build propio, porque las credenciales de Google viven
en Supabase y Google nunca ve la URL de la app.

**Y mirarlo en el preview encontró el defecto que importaba:** no había ninguna
forma de llegar a crear cuenta. Las rutas existían, los tests pasaban, el flujo
de correo cerraba contra la base — y desde la app no se podía registrar nadie,
porque ninguna pantalla navegaba a `/cuenta`. Ahora la cuenta vive en Perfil.
Con eso a la vista se cayó también el texto de la invitación, que prometía
guardar "tu gusto y tus guardados": el gusto se sacó con D-010 y los guardados
nunca se construyeron.

Lo que falta, y no se puede hacer desde acá:

1. **Las credenciales.** Un client ID de tipo "aplicación web" en Google Cloud
   —uno solo, no hacen falta los de iOS ni Android— y pegarlo en Supabase. El
   paso a paso está en [sso-setup.md](../launch/sso-setup.md).
2. **Sign in with Apple.** La guideline 4.8 de Apple la exige junto a cualquier
   otro ingreso social, así que ofrecer Google la vuelve obligatoria para
   publicar en iOS. Necesita un build propio: no corre en Expo Go. Es el
   próximo paso de esta línea, y es el costo que ADR-002 había anticipado.

### El enlace que no llevaba a ningún lado (2026-08-20)

Con crear cuenta ya alcanzable, quedó a la vista la otra mitad rota:
**"olvidé mi contraseña" terminaba en la nada.** `resetPasswordForEmail`
mandaba a `mesh://auth/callback`, esa ruta no existía, y el enlace del correo
caía en "Unmatched Route". Quien se registró con correo y se olvidó la
contraseña quedaba afuera de su cuenta para siempre, con su perfil de artista
adentro. Era un problema teórico mientras registrarse era imposible; dejó de
serlo el día anterior.

Antes de escribir la ruta medí contra una instancia local qué trae de verdad el
enlace, porque la documentación describe otro camino (`token_hash`). Lo que
llega es `mesh://auth/callback?code=<uuid>` y **nada más**: no dice
`type=recovery`. La única señal de que el enlace era una recuperación —y no un
ingreso cualquiera— es el evento `PASSWORD_RECOVERY`, que el canje emite *antes*
de resolver. De ahí la forma de `completeCallback()`: se escucha alrededor del
canje, y hay un test que falla si el listener se registra después.

Dos cosas más que salieron de medir en vez de suponer:

1. **El enlace solo sirve en el teléfono que lo pidió.** El `code_verifier` de
   PKCE no viaja. Abrir el correo en la computadora falla con un mensaje en
   inglés sobre un "code verifier" que no le dice nada a nadie, así que ese
   caso tiene su propio texto.
2. **El correo apuntaba a `mesh://` escrito a mano**, y en Expo Go ese esquema
   no existe: durante todo el desarrollo el enlace no llevaba a ningún lado.
   Ahora sale de `redirectUri()`, igual que el de Google.
