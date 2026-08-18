# Investigación de movimiento — lo que ya existe, y lo que falta

Investigado 2026-08-18.

## MESH ya tiene un sistema de movimiento y hápticos disciplinado

Antes de investigar nada nuevo, hay que decir esto con precisión: el pedido
original (§31–§33) pide crear un "lenguaje de movimiento" y un "lenguaje
háptico" centralizados como si no existieran. **Ya existen**, en
`apps/mobile/src/design-system/tokens/motion.ts` y `tokens/haptics.ts`, y son
más estrictos que lo que el pedido original especifica:

| Lo que pide el prompt | Lo que ya hay |
|---|---|
| `durationShort/Medium/Long` | `duration.instant/quick/standard/reveal` — con techo de 500ms **impuesto por test**, no por convención |
| `springSoft/Standard/Expressive` | `spring.standard` y `spring.deck`, cada uno con `damping`/`stiffness`/`mass` documentados y con motivo |
| Hápticos "semánticos" | `HapticIntent`: `like/save/match/destructive/error/none`, con la regla explícita de que pasar NUNCA lleva háptico (documentada como intencional, no como omisión) |
| "Every animation must answer: what does this movement communicate?" | Ya es el criterio documentado en el comentario de cabecera de `motion.ts`: "El movimiento comunica dirección, confirmación, conexión y jerarquía. Lo que no comunique alguna de esas cuatro no se publica." |

**Recomendación.** No reconstruir. `interaction-designer` extiende estos
archivos cuando hace falta un token nuevo — nunca crea un sistema paralelo.
Ver `.claude/agents/interaction-designer.md`. **Confianza.** Alta — es una
lectura directa del código, no una investigación externa.

## Lo que sí falta: transiciones de elemento compartido

Ver `mobile-patterns.md` §"Transición de elemento compartido" para el detalle.
Es el único vacío real encontrado en el sistema de movimiento actual: hoy
`ArtworkCard` → `ProfileScreen` es una navegación de push estándar sin
continuidad visual entre la miniatura y la imagen grande.

## Reducción de movimiento: MESH ya cumple, y por qué importa más de lo que parece

`SwipeCard.tsx` ya respeta `useMotion().reduceMotion`, reemplazando el
recorrido físico por una salida instantánea en su lugar. Esto no es solo buena
práctica: WCAG 2.5.4 (Motion Actuation) y el requisito de alternativa sin
gesto (2.5.1/2.5.7) hacen que "todo gesto tiene equivalente con botón" —regla
ya impuesta en `apps/mobile/CLAUDE.md`— sea un requisito de accesibilidad
real y no una preferencia de estilo. [WCAG 2.5.4 — Motion Actuation](https://dockaccess.org/documentation/wcag-success-criteria/wcag254/),
[Mobile App Accessibility Guide 2026](https://www.accessibilitychecker.org/guides/mobile-apps-accessibility/).
Nivel 1/2.

**Recomendación.** Ninguna acción — ya se cumple. Confirma que la regla de
CLAUDE.md no es solo ética de producto, es cumplimiento normativo real (WCAG
2.2 AA, exigido en Estados Unidos para organismos financiados por HHS desde
2026–2027 según la misma fuente — no aplica directamente a MESH/Argentina,
pero es la misma barra que cualquier tienda de apps espera). **Confianza.**
Alta.
