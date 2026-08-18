# Investigación de interacción — revelación de match y el lugar del swipe

Investigado 2026-08-18.

## La industria de citas se está alejando del swipe, no acercando

**Patrón.** El pedido original de investigar "el reveal de match, evitando lo
de Tinder" asumía que había que diseñar una alternativa mejor al patrón de
Tinder. La investigación encontró algo más fuerte: **la propia categoría de
apps de citas está abandonando el swipe como mecánica central.** Bumble sacó
el swipe de su producto en 2026 a favor de un asistente que entrevista y
recomienda directamente. Hinge, que nunca usó swipe, es la historia de
crecimiento del grupo. Tinder está probando un modo sin swipe basado en el
rollo de cámara. [9 Tinder Alternatives 2026](https://appmakersla.com/blog/popular-apps/tinder-alternatives/),
[Build a Dating App Like Tinder 2026](https://primocys.com/blog/build-dating-app-like-tinder-2026/).
Nivel 3, pero la dirección aparece en fuentes independientes y coincide con
decisiones de producto reales y verificables (Bumble, Hinge, Tinder son
compañías públicas con esas features documentadas en sus propios anuncios).

**Por qué importa para MESH.** Confirma algo que MESH ya decidió sin esta
investigación: el swipe es una entrada, no la identidad del producto — es
exactamente la posición de `product-critic` §6 ("El swipe es un método de
entrada. Si el layout, el color, el copy o el registro emocional toman
prestado de las apps de citas, rechazalo"). Esta investigación no cambia esa
regla, la refuerza con evidencia externa.

**La contrapartida que hay que marcar con cuidado.** El reemplazo que eligió la
industria es "matching dirigido por IA" — un asistente que entrevista y
recomienda. **MESH no puede seguir ese camino**, y no por preferencia de
diseño: `CLAUDE.md` prohíbe ML/LLM en el camino de recomendación de forma
innegociable. Esto significa que MESH no puede copiar la solución de la
industria (IA conversacional) ni quedarse con el problema que esa industria
dejó atrás (swipe como mecánica central). Tiene que resolver el mismo problema
—reducir la sensación de "barajar fotos"— con una función determinística y
explicable. Ver `docs/research/decisions/no-ai-matching.md`.

**Aplicación a MESH.** El vector de gusto y el motor de matching de
`packages/domain` ya son la respuesta correcta a "no barajar fotos al azar":
son recomendación real, sin ser IA. Lo que falta no es el motor, es que la
*interfaz* lo comunique — que la persona sienta que MESH "entendió" su gusto
sin que eso implique una conversación con un asistente. Es exactamente el
argumento a favor de la pantalla de Gusto (`TasteScreen`) como un momento con
peso propio, ya construida y con degradado de marca.

**Recomendación.** Usar el hallazgo como refuerzo de una decisión ya tomada,
no como una feature nueva. **Confianza.** Alta en la dirección de la
industria; la traducción a MESH depende de la restricción de `CLAUDE.md`, que
no es negociable.

---

## Qué reemplaza al "¡ES UN MATCH!"

**Patrón.** El "reveal" de Tinder es una pantalla completa que interrumpe con
confeti, dos fotos superpuestas, y una frase en mayúsculas — diseñado para
producir una descarga de dopamina inmediata, no para transmitir información.

**Por qué falla para MESH.** MESH ya tiene una pantalla de matches
(`MatchesScreen.tsx`) que hace lo contrario a propósito: la banda de encaje
(fuerte/bueno/posible) usa el color de marca hacia el neutro, **no** un
semáforo verde/rojo — el comentario en el código lo dice explícitamente: "un
encaje posible no es un error ni una advertencia". Esto ya está construido
correctamente y no hay que rediseñarlo.

**Lo que sí falta y vale investigar en un ciclo futuro:** el momento en que
*aparece* un match nuevo — hoy la persona simplemente ve la lista actualizada
la próxima vez que abre la pestaña. Un ciclo de investigación futuro (marcado
como pendiente en `MESH-UX-STRATEGY.md`) debería mirar cómo comunican
"encontramos algo nuevo" productos editoriales (no de citas) sin usar una
notificación carnada — que `CLAUDE.md` prohíbe explícitamente.

**Recomendación.** Lo que existe (la pantalla de matches sin semáforo) —
Usar, ya construido. El momento de aparición de un match nuevo — pendiente de
investigar, no inventar sin evidencia. **Confianza.** Alta para lo primero,
sin evaluar para lo segundo.
