# ADR-016 — Guardar obra, y que nadie más lo vea

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Responsable:** product-architect

## Contexto

[ADR-003](ADR-003-domain-model.md) descartó `SavedItem` y
[D-010](../design/MESH-DESIGN-DECISIONS.md) lo dejó afuera otra vez al sacar el
mazo. Esta ADR lo revierte, como [ADR-012](ADR-012-chat.md) hizo con la
mensajería.

El motivo no es una idea: se ve usando la app. Alguien recorre Explorar
juntando ideas para su próximo tatuaje y **no tiene dónde ponerlas**. Hoy la
única forma de no perder una obra es sacarle una captura de pantalla — que es
la señal más clara de que a la app le falta algo.

El [teardown de Tattoodo](../research/MESH-TATTOODO-TEARDOWN.md) ya lo había
marcado: ellos tienen bookmark y "Boards", MESH no tenía nada, y ahí lo anoté
como "un agujero real, pero volver a meter guardado es una decisión de producto
con su propio ADR". Esta es esa ADR.

## Problema

¿Qué se guarda, quién lo ve, y cómo se evita que guardar se convierta en la
métrica de vanidad de siempre?

## Decisión

**Se guarda la obra, guardar es privado, y no hay contador.**

### Se guarda la obra, no el artista

"Un corazón abajo de la foto" es lo que se pidió, y además es lo que
corresponde: alguien junta ideas de tatuaje, no colecciona personas. Al artista
se llega desde la obra, que es la regla de toda la app — Inicio y Explorar
terminan en una persona, y Guardados también.

Guardar artistas es otra feature. Si hace falta, va con su propia decisión.

### Guardar es privado, y el artista no cuenta corazones

`saved_items` está filtrada por `auth.uid()` en las tres políticas, y **no hay
ninguna consulta que cuente guardados ajenos.** El artista no ve cuántas veces
guardaron su obra.

No es una omisión, es la decisión. Un contador público convierte guardar en una
métrica, una métrica pide un ranking, y un ranking pide una notificación que
diga "tu obra tiene 12 corazones" — que es exactamente la notificación carnada
que prohíbe el innegociable 3 de `CLAUDE.md`. El camino es corto y se recorre
solo; la forma de no recorrerlo es no dar el primer paso.

Está testeado y no prometido: `supabase/tests/48_saved_items.sql` verifica que
el dueño del perfil, autenticado como él mismo, cuenta cero.

### Insert y delete, nunca un booleano

Guardar es una fila; desguardar es borrarla. Un `saved boolean` que se togglea
deja las filas de quien se arrepintió, y esa fila es justo la que después
alguien cuenta como si fuera interés.

### El corazón se pinta antes que la red

Tocar un corazón se dibuja en el mismo cuadro y la escritura viaja después. Si
falla, **el corazón vuelve a como estaba**: uno lleno que no se guardó promete
algo que no pasó, y la mentira se descubre recién al volver otro día y no
encontrar la obra. Hay tests de las dos direcciones.

### Dónde vive

Bajo cada obra del perfil —hero y grilla— y en la pantalla propia de
**Guardados**, a la que se llega desde Perfil. No es una pestaña: la barra es de
cuatro y ninguna más, y guardados se visita cada tanto, no cada sesión.

## Consecuencias

- **Sin cuenta, lo guardado vive en un solo teléfono.** El `auth.uid()` anónimo
  existe desde el primer arranque (ADR-002), así que guardar funciona sin
  registrarse — pero no viaja. Es una razón más para crear cuenta, y de las
  honestas: dice qué se gana, no bloquea nada.
- **Una obra que el artista baja desaparece de los guardados de todos**, por el
  `on delete cascade`. Es lo correcto: guardar no puede volverse una forma de
  conservar obra que alguien retiró.
- **Sin carpetas ni tableros.** Una lista sola alcanza para quince artistas.
  Cuando no alcance, se verá — y va a ser un problema lindo de tener.

## Un defecto que encontró construir esto

El preview web reemplaza cada `queries.ts` por su `queries.preview.ts` según
una lista escrita **a mano** en `metro.config.js`. Guardados no estaba, así que
el corazón escribía contra Supabase de verdad: se llenaba, la escritura fallaba,
y volvía a vaciarse al instante — sin ningún error a la vista.

Ahora hay un test que recorre el árbol y falla si una feature tiene versión de
preview y no está en la lista. Encontró además dos entradas muertas, de `taste`
y `matches`, features que D-010 borró hace tiempo.

## Referencias

- [ADR-003](ADR-003-domain-model.md) — donde se había descartado
- [ADR-012](ADR-012-chat.md) — el precedente de revertir un descarte de ADR-003
- [D-010](../design/MESH-DESIGN-DECISIONS.md) — el giro que lo dejó afuera
- `supabase/tests/48_saved_items.sql` — el aislamiento, como test
