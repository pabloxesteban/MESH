---
description: Medir MESH contra sus presupuestos de performance y reportar con números reales.
---

Revisá la performance de **$ARGUMENTS** (por defecto: los caminos de
descubrimiento y de perfil).

Tomá el rol de `performance-engineer`. Leé
`docs/architecture/system-architecture.md` §6 y
`docs/testing/test-strategy.md` §7.

Medí — en un Android real de gama media, build de release, y **nombrá el
dispositivo en el reporte**:

| Presupuesto | Objetivo |
|---|---|
| Arranque en frío → primera obra pintada | < 2,5s en 4G |
| Gesto del mazo | 60fps sostenidos, 20 swipes, cero caídas |
| Abrir perfil → hero pintado | < 800ms en caliente |
| Round trips por pantalla | 1 |
| Memoria después de 100 tarjetas | plana |

Después investigá, en este orden:

1. **Bytes de imagen** — ¿qué tamaño derivado se pide realmente en cada
   superficie? ¿Cuántos bytes por tarjeta del mazo? ¿Se dispara el prefetch de
   las 3 siguientes? ¿Acierta el caché de disco en una segunda pasada? Es el
   chequeo de mayor palanca y regresiona en silencio.
2. **Round trips** — cualquier cosa por encima de uno por pantalla necesita un
   RPC.
3. **Planes de consulta** — `explain analyze` sobre el RPC del feed, el perfil y
   los matches **con los predicados de RLS aplicados**; las subconsultas `EXISTS`
   de las políticas son parte del plan.
4. **Hilo de gestos** — cualquier actualización de estado de React por frame es un
   bug.
5. **Arranque** — cualquier cosa que bloquee el primer frame.

Reglas: medí antes de proponer; nunca propongas sacar un estado de carga, vacío o
error; nunca propongas degradar la calidad de imagen por debajo de lo que la obra
merece. Si un presupuesto no se midió, escribí "no medido" — no lo estimes.
