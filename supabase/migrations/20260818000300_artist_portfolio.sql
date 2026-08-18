-- El artista sube su propia obra.
--
-- Hasta acá el catálogo lo escribía solo el service role desde `tools/seed`, y
-- `professionals.owner_user_id` existía sin usarse — el comentario de esa tabla
-- decía que estaba ahí "para que agregar ese flujo después sea una política
-- nueva y no una migración de datos". Esta es esa política nueva.
--
-- Sigue siendo un catálogo curado. Nadie se da de alta solo: MESH le entrega al
-- artista un código, el artista lo canjea, y recién ahí puede escribir sobre SU
-- perfil y nada más. La diferencia con el seeder es quién opera, no quién
-- decide: seguimos eligiendo a quién invitamos.
--
-- Qué NO habilita: crear un profesional, publicarse solo, tocar el perfil de
-- otro, ni subir a un bucket que no sea la carpeta de su propio slug.

-- --- el código de reclamo ----------------------------------------------------

-- En una tabla aparte y no en una columna de `professionals`.
--
-- El primer intento fue una columna con grant por columnas para esconderla del
-- cliente. Funciona en el papel y rompió tres archivos de tests: un grant por
-- columnas hace fallar cualquier `select *` y cualquier join que toque una
-- columna no listada, así que la superficie de "no te olvides de agregar la
-- columna nueva al grant" queda repartida por todo el esquema.
--
-- Un secreto no va en una tabla que el cliente lee. Va en una tabla que el
-- cliente no puede leer: `professional_claims` no tiene ninguna política de
-- select, así que para `authenticated` está vacía. La única forma de tocarla es
-- la función de abajo.

create table public.professional_claims (
  professional_id uuid primary key
    references public.professionals(id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{8}$'),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by uuid references public.profiles(id) on delete set null,
  constraint professional_claims_claimed_together check (
    (claimed_at is null) = (claimed_by is null)
  )
);

comment on table public.professional_claims is
  'Códigos de un solo uso que MESH le entrega al artista para reclamar su perfil. El cliente NO puede leer esta tabla: solo la toca claim_professional().';

alter table public.professional_claims enable row level security;
alter table public.professional_claims force row level security;

revoke all on public.professional_claims from anon, authenticated;
grant select, insert, update, delete on public.professional_claims to service_role;

-- Sin políticas a propósito. RLS con cero políticas niega todo, y el test
-- 00_rls_guarantee exige que toda tabla de `public` tenga RLS habilitado y
-- forzado — esta lo cumple siendo inaccesible, que es exactamente lo que se
-- quiere de una tabla de secretos.
--
-- El revoke NO es redundante: los privilegios por defecto del esquema `public`
-- le dan acceso a `anon` y a `authenticated` a toda tabla nueva. Sin esto la
-- tabla queda con RLS y sin políticas —o sea negada— pero con el privilegio
-- puesto, y el test 7 falla. Lo encontró él, no una revisión.

-- --- reclamar ----------------------------------------------------------------

-- SECURITY DEFINER porque tiene que leer `claim_code`, que es precisamente la
-- columna que el cliente no puede ver. Toda la lógica de autorización está
-- adentro y no depende de ninguna política.
create or replace function public.claim_professional(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_professional uuid;
  v_slug text;
begin
  if v_user is null then
    raise exception 'hace falta una sesión para reclamar un perfil'
      using errcode = '28000';
  end if;

  -- El código se consume en el mismo update que lo busca. En dos pasos habría
  -- una ventana para que dos sesiones reclamen el mismo perfil.
  update public.professional_claims
    set claimed_at = now(),
        claimed_by = v_user
  where code = upper(trim(p_code))
    and claimed_at is null
  returning professional_id into v_professional;

  if v_professional is null then
    -- Un solo mensaje para "no existe" y para "ya se usó": distinguir le
    -- confirmaría al que prueba códigos que acertó uno.
    raise exception 'el código no es válido' using errcode = 'P0002';
  end if;

  update public.professionals
    set owner_user_id = v_user,
        claimed_at = now()
  where id = v_professional
    and owner_user_id is null
  returning slug::text into v_slug;

  if v_slug is null then
    -- El código estaba libre pero el perfil ya tiene dueño. Es un estado
    -- inconsistente, no una entrada inválida: se aborta y el update del código
    -- se deshace con la transacción.
    raise exception 'el perfil ya tiene dueño' using errcode = 'P0002';
  end if;

  return v_slug;
end;
$$;

revoke all on function public.claim_professional(text) from public, anon;
grant execute on function public.claim_professional(text) to authenticated;

comment on function public.claim_professional is
  'Canjea un código de reclamo y deja al usuario actual como dueño del perfil. Un solo uso.';

-- --- ver lo propio aunque no esté publicado ----------------------------------

create policy professionals_select_own on public.professionals
  for select to authenticated
  using (owner_user_id = (select auth.uid()));

create policy portfolio_items_select_own on public.portfolio_items
  for select to authenticated
  using (
    exists (
      select 1 from public.professionals p
      where p.id = portfolio_items.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy portfolio_item_styles_select_own on public.portfolio_item_styles
  for select to authenticated
  using (
    exists (
      select 1
      from public.portfolio_items pi
      join public.professionals p on p.id = pi.professional_id
      where pi.id = portfolio_item_styles.portfolio_item_id
        and p.owner_user_id = (select auth.uid())
    )
  );

-- --- escribir sobre lo propio ------------------------------------------------

grant insert, update, delete on public.portfolio_items to authenticated;
grant insert, delete on public.portfolio_item_styles to authenticated;

-- `with check` y `using` por separado en el update: sin las dos, alguien podría
-- mover una pieza suya al perfil de otro.
create policy portfolio_items_insert_own on public.portfolio_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = portfolio_items.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy portfolio_items_update_own on public.portfolio_items
  for update to authenticated
  using (
    exists (
      select 1 from public.professionals p
      where p.id = portfolio_items.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.professionals p
      where p.id = portfolio_items.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy portfolio_items_delete_own on public.portfolio_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.professionals p
      where p.id = portfolio_items.professional_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy portfolio_item_styles_insert_own on public.portfolio_item_styles
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.portfolio_items pi
      join public.professionals p on p.id = pi.professional_id
      where pi.id = portfolio_item_styles.portfolio_item_id
        and p.owner_user_id = (select auth.uid())
    )
  );

create policy portfolio_item_styles_delete_own on public.portfolio_item_styles
  for delete to authenticated
  using (
    exists (
      select 1
      from public.portfolio_items pi
      join public.professionals p on p.id = pi.professional_id
      where pi.id = portfolio_item_styles.portfolio_item_id
        and p.owner_user_id = (select auth.uid())
    )
  );

-- --- media del catálogo, subida por su dueño ---------------------------------

-- `media_assets_insert_own` excluye el bucket `portfolio` a propósito: cuando se
-- escribió, el catálogo lo cargaba solo el seeder. Ahora también lo carga el
-- artista, y hace falta una política aparte.
--
-- No alcanza con "bucket = portfolio y owner = yo": sin atar el path al slug,
-- una artista podría registrar una fila que apunta al objeto de otra y quedarse
-- con su imagen adentro de su propio perfil. La primera carpeta del path es el
-- slug, y tiene que ser uno suyo — el mismo predicado que la política de
-- storage, porque son las dos mitades de la misma subida.
--
-- Lo encontró el test de integración: la subida a storage pasaba y la fila
-- rebotaba, que es exactamente el estado que deja objetos huérfanos.
create policy media_assets_insert_own_portfolio on public.media_assets
  for insert to authenticated
  with check (
    owner_user_id = (select auth.uid())
    and bucket = 'portfolio'
    and exists (
      select 1 from public.professionals p
      where p.slug::text = split_part(media_assets.path, '/', 1)
        and p.owner_user_id = (select auth.uid())
    )
  );

-- --- storage -----------------------------------------------------------------

-- La primera carpeta de la ruta es el slug del profesional. Se permite escribir
-- solo si ese slug es de un perfil que la persona reclamó. Mismo patrón que
-- `references`, con el dueño resuelto por join en vez de por igualdad con el
-- uid.
create policy "portfolio: el dueño escribe en la carpeta de su slug"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio'
    and exists (
      select 1 from public.professionals p
      where p.slug::text = (storage.foldername(name))[1]
        and p.owner_user_id = (select auth.uid())
    )
  );

-- Sin UPDATE, igual que en `references`: reemplazar una imagen es subir otra y
-- borrar la vieja. Un update cambiaría los bytes debajo de una fila de
-- `media_assets` que ya registró tamaño y tipo.

create policy "portfolio: el dueño borra en la carpeta de su slug"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio'
    and exists (
      select 1 from public.professionals p
      where p.slug::text = (storage.foldername(name))[1]
        and p.owner_user_id = (select auth.uid())
    )
  );
