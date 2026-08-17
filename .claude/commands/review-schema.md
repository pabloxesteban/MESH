---
description: Revisar un cambio de esquema contra las reglas de modelo de datos y los requisitos de RLS de MESH.
---

Revisá el cambio de esquema: **$ARGUMENTS** (por defecto: las migraciones del diff
actual).

Seguí `.claude/workflows/database-change.md`, tomando los roles de
`product-architect`, `backend-engineer` y `security-reviewer`. Leé primero
`docs/architecture/data-model.md`.

Respondé, explícitamente:

1. **¿Se gana su existencia?** ¿Qué lo lee o escribe, y en qué pantalla? ¿Qué se
   rompe sin eso? ¿Es derivable de datos que ya tenemos?
2. **¿Es agnóstico de categoría?** ¿Agregar *fotografía* seguiría requiriendo solo
   filas en `categories`/`styles` más archivos de contenido?
3. **¿Duplica un hecho** representado en otro lado?
4. **Comportamiento de borrado** explícito en cada clave foránea?
5. **¿Invariantes como restricciones**, y no como chequeos en TypeScript?
6. **¿RLS en la misma migración** — habilitado, forzado, `revoke all` + grants,
   políticas por comando, `with check` en los inserts, propiedad vía
   `auth.uid()`?
7. **Índices** — ¿cada uno tiene una consulta con nombre? ¿Están indexados los
   predicados de las políticas?
8. **Tests** — ¿tests cruzados para la tabla nueva, tests de rechazo para las
   restricciones nuevas?
9. **Documentación** — ¿`data-model.md` y el mapa de políticas actualizados en el
   mismo commit?

Dá un veredicto: aprobar, aprobar con cambios (listalos), o rechazar con una
alternativa más simple.
