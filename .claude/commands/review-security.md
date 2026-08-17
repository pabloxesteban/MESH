---
description: Revisión de seguridad completa — RLS, storage, auth, secretos, deep links e integridad de producto.
---

Corré una revisión de seguridad de **$ARGUMENTS** (por defecto: el diff actual;
antes de un release, todo el código).

Tomá el rol de `security-reviewer`. Seguí
`.claude/workflows/security-review.md` sección por sección, y leé primero
`docs/security/security-model.md` y `docs/security/threat-model.md`.

Asumí que el cliente es hostil: cualquiera puede leer el bundle, tomar la anon key
y llamar a la API directamente.

Prestá atención especial a:
- Cualquier tabla de `public` sin RLS habilitado **y** forzado, o con cero
  políticas
- Políticas `for all`, o políticas de insert sin `with check`
- Políticas de update que permitan actualizar una fila *hacia* la propiedad de
  otra persona
- Funciones `SECURITY DEFINER` sin `set search_path = ''`
- `media_assets` exponiendo las rutas de referencias privadas de otra persona
- Rutas de storage no acotadas por `auth.uid()`
- Cualquier referencia a `service_role` alcanzable desde `apps/`
- Parámetros de deep link usados sin validar, o links que mutan
- Texto libre en las propiedades de analytics
- Integridad de producto (T9): contenido inventado, o una razón de match que no
  mapea a un componente que aportó

Por cada hallazgo dá: qué es, el camino concreto de explotación, el radio de
explosión, y el arreglo. Ordená por lo que el atacante efectivamente gana. No
infles el reporte — una lista de problemas teóricos de severidad baja entierra el
que importa.
