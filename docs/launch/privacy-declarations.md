# Declaraciones de privacidad para las tiendas

**Derivadas del código, no escritas de memoria.** Cada respuesta remite a la
tabla o al evento concreto que la justifica. Si mañana se agrega un dato, este
documento tiene que cambiar en el mismo commit — una declaración desactualizada
es una declaración falsa, y en las tiendas eso tiene consecuencias.

Fuentes: `docs/product/metrics.md` §4–5, `docs/architecture/data-model.md`,
`apps/mobile/src/analytics/events.ts`.

---

## App Store — Privacy Nutrition Labels

### Datos vinculados a la persona

| Categoría | ¿Se recolecta? | Uso | Dónde vive |
|---|---|---|---|
| Correo electrónico | **Sí, opcional** | Autenticación de la cuenta | `auth.users`. Nunca se copia a `profiles`, para que el cliente no pueda leerlo |
| ID de usuario | **Sí** | Funcionalidad de la app, analytics | `auth.uid()`. Puede ser un id anónimo |
| Fotos | **Sí, opcional** | Contenido subido por la persona | Bucket `references`, privado, servido con URLs firmadas de vida corta |
| Contenido de usuario (texto) | **Sí, opcional** | Título y descripción de proyecto | `projects`. **Nunca sale en analytics** |
| Historial de uso | **Sí** | Analytics de producto | `analytics_events`. Solo conteos, enums, booleanos e ids |
| Preferencias | **Sí** | Recomendaciones | `interactions` y `taste_profiles` |

### Datos NO recolectados

Cada uno es una decisión, no un olvido:

- **Ubicación.** Sin GPS. Lo único que se guarda es la ciudad que la persona
  eligió de una lista, y las coordenadas de las fotos de referencia **se borran
  al recodificar antes de subirlas**, con un test que lo verifica.
- **Contactos, calendario, salud, finanzas.** No se piden permisos.
- **Identificadores de publicidad.** Sin IDFA, sin AAID, sin SDK de terceros.
- **Datos de navegación fuera de MESH.** Sin tracking entre apps.
- **Historial de búsqueda.** `search_performed` lleva `filter_count`, un número.
  El texto no se guarda en ningún lado.
- **Diagnósticos con contenido.** `error_shown` lleva `surface` y `error_code`,
  los dos enums. Nunca el mensaje.

### Seguimiento (App Tracking Transparency)

**No se hace seguimiento.** No hay SDK de terceros, no se comparte nada con
data brokers, no hay publicidad. **No corresponde mostrar el prompt de ATT**, y
mostrarlo sin necesidad sería pedir un permiso que no usamos.

---

## Google Play — Formulario de Data Safety

### ¿Se recolectan datos? Sí. ¿Se comparten con terceros? **No.**

Supabase es nuestro procesador de datos, no un tercero con quien compartimos:
corre nuestra base, bajo nuestro control, sin usar los datos para nada propio.

| Tipo | Recolectado | Opcional | Propósito |
|---|---|---|---|
| Correo | Sí | Sí | Gestión de la cuenta |
| Fotos | Sí | Sí | Funcionalidad de la app |
| Otro contenido de usuario | Sí | Sí | Funcionalidad de la app |
| Acciones dentro de la app | Sí | **Sí — se puede apagar** | Analytics |
| IDs del dispositivo o de la cuenta | Sí (id de cuenta) | No | Funcionalidad de la app |

### Prácticas de seguridad

- **En tránsito:** HTTPS en todo. Sin excepciones de ATS ni cleartext.
- **En reposo:** cifrado del proveedor. Los tokens de sesión en Keychain /
  Keystore, nunca en el almacenamiento común.
- **Eliminación:** hay un camino en la app para borrar el gusto, y borrar la
  cuenta arrastra en cascada interacciones, proyectos, media, matches y eventos
  de analytics. Ver §9 del modelo de seguridad.
- **Revisión independiente:** todavía no. Decirlo es más útil que insinuar que
  sí.

---

## Lo que hay que rehacer antes de enviar

- [ ] Volver a leer este documento contra `analytics/events.ts`. Si aparece un
      evento nuevo, la declaración cambia.
- [ ] Confirmar que el proyecto de Supabase de producción tiene el cifrado en
      reposo activado.
- [ ] Publicar la política de privacidad en una URL estable —las dos tiendas la
      exigen— desde `privacy-policy.md`.
- [ ] Verificar que el build de release no incluya ningún SDK que agregue
      recolección por su cuenta. Hoy no hay ninguno.
