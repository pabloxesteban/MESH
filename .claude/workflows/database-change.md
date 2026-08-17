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

- El test de garantía genérica de RLS sigue pasando (RLS habilitado + forzado +
  ≥1 política en toda tabla de `public`; ninguna `for all`; toda política de
  insert con `with check`).
- Tests cruzados para la tabla nueva: B selecciona las filas de A → `[]`; el
  update y el delete de B → 0 filas; B insertando con `user_id = A` → rechazado.
- Un test de rechazo por cada restricción nueva.
- `supabase db reset` limpio desde cero.

## 5. Tipos

Regenerar los tipos TypeScript desde el esquema. Reconciliar con los tipos de
`packages/domain` — una discrepancia es un bug en alguno de los dos, resuelto
ahora, no después.

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
