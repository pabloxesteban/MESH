# MESH — Modelo de amenazas

**Estado:** Propuesto · **Responsable:** security-reviewer
**Método:** guiado por activos, informado por STRIDE. Se revisa en cada release check.

---

## Activos, ordenados por lo que cuesta perderlos

| # | Activo | Por qué importa |
|---|---|---|
| A1 | Datos de contacto y consentimiento de los artistas | El número de teléfono de una persona real. El mal uso termina relaciones y termina el producto. |
| A2 | Vectores de gusto y trabajos guardados de los usuarios | La preferencia estética es personal; una idea de tatuaje puede ser íntima. |
| A3 | Briefs de proyecto e imágenes de referencia | Texto libre y fotos que la persona eligió compartir con *nosotros*, no con el mundo. |
| A4 | Credenciales / sesiones de cuenta | Puerta de entrada a A2 y A3. |
| A5 | Media de portfolio de los artistas | Derechos de autor de terceros que tenemos en custodia. |
| A6 | Service-role key | Compromiso total de todo lo anterior. |
| A7 | Integridad de producto (matches honestos) | Lo único que MESH vende. |

---

## T1 — Toma de control de cuenta

**Vectores:** credential stuffing, link de recuperación por phishing, dispositivo
robado con sesión desbloqueada, token de sesión leído de un almacenamiento
inseguro.

**Mitigaciones:** Supabase Auth (nada de manejo casero de contraseñas); tokens
solo en `expo-secure-store`; los links de recuperación son de un solo uso, de
vida corta, y aterrizan en una ruta dedicada; cerrar sesión limpia el caché y
todos los datos locales de usuario; límites de tasa del proveedor en ingreso y
recuperación.

**Residual:** un dispositivo robado desbloqueado. Aceptado para V1 — no hay PIN
a nivel app, que sería teatro de seguridad al lado del bloqueo del sistema
operativo. Revisitar si se lanza mensajería in-app.

**Se detecta como:** ingresos fallidos repetidos, volumen inusual de pedidos de
recuperación.

---

## T2 — Escalada horizontal de privilegios (leer datos de otra persona)

**El riesgo principal de esta arquitectura.** Los datos de cada pantalla los pide
un cliente que se puede modificar para pedir cualquier cosa.

**Vectores:** sacar un `.eq('user_id', …)` del lado del cliente; adivinar UUIDs;
llamar a PostgREST directamente con la anon key; una función `SECURITY DEFINER`
que confía en un parámetro.

**Mitigaciones:**
- La autorización vive enteramente en RLS, nunca en los filtros del cliente. Un
  filtro faltante en el cliente es un bug de corrección, no de seguridad.
- Todos los predicados de propiedad usan `auth.uid()`; ninguna política acepta un
  id de usuario de quien llama.
- `SECURITY DEFINER` se usa solo donde es genuinamente necesario, con
  `set search_path = ''`, nombres completamente calificados y sin interpolación
  de identificadores controlados por el usuario.
- Tests de integración cruzados: para cada tabla de propiedad de usuario, el
  usuario B intenta SELECT / UPDATE / DELETE sobre las filas de A con un JWT
  real y tiene que obtener cero filas o un error de política.
- El CI falla si alguna tabla de `public` no tiene RLS habilitado, RLS forzado y
  ≥1 política.

**Residual:** una política presente pero equivocada. Se aborda escribiendo la
suite de tests contra la *intención* del mapa de políticas, no releyendo el SQL.

---

## T3 — Modificación no autorizada de perfiles

**Vector:** cuando los artistas puedan reclamar perfiles, alguien reclama o edita
un profesional que no le pertenece; o un perfil curado
(`owner_user_id IS NULL`) es secuestrado escribiendo `owner_user_id =
auth.uid()`.

**Mitigaciones:** la política de UPDATE exige `owner_user_id = auth.uid()` en
**ambos**, `using` y `with check`, para que una fila no pueda ser actualizada
*hacia* tu propiedad. `owner_user_id` no es escribible por el cliente en
absoluto; el reclamo va a pasar por un flujo del lado del servidor con
verificación. El INSERT sobre `professionals` está denegado a los clientes por
completo.

**Estado en V1:** no existe el reclamo; la superficie está cerrada. Se documenta
ahora para que después no se construya de forma insegura.

---

## T4 — Subida de archivos maliciosos

**Vectores:** SVG o HTML con contenido de script; archivos polyglot; bombas de
descompresión; traversal de rutas vía un nombre de archivo fabricado; agotamiento
de storage.

**Mitigaciones:** lista blanca de MIME a nivel bucket que excluye SVG; tope de
12 MB; nombres UUID generados por el servidor (la entrada del usuario nunca llega
a una ruta); content-type explícito en la subida; recodificación al ingresar, que
neutraliza polyglots y elimina EXIF/GPS; cuotas por usuario y por proyecto;
bucket privado con política de ruta acotada al dueño.

**Residual:** una vulnerabilidad en el decodificador de imágenes del sistema
operativo. Fuera de nuestro control; recodificar del lado del servidor antes de
mostrar reduce la exposición.

---

## T5 — Filtración de credenciales y secretos

**Vectores:** service-role key commiteada, logueada o incluida en el bundle; la
anon key confundida con un secreto y "protegida" mientras el secreto real queda
expuesto; una captura de pantalla de una terminal.

**Mitigaciones:** `.env*` en gitignore; escaneo de secretos en el repositorio; el
CI busca `service_role` en el bundle compilado; la herramienta de seed se niega a
correr en un contexto de Metro; solo las variables con prefijo `EXPO_PUBLIC_` son
legibles desde el código de la app; documentado explícitamente que la anon key
*está pensada* para ser pública y que lo que protege los datos es RLS.

**Radio de explosión si se filtra la service-role key:** total — lectura y
escritura de todas las filas, salteando RLS. Respuesta: rotarla de inmediato en
el panel de Supabase, rotar la contraseña de la base, auditar `audit_events` y
los logs de Postgres, forzar un re-seed desde los archivos de contenido, y
notificar a los artistas afectados si los datos de contacto eran legibles.

---

## T6 — Abuso de API y scraping

**Vectores:** enumerar el catálogo para juntar teléfonos de artistas; creación
masiva de cuentas anónimas; inundación de interacciones o analytics; ataque de
costo de egreso vía descargas repetidas de media.

**Mitigaciones:** límites de tasa en el ingreso anónimo y en el gateway REST;
restricciones UNIQUE que acotan el volumen de interacciones; cuotas de proyectos
y subidas del lado del servidor; analytics solo de inserción; las PK UUID
impiden la enumeración secuencial; los tamaños derivados hacen que el activo más
pesado no sea el que se descarga por defecto.

**Residual aceptado:** alguien decidido puede recolectar 12 perfiles públicos de
artistas. Esos artistas consintieron aparecer públicamente y ser contactables; el
control es el consentimiento, no la oscuridad. Se reevalúa cuando el catálogo se
vuelva un activo que valga la pena robar.

---

## T7 — Abuso de deep links

**Vectores:** links `mesh://` desde una página o un mensaje malicioso; un link
que lleva un código de auth interceptado por otra app que registró el mismo
esquema; un link que ejecuta una mutación; un link usado para sondear si un
recurso existe.

**Mitigaciones:** todo parámetro validado (UUID / patrón de slug) antes de
usarse; los links nunca mutan estado; los destinos no autorizados e inexistentes
resuelven a la misma pantalla de no encontrado; los callbacks de auth confinados
a `mesh://auth/callback` con PKCE; universal/app links configurados sobre el
dominio real cuando exista, para que el sistema operativo asocie el esquema a
nosotros.

---

## T8 — Inyección

**Vectores:** inyección SQL a través de un término de búsqueda o un RPC dinámico;
inyección JSONB en `props` o `components`; payloads con forma de XSS en bios de
artistas o texto de proyectos.

**Mitigaciones:** PostgREST y supabase-js parametrizan todo; sin concatenación de
strings en SQL en ningún lado, incluidos los RPCs; las funciones `SECURITY
DEFINER` usan `set search_path = ''`; React Native renderiza texto como texto,
así que el marcado en una bio es inerte; ningún WebView renderiza contenido de
usuario en V1; límites de longitud en todas las columnas de texto libre.

---

## T9 — Salida deshonesta (integridad de producto)

Clasificado como preocupación de seguridad porque es la falla que realmente
mataría a MESH.

**Vectores:** una razón de match que no corresponde a un término de puntaje; una
reseña, disponibilidad o precio inventados; un mensaje de WhatsApp precargado con
detalles que la persona nunca proveyó; disponibilidad vieja presentada como
actual.

**Mitigaciones:** las razones se derivan solo de componentes con aporte medido
por encima del umbral, desde un conjunto cerrado de plantillas; la
disponibilidad vieja se omite del puntaje y de la visualización; el mensaje de
contacto se arma con estado que la persona posee y se muestra para editar antes
de enviarse; no existe ninguna tabla donde guardar una reseña inventada; los
fixtures están marcados en la base y bloqueados en la carga a producción.

**Test:** la suite de matching verifica que una razón nunca pueda referenciar un
componente omitido, y la suite de contacto verifica que el mensaje compuesto no
contenga ningún campo que la persona no haya provisto.

---

## T10 — Derechos de terceros y privacidad de otras personas

**Vectores:** publicar una imagen de portfolio sin consentimiento del artista;
publicar una foto que identifica a un cliente; conservar los datos de un artista
después de que se retira.

**Mitigaciones:** registro de consentimiento requerido por el validador del seed
— sin consentimiento, no hay inserción; las imágenes que identifican al cliente
se excluyen salvo confirmación; el retiro se atiende dentro de un día hábil con
filas y objetos de storage eliminados; el scraping está prohibido por política y
por el hecho de que toda la ingesta pasa por archivos de contenido revisados.

---

## Fuera de alcance para V1

Fraude de pagos (no hay pagos). Acoso y moderación in-app (no hay mensajería
in-app). Roles de administración multi-tenant (no hay superficie de
administración). DDoS (asunto del proveedor a esta escala). Adversarios
estatales.

## Cadencia de revisión

Este documento se revisa en cada release check y cada vez que: se agrega una
tabla, se agrega un camino de subida, cambia la autenticación, se agrega un deep
link, o se introduce una integración externa.
