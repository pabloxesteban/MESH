# MESH — acuerdo de trabajo

Leé esto antes de cambiar nada. Es corto a propósito.

## Qué es MESH

MESH ayuda a la gente a descubrir a la persona indicada para hacer realidad una
idea. Muestra **quién trabaja cerca tuyo**, con una muestra de su obra, y
**toda la obra que hay** para buscar ideas. V1: tatuadores, Buenos Aires /
CABA, sin reservas, sin pagos. El catálogo arranca con 8–15 artistas reales
curados desde `content/artists/`, y **desde la app cualquier artista puede darse
de alta solo** — ver [ADR-013](docs/decisions/ADR-013-artist-self-signup.md),
que documenta qué se pierde al abrirlo y cómo se vuelve a cerrar. El contacto
va por chat propio con los artistas que tienen su perfil reclamado o creado, y
por WhatsApp/Instagram con el resto.

MESH **no** desliza obra para aprender tu gusto ni puntúa encajes: eso existió y
se sacó. Los motores de gusto y matching siguen en `packages/domain`,
versionados y con sus tests, pero hoy **ninguna pantalla de quien busca los
ejecuta** — ver [D-010](docs/design/MESH-DESIGN-DECISIONS.md). Volver a
enchufarlos es una decisión de producto, y se escribe antes de codearla.

## Innegociables

1. **Explicable antes que ingenioso.** Nada de ML ni LLM en el camino de
   *recomendación*: la función de matching —qué se puntúa, en qué orden se
   muestra, qué razón se da— es determinística, versionada y con tests
   unitarios. Excepción única y acotada: interpretar una entrada ambigua que
   la propia persona subió (hoy, clasificar la foto de referencia de "buscar
   por fotos" contra la taxonomía real de estilos) puede usar un modelo,
   siempre con vocabulario cerrado — nunca texto libre, nunca un slug
   inventado — y siempre corriendo del lado del servidor. El resultado de esa
   clasificación entra al motor de matching como un dato más; el motor en sí
   nunca deja de ser puro. Ver [ADR-011](docs/decisions/ADR-011-photo-classification.md).
2. **Nunca inventar.** Nada de reseñas, testimonios, disponibilidad, precios,
   estadísticas de reservas ni razones de match inventadas. Una razón solo se
   puede mostrar si el término que describe efectivamente aportó al puntaje.
3. **Nada de dark patterns.** Ni rachas, ni puntos, ni niveles, ni escasez o
   urgencia falsas, ni límites artificiales, ni notificaciones carnada. Nunca.
4. **RLS en todas las tablas.** Habilitado *y* forzado, con políticas
   explícitas. Agregar una tabla sin políticas rompe el CI.
5. **La service-role key nunca toca el cliente.** Existe solo en `tools/seed` y
   en funciones del lado del servidor.
6. **El swipe nunca es la única forma.** Todo gesto tiene un botón equivalente
   con etiqueta accesible y área táctil de ≥44pt.
7. **El núcleo es agnóstico de categoría.** Nada de columnas, tipos o props
   `tattoo_*` en las entidades centrales. Usá Category / Style / Professional /
   PortfolioItem / Project.
8. **Tokens, no hex.** Nada de colores, espaciados, radios o duraciones crudos
   dentro de las pantallas. Importalos del design system.
9. **Español primero.** El mercado es CABA. Todo string de cara al usuario pasa
   por i18n con `es-AR` como locale de origen.

## Idioma del proyecto

- **Documentación, comentarios y comunicación: español rioplatense** (voseo).
  `docs/`, `.claude/`, mensajes de commit, descripciones de PR.
- **Código: inglés.** Nombres de tablas, columnas, enums, funciones, variables,
  tokens de diseño, slugs de taxonomía, rutas de archivos, nombres de eventos
  de analytics e identificadores de agentes y skills.
- **Strings de UI: `es-AR` como origen**, con `en` como traducción. Nunca al
  revés.

Los slugs (`fine-line`, `blackwork`) son estables y no se traducen nunca; lo
que se traduce es el nombre para mostrar, vía clave de i18n.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| Pantallas, componentes, design system | `apps/mobile/src/` |
| Motores de gusto y matching, taxonomía, tipos, esquemas Zod | `packages/domain/src/` |
| CLI de carga de contenido (service role) | `tools/seed/` |
| Migraciones SQL y políticas RLS | `supabase/migrations/` |
| Edge Functions (única IA del producto) | `supabase/functions/` |
| Tests de base de datos (pgTAP) | `supabase/tests/` |
| Archivos de contenido de artistas | `content/artists/` |
| Decisiones | `docs/decisions/` |

La lógica pura va en `packages/domain` para poder testearla sin simulador y
reutilizarla desde el seeder. Si importa algo de `react-native`, no va ahí.

## Las cuatro pestañas

La app abre en **Inicio**. Cuatro y ninguna más — con seis, la barra pasa a ser
un menú que hay que estudiar en vez de un lugar donde la mano ya sabe ir.

**Pero no las mismas cuatro para todos.** MESH tiene dos lados, y la barra
depende de a qué vino la persona. Ver
[ADR-014](docs/decisions/ADR-014-two-sided.md).

| | Busca a alguien | Ofrece un servicio |
|---|---|---|
| **Inicio** | La grilla de artistas: un carrusel chico de la obra de cada uno y, debajo, nombre, foto y ubicación. Contesta *quién tatúa cerca mío*. Arriba dice desde dónde se mide y se cambia — GPS, un barrio, o nada ([D-012](docs/design/MESH-DESIGN-DECISIONS.md)). Ordena por cercanía, **nunca filtra por ella**. | El mazo de búsquedas de gente. Un tatuador no quiere deslizar obra de otros tatuadores. |
| **Segunda** | **Explorar**: toda la obra de todos los que se registraron, cerca o lejos. Contesta *qué me quiero tatuar*. Buscar por fotos con IA se entra desde acá — ver [ADR-011](docs/decisions/ADR-011-photo-classification.md). | **Estudio**: tu perfil, tus estilos, tu ubicación, tu obra. |
| **Tercera** | **Chats** | **Chats**: nada más. MESH no le recomienda tatuadores a un tatuador. |
| **Cuarta** | **Perfil** | **Perfil** |

Ni Inicio ni Explorar terminan en una obra: **las dos terminan en una persona**,
y esa persona está a un mensaje. Una grilla que se pueda recorrer sin llegar
nunca a alguien sería otra app.

Al registrarse se pregunta una sola vez si la persona ofrece un servicio o está
buscando. Es una preferencia de arranque, **no** un rol excluyente, y se cambia
desde Perfil: una elección de la primera pantalla que no se puede deshacer no
es una preferencia, es una trampa. Elegir "ofrezco" lleva al estudio, donde se
crea el perfil propio o se canjea el código si MESH armó uno; la pregunta por sí
sola no da de alta a nadie.

El estudio no es una pestaña para quien busca: se visita cada tanto, no cada
sesión, y se llega desde Perfil.

**Una búsqueda es privada salvo que su dueña la abra.** Las fotos de referencia
que alguien sube son suyas; que un tatuador las vea es una decisión explícita,
con un interruptor apagado por default. Y un artista nunca escribe primero:
manda interés, y el chat lo abre la persona. Ver
[ADR-012](docs/decisions/ADR-012-chat.md) y
[ADR-014](docs/decisions/ADR-014-two-sided.md).

## Antes de cambiar algo

- **Cambio de esquema** → seguí `.claude/workflows/database-change.md`. Una
  tabla nueva sin políticas RLS y sin test de acceso cruzado entre usuarios no
  está terminada.
- **Feature nueva** → seguí `.claude/workflows/new-feature.md`. Empezá
  preguntando si sirve a DESCUBRIMIENTO, GUSTO, MATCHING, CONFIANZA o ACCIÓN.
  Si no sirve a ninguno, no lo construyas.
- **Cambio de matching** → subí `MATCHING_VERSION`, actualizá
  `docs/product/matching.md`, actualizá los fixtures. Nunca cambies pesos sin
  actualizar la justificación documentada.
- **Decisión arquitectónica** → escribí un ADR en `docs/decisions/`.

## Definición de terminado

Que el código funcione no es estar terminado. Terminado es: la implementación
funciona, los tipos pasan, el lint pasa, los tests pasan, se revisó seguridad,
existen los estados de carga / vacío / error, se consideró accesibilidad, la
documentación está actualizada, no hay regresiones.

## Destino de push

El desarrollo sucede en `claude/mesh-v1-spec-7m86k7` salvo indicación contraria.
