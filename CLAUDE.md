# MESH — acuerdo de trabajo

Leé esto antes de cambiar nada. Es corto a propósito.

## Qué es MESH

MESH ayuda a la gente a descubrir a la persona indicada para hacer realidad una
idea. Aprende el gusto visual a partir de decisiones de me gusta / guardar /
paso y recomienda profesionales, con una explicación. V1: tatuadores, Buenos
Aires / CABA, 8–15 artistas reales curados, sin reservas, sin pagos, contacto
por WhatsApp/Instagram.

## Innegociables

1. **Explicable antes que ingenioso.** Nada de ML ni LLM en el camino de
   recomendación. La función de matching es determinística, versionada y con
   tests unitarios.
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
| Archivos de contenido de artistas | `content/artists/` |
| Decisiones | `docs/decisions/` |

La lógica pura va en `packages/domain` para poder testearla sin simulador y
reutilizarla desde el seeder. Si importa algo de `react-native`, no va ahí.

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
