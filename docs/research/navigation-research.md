# Investigación de navegación — pestañas, alcance del pulgar

Investigado 2026-08-18.

## Pestañas abajo, no arriba

**Patrón.** La navegación por pulgar (pestañas y acciones primarias en la
parte inferior de la pantalla) le gana a la navegación superior en apps
móviles, porque el pulgar llega más fácil abajo que arriba en un teléfono
sostenido con una mano.

**Fuente.** [Mobile UX Design — Complete Guide 2026, UXCam](https://uxcam.com/blog/mobile-ux/):
"tap targets need to be at least 44pt per Apple's HIG on iOS, and thumb-driven
navigation means bottom tabs work better than top tabs". Nivel 2/3, y coincide
con el HIG de Apple, que es Nivel 1.

**MESH ya lo hace.** La arquitectura de navegación propuesta
(`docs/architecture/navigation.md`) ya usa pestañas inferiores con Expo Router.
No es un cambio, es una confirmación de que la elección existente coincide con
la evidencia.

**El área táctil de 44pt también coincide** con la regla ya impuesta en
`apps/mobile/CLAUDE.md` §"Antes de dar una pantalla por terminada": "un botón
equivalente con etiqueta para cada gesto a ≥44pt". No hace falta cambiar nada;
vale la pena anotar que la cifra no es arbitraria de MESH, es el mínimo
publicado por Apple y se repite en toda fuente de accesibilidad móvil
consultada.

**Recomendación.** Usar lo que ya existe, sin cambios. **Confianza.** Alta.

## Nota sobre el estado del documento de navegación

Al leer `docs/architecture/navigation.md` para esta investigación se encontró
que describe una estructura de rutas (`app/(tabs)/discover/`,
`app/(tabs)/matches/`, etc.) que **no coincide** con las rutas que existen hoy
en `apps/mobile/app/` (`index.tsx`, `gusto.tsx`, `matches.tsx`, `proyectos/`,
`artista/[slug].tsx`, `contacto/`, `cuenta/`, sin agrupación `(tabs)`). El
documento sigue marcado "Propuesto". No es parte del alcance de esta
investigación corregirlo, pero queda anotado acá para que quien toque
navegación después no asuma que el documento describe el código actual.
