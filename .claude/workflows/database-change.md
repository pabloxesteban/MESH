# Workflow — Cambio de base de datos

Cualquier migración. Sin excepciones, incluido "solo estoy agregando una
columna".

## 1. Justificar — `product-architect`

- ¿Qué lee o escribe esto, y en qué pantalla?
- ¿Qué se rompe sin eso?
- ¿Es derivable de datos existentes? Si sí, derivalo.
- ¿Filtra conocimiento de categoría hacia el núcleo? (`tattoo_*` → rechazar)
- ¿Duplica un hecho representado en otro lado?

**Produce:** aprobación o una alternativa más simple. Revisa *todo* cambio de
esquema — este paso no es opcional.

## 2. Diseñar el esquema — `backend-engineer`

**Produce**, en un solo archivo de migración:
- Tabla/columnas con PK UUID y comportamiento de borrado explícito en cada FK
- Restricciones que expresen los invariantes (no chequeos en TypeScript)
- Enums para conjuntos cerrados, tablas para conjuntos abiertos
- `enable row level security` **y** `force row level security`
- `revoke all` y después grants explícitos por verbo
- Políticas explícitas por comando; toda política de insert con `with check`;
  las de update protegiendo `using` **y** `with check`
- Índices, cada uno con una consulta con nombre detrás

## 3. Revisión de seguridad — `security-reviewer`

- ¿El predicado de la política usa `auth.uid()` y nada provisto por el cliente?
- ¿Se puede actualizar una fila *hacia* la propiedad de otro usuario?
- ¿Alguna respuesta de error filtra existencia donde correspondía silencio?
- ¿El predicado de la política está indexado, o cada lectura paga un `EXISTS`
  secuencial?
- ¿La tabla se agregó al mapa de políticas de
  `docs/security/security-model.md`?

## 4. Testear — `qa-engineer`

- `npm run db:test` sigue en verde. La garantía genérica
  (`supabase/tests/00_rls_guarantee.sql`) recorre el catálogo, así que una tabla
  nueva queda cubierta sin tocarla: RLS habilitado y forzado; políticas **o**
  ningún grant de cliente; ninguna `for all`; todo insert con `with check`; todo
  update con `using` y `with check`; `anon` sin privilegios; toda función
  `security definer` con `search_path` fijado.
- Tests cruzados para la tabla nueva: B selecciona las filas de A → `[]`; el
  update y el delete de B → 0 filas; B insertando con `user_id = A` → rechazado.
- Un test de rechazo por cada restricción nueva, en
  `supabase/tests/10_constraints.sql`. Un test del camino feliz no prueba nada
  sobre una restricción: prueba que no molesta.
- `supabase db reset` limpio desde cero.

## 5. Tipos

`npm run db:types` regenera `packages/domain/src/db/database.types.ts` desde el
esquema. `database.types.test.ts` los reconcilia con los tipos escritos a mano de
`types/core.ts` — una discrepancia es un bug en alguno de los dos, resuelto
ahora, no después. Si tocaste la taxonomía, también `npm run db:reference`.

Los dos tienen su `--check` en CI (`db:types:check`, `db:reference:check`), así
que olvidarse de regenerar rompe el build y no una pantalla.

## 6. Documentar

`docs/architecture/data-model.md` actualizado en el **mismo commit**. Mapa de
políticas de `docs/security/security-model.md` actualizado. ADR si la decisión es
difícil de revertir.

## Reglas que no se negocian

- La tabla y sus políticas aterrizan en el mismo archivo de migración.
- Las migraciones son solo hacia adelante y nunca se editan después de aplicarse
  a staging.
- Una migración que crea una tabla sin políticas **rompe el CI**.
- Ninguna columna de borrado lógico.
- Ningún índice sin una consulta.
