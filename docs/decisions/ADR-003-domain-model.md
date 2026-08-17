# ADR-003 — Simplificaciones del modelo de dominio

**Estado:** Propuesto · **Fecha:** 2026-08-17 · **Responsable:** product-architect

## Contexto

El brief enumera entidades que incluyen `Professional` **y**
`ProfessionalProfile`, `SavedItem`, `Conversation`, `Message`, `Review` y
`Availability`. También exige que el núcleo se mantenga agnóstico de categoría y
que `User`, `Professional` y el perfil estén correctamente distinguidos porque
los roles no son excluyentes.

## Problema

¿Cuáles de estas entidades existen en V1, y cuáles son estructura sin un
comportamiento que la justifique?

## Decisión

| Entidad | V1 |
|---|---|
| `User` (como `profiles`) | ✅ |
| `Professional` | ✅ — una sola tabla, `owner_user_id` nullable |
| `ProfessionalProfile` | ❌ fusionada en `professionals` |
| `Category`, `Style`, `ProfessionalStyle` | ✅ |
| `PortfolioItem`, `PortfolioItemStyle` | ✅ |
| `Interaction` | ✅ — fila de estado actual, no log de eventos |
| `SavedItem` | ❌ — `interactions.is_saved` |
| `TasteProfile` | ✅ |
| `Project`, `ProjectStyle` | ✅ (+ `project_references`) |
| `Match` | ✅ |
| `Location` | ✅ |
| `Availability` | ❌ — dos columnas en `professionals` |
| `Conversation`, `Message` | ❌ postergadas |
| `Review` | ❌ postergada |
| `AuditEvent` | ✅ |

## Por qué

**Professional / ProfessionalProfile.** La separación que el brief realmente
argumenta es *un usuario no es un profesional, y ninguno de los dos roles excluye
al otro*. Eso se conserva: `professionals.owner_user_id` es nullable (los
artistas curados no tienen cuenta), y ser profesional es una fila en otra tabla,
nunca una bandera en `profiles`. Partir `professionals` en dos tablas 1:1 agrega
un join a cada consulta de catálogo, un segundo juego de políticas RLS, y un modo
de falla de "falta la fila de perfil" — sin ninguna diferencia de comportamiento.
Si algún día un profesional necesita muchos perfiles (uno por categoría), eso es
un 1:N real y lo agregamos entonces, con una migración mecánica.

**SavedItem.** Guardar es una propiedad de una interacción, no un evento aparte.
Dos tablas representando un mismo hecho se van a contradecir, y el motor de gusto
tendría que reconciliarlas. `interactions.is_saved`, con una restricción CHECK
que prohíbe `saved + pass`, es una única fuente de verdad.

**Availability como tabla.** Un calendario implica que los artistas lo
mantengan. En V1 no lo van a hacer. Un calendario desactualizado es activamente
peor que ningún calendario — hace que MESH mienta. Dos columnas
(`availability_status`, `availability_updated_at`) con una regla de frescura de
45 días, impuesta tanto en el motor de matching como en el componente
`AvailabilityPill`, nos dejan decir solo lo que podemos sostener.

**Conversations y Messages.** §17 del brief pone el contacto de V1 en WhatsApp e
Instagram. Construir un subsistema de mensajería en paralelo significa publicar
una superficie sin uso más su carga de moderación, notificaciones, bloqueo y
abuso. Además parte el registro de la conversación en dos lugares. Postergar
hasta que haya evidencia de que la gente quiere salir de WhatsApp.

**Reviews.** Con ~12 artistas y sin transacciones, una superficie de reseñas
renderiza vacía o inventada. Las dos cuestan más confianza que la ausencia. Y un
sistema de reseñas sin transacciones verificadas es un sistema para reseñar
desconocidos, que es un problema de moderación que todavía no nos ganamos.

## Consecuencias

- Agregar mensajería más adelante implica tablas y políticas nuevas — pero
  ningún cambio en las existentes. Los eventos de contacto ya registran
  `channel`, así que vamos a tener datos sobre si la gente siquiera lo quiere.
- Agregar reseñas más adelante requiere un concepto de interacción verificada,
  que necesitaríamos de todos modos.
- La tabla `professionals` es ancha. Aceptable; se lee como una unidad en la
  pantalla de perfil.
- `interactions` como estado actual implica perder el historial de un cambio de
  opinión. Aceptado: el gusto es sobre la preferencia actual, y un log de solo
  agregado haría que el gusto dependa del orden de reproducción.
