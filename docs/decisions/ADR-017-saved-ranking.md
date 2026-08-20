# ADR-017 — Ranking de lo más guardado, y avisos al artista

**Estado:** Aceptado (2026-08-20) · **Fecha:** 2026-08-20 · **Enmienda:** [ADR-016](ADR-016-saved-items.md)

## Contexto

ADR-016 se escribió ayer y decidió lo contrario de lo que dice esta: guardar es
privado, no hay contador, y el artista no ve nada. El argumento era que el
camino **contador → ranking → notificación** es corto y se recorre solo.

Se recorrió. No por descuido: se pidió explícitamente, con las dos opciones
sobre la mesa y con el costo escrito.

Esta ADR existe para que quede el registro de qué se cambió, qué se conservó y
qué se resignó — porque dentro de seis meses la pregunta va a ser "¿por qué
MESH tiene un ranking si su propia documentación dice que no?".

## Decisión

**Se abre el agregado. No se abre la identidad.**

### Lo que se abre

1. **Ranking semanal y mensual** de las obras más guardadas, visible para todos,
   arriba de Explorar. Ventana móvil de 7 y 30 días.
2. **El artista ve cuántas veces guardaron cada obra suya**, y cuántos son
   nuevos desde la última vez que miró.

### Lo que NO se abre, y no estaba en el pedido

**Quién guardó.** Ninguna de las dos funciones devuelve `user_id`, ni nada que
identifique a nadie, y la política de `saved_items` sigue sin dejar leer una
fila ajena.

Es la distinción que sostiene todo lo demás: *que* guardaron es una señal de
demanda, y *quién* guardó es decirle a un artista quién lo está mirando. Lo
segundo nadie lo pidió y sería otra cosa.

No es una promesa: `supabase/tests/48_saved_items.sql` falla si alguien le
agrega una columna de identidad a cualquiera de las dos RPC.

### El número, no el puesto

La fila muestra **"12 guardados"**, no "#1 de la semana". El orden ya es el
ranking; el puesto, la medalla y el "subió tres lugares" son la misma
información convertida en competencia, y de ahí salen las cosas que MESH
efectivamente no hace.

Por la misma razón el ranking **no se dibuja si está vacío**. Un ranking con
cero obras y un cartel de "todavía no hay nada" ocupa lugar para no decir nada.

## Lo que se resignó

El innegociable 3 de `CLAUDE.md` decía "ni notificaciones carnada". Avisarle a
un artista cada vez que alguien guarda su obra **es** una notificación carnada
según cualquier definición razonable: no hay nada que hacer con esa información,
y su efecto es traerlo de vuelta a la app.

La regla se **acotó**, no se borró. Una notificación ahora tiene que:

- corresponder a un hecho real y reciente sobre quien la recibe,
- poder apagarse,
- y no inventar urgencia ni fabricar un motivo cuando no pasó nada.

Y sigue prohibido sin excepción: rachas, puntos, niveles, medallas, y cualquier
número cuyo propósito sea que alguien vuelva a entrar en vez de informarlo.

**Tener la regla escrita y no cumplirla habría sido peor que no tenerla.**

## Estado de la implementación

Lo que hay hoy es **dentro de la app**: el artista abre su estudio y ve el
total, más cuántos son nuevos desde la última vez. Lo nuevo deja de ser nuevo
porque lo miró.

La notificación al teléfono —el aviso que llega sin abrir la app— **no está
construida**: necesita `expo-notifications`, tokens de dispositivo y una función
del lado del servidor que dispare, y en iOS no funciona en Expo Go. Es un paso
aparte, y cuando se haga hay que decidir si es una por guardado o un resumen,
porque una por guardado en un artista con obra popular es un teléfono
vibrando toda la tarde.

## Referencias

- [ADR-016](ADR-016-saved-items.md) — la decisión que esto enmienda
- `supabase/migrations/20260820000200_saved_ranking.sql`
- `supabase/tests/48_saved_items.sql` — el anonimato, como test
