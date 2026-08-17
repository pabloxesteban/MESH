---
name: supabase-security
description: Escribir políticas RLS, reglas de storage y manejo de auth para MESH. Usala para cualquier migración, política, bucket de storage, camino de subida o cambio de autenticación.
---

# Seguridad en Supabase

## Propósito

Hacer que la base de datos sea el límite de autorización, para que un bug del
cliente nunca pueda transformarse en una filtración de datos.

## Cuándo usarla

Cada migración. Cada política. Cada bucket de storage. Cada camino de subida.
Cualquier cambio que toque auth, sesiones o secretos.

## Los invariantes

1. Toda tabla de `public`: `enable row level security` **y**
   `force row level security`.
2. `revoke all … from anon, authenticated`, y después otorgar solo los verbos
   necesarios.
3. Políticas explícitas **por comando**. **Ninguna `for all`.**
4. Toda política `for insert` tiene un `with check`.
5. La propiedad siempre es `auth.uid()`. Nunca un id provisto por el cliente.
6. Las políticas de UPDATE repiten el predicado de propiedad en `using` **y** en
   `with check` — si no, una fila puede ser actualizada *hacia* tu propiedad.
7. `SECURITY DEFINER` solo donde haga falta: `set search_path = ''`, nombres
   completamente calificados, sin identificadores interpolados.
8. La tabla y sus políticas aterrizan en el **mismo archivo de migración**.

## Plantilla de migración

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null check (length(title) between 1 and 120),
  status project_status not null default 'draft',
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.projects force row level security;

revoke all on public.projects from anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;

create policy projects_select_own on public.projects
  for select to authenticated using (user_id = auth.uid());

create policy projects_insert_own on public.projects
  for insert to authenticated with check (user_id = auth.uid());

create policy projects_update_own on public.projects
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy projects_delete_own on public.projects
  for delete to authenticated using (user_id = auth.uid());

create index projects_user_status_idx on public.projects (user_id, status);
```

## Storage

| Bucket | Lectura | Escritura | Ruta |
|---|---|---|---|
| `portfolio` | pública | service role | `{slug}/{item_id}/{size}.webp` |
| `references` | solo dueño | solo dueño | `{user_id}/{uuid}.webp` |
| `avatars` | pública | solo dueño | `{user_id}/{uuid}.webp` |

Los buckets escribibles por el dueño verifican
`(storage.foldername(name))[1] = auth.uid()::text`. Lista blanca de MIME sin SVG.
Tope de 12 MB. **Nombres de archivo UUID generados por el servidor — la entrada
del usuario nunca llega a una ruta.** Los objetos privados se sirven con URLs
firmadas de vida corta que nunca se loguean, ni se persisten, ni van en un deep
link.

## Auth

Ingreso anónimo en el primer arranque; el upgrade a email/contraseña vincula la
misma fila de `auth.users`. Tokens solo en `expo-secure-store`. Cerrar sesión
limpia el caché de queries y todos los namespaces de MMKV con datos de usuario.
Nunca guardes, hashees ni compares una contraseña por tu cuenta. Nunca copies el
email de `auth.users` a una tabla legible por el cliente.

## Secretos

`EXPO_PUBLIC_*` es público **por diseño** — la anon key está pensada para
publicarse; lo que protege los datos es RLS. La service-role key vive solo en
`tools/seed` y en CI. El CI busca `service_role` en el bundle compilado.

## Anti-patrones

Autorización en los filtros del cliente · Una tabla publicada sin políticas ·
Políticas `for all` · Una política de insert sin `with check` · Una función
`SECURITY DEFINER` sin `search_path` fijado · Reglas de negocio impuestas solo en
TypeScript · Confiar en un chequeo de tipo de archivo del lado del cliente · Una
URL firmada en un log · Tratar la anon key como secreto mientras el secreto real
queda expuesto · Una respuesta de error que revela si una fila existe.

## Checklist de calidad

- [ ] RLS habilitado **y** forzado
- [ ] `revoke all` y después grants explícitos
- [ ] Políticas por comando; ninguna `for all`
- [ ] Toda política de insert tiene `with check`
- [ ] Las políticas de update protegen `using` y `with check`
- [ ] Los predicados de las políticas están indexados
- [ ] Test de acceso cruzado escrito para la tabla nueva
- [ ] La tabla se agregó al mapa de políticas de `docs/security/security-model.md`
- [ ] Ningún PII nuevo copiado a una tabla legible por el cliente
