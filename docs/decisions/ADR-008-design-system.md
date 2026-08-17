# ADR-008 — Design system dentro de la app, impuesto por lint

**Estado:** Propuesto · **Fecha:** 2026-08-17 · **Responsable:** design-system-engineer

## Contexto

El brief pide un design system centralizado con tokens y un catálogo de
componentes con nombre, y prohíbe los valores de diseño arbitrarios dentro de las
pantallas. La estructura de repositorio propuesta listaba `packages/design-system`
como workspace.

## Problema

¿Dónde vive el design system, y qué es lo que efectivamente impide que un
`#9C2D40` crudo aparezca en una pantalla dentro de seis semanas?

## Opciones — ubicación

**A. Workspace `packages/design-system`.** Un límite de imports duro;
publicable; reutilizable por una futura app web.
**B. `apps/mobile/src/design-system/`.** Sin paso de build, sin desfasaje de
versiones, un solo consumidor.

## Opciones — enforcement

**W. Convención y revisión de código.**
**X. Reglas de ESLint que rompen el build.**
**Y. Un sistema de tipos que haga irrepresentables los valores crudos** (por
ejemplo tokens con marca de tipo, sin escotilla de escape vía `style`).

## Decisión

**B** para la ubicación, **X** como enforcement principal con elementos de **Y**.

Reglas:

- `no-restricted-syntax` prohibiendo literales de color hex, valores numéricos de
  `padding`/`margin`/`gap`/`borderRadius`/`fontSize`, y duraciones de animación
  crudas en cualquier lugar fuera de `src/design-system/`.
- `Text` toma una prop `role` de una unión cerrada; no tiene prop `fontSize` en
  absoluto. Lo mismo para el espaciado en `Box`.
- Las pantallas no pueden importar `@supabase/supabase-js` (una regla de capas,
  impuesta de la misma manera).
- Los ratios de contraste de cada par de tokens semánticos se verifican en un
  test, no a ojo.

## Por qué

El design system tiene exactamente un consumidor y está acoplado a React Native.
Extraerlo a un workspace compra un límite de imports y cuesta un paso de build,
un límite de versiones y una indirección en cada edición — justo durante la fase
en que los tokens más cambian. Moverlo después, si aparece una app web, es mover
una carpeta; los tokens ya están aislados en `tokens/`.

La mitad importante de esta decisión es el enforcement. "Nada de valores
arbitrarios en las pantallas" es una regla que todos los equipos tienen y la
mayoría rompe, porque la revisión es el mecanismo de enforcement más débil posible
y falla precisamente cuando alguien está apurado. Una regla de lint rompe el
build, no es negociable a las 2 de la mañana, y no requiere que quien revisa se
dé cuenta. Sacarle la escotilla de escape a `Text` y `Box` es todavía más fuerte:
no podés pasar un tamaño de fuente que no existe.

Verificar el contraste en un test en lugar de en una revisión importa porque el
color de acento del brief **no pasa AA sobre la superficie oscura** — un error
invisible para un diseñador con buena vista en una buena pantalla, y obvio para un
test.

## Consecuencias

- Algunos valores puntuales legítimos van a quedar bloqueados. La respuesta
  correcta: nombralo y agregalo a `tokens/`, o usá una variante. Esa fricción es
  la feature.
- Las reglas de lint necesitan escotillas ocasionales para wrappers de terceros;
  cada excepción es un disable en línea con un comentario que la explica, y se
  revisan en el momento del release.
- Las pantallas quedan cortas —mayormente composición— lo que las hace fáciles
  de leer y de cambiar.
- El catálogo en
  [`docs/design/design-system.md`](../design/design-system.md) tiene que
  actualizarse en el mismo commit que un componente nuevo. Un componente que no
  está en el catálogo no existe.
