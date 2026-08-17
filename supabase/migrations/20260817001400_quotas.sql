-- Cuotas, impuestas del lado del servidor.
--
-- Todas estas reglas ya existen como texto en docs/security/security-model.md
-- §6. Un límite que solo vive en el cliente no es un límite: es una sugerencia
-- que cualquiera con la anon key puede ignorar.
--
-- Los tres triggers son SECURITY DEFINER a propósito. Cuentan filas para
-- decidir si aceptar una más, y una cuenta que RLS pudiera recortar sería una
-- cuota que se puede evadir. Todos con `search_path` fijado.

-- --- 20 proyectos vivos por usuario ------------------------------------------

create or replace function public.enforce_project_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  vivos integer;
begin
  -- Los archivados no cuentan: archivar es la salida, y hacerla contar
  -- convertiría la cuota en una trampa sin puerta.
  select count(*) into vivos
  from public.projects
  where user_id = new.user_id and status <> 'archived';

  if vivos >= 20 then
    raise exception
      'Máximo 20 proyectos sin archivar por persona (tenés %)', vivos
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger projects_quota
  before insert on public.projects
  for each row execute function public.enforce_project_quota();

-- --- 10 referencias por proyecto ---------------------------------------------

create or replace function public.enforce_project_reference_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  referencias integer;
begin
  select count(*) into referencias
  from public.project_references
  where project_id = new.project_id;

  if referencias >= 10 then
    raise exception
      'Máximo 10 imágenes de referencia por proyecto (tiene %)', referencias
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger project_references_quota
  before insert on public.project_references
  for each row execute function public.enforce_project_reference_quota();

-- --- 50 MB de media por usuario ----------------------------------------------

create or replace function public.enforce_media_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  usados bigint;
  tope constant bigint := 52428800;  -- 50 MB
begin
  -- La media curada (owner_user_id null) no tiene cuota: la sube el seeder.
  if new.owner_user_id is null then
    return new;
  end if;

  select coalesce(sum(byte_size), 0) into usados
  from public.media_assets
  where owner_user_id = new.owner_user_id;

  if usados + coalesce(new.byte_size, 0) > tope then
    raise exception
      'Cuota de 50 MB por persona superada (usados %, nuevo %)',
      usados, coalesce(new.byte_size, 0)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger media_assets_quota
  before insert on public.media_assets
  for each row execute function public.enforce_media_quota();

comment on function public.enforce_media_quota is
  'Cuota de 50 MB por persona. Ver docs/security/security-model.md §6.';
