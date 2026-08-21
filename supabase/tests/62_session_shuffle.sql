-- La grilla se remezcla con la semilla de la sesión.
--
-- Cuatro garantías:
--
-- 1. **Semillas distintas dan órdenes distintos.** Es el punto: ningún artista
--    queda clavado arriba.
-- 2. **La misma semilla da el mismo orden.** Mientras dura la sesión la lista
--    no se mueve bajo los dedos, que sería peor que estar clavada.
-- 3. **Nadie se pierde ni se repite** al remezclar.
-- 4. **Sin semilla sigue funcionando**, con la mezcla vieja por usuario: un
--    cliente sin actualizar no se rompe.

begin;
select plan(5);

delete from public.professionals;

insert into auth.users (id, email)
values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'mira@example.test');

insert into public.profiles (id, display_name)
values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'Quien mira')
on conflict (id) do update set display_name = excluded.display_name;

-- Doce artistas publicados, cada uno con una obra. Doce y no dos: con dos, dos
-- semillas cualesquiera coinciden la mitad de las veces por puro azar y el
-- test sería intermitente. Con doce, la probabilidad de que dos órdenes
-- coincidan enteros es 1 entre 479 millones.
do $$
declare
  v_cat uuid;
  i integer;
  v_pro uuid;
  v_media uuid;
begin
  select id into v_cat from public.categories where slug = 'tattoo';

  for i in 1..12 loop
    v_pro := ('cccccccc-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid;
    v_media := ('eeeeeeee-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid;

    insert into public.professionals
      (id, category_id, slug, display_name, instagram_handle, is_published)
    values (v_pro, v_cat, 'artista-' || i, 'Artista ' || i, 'ig' || i, true);

    insert into public.media_assets (id, bucket, path, mime_type, width, height)
    values (v_media, 'portfolio', i || '.jpg', 'image/jpeg', 800, 1000);

    insert into public.portfolio_items (professional_id, media_id, sort_order)
    values (v_pro, v_media, 0);
  end loop;
end $$;

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1","role":"authenticated"}';

create temporary table ordenes on commit drop as
select
  'a' as semilla,
  array_agg(slug order by orden) as lista
from (
  select slug, row_number() over () as orden
  from public.get_artist_grid('tattoo', 100, 6, 'semilla-a')
) t;

insert into ordenes
select 'b', array_agg(slug order by orden)
from (
  select slug, row_number() over () as orden
  from public.get_artist_grid('tattoo', 100, 6, 'semilla-b')
) t;

insert into ordenes
select 'a-otra-vez', array_agg(slug order by orden)
from (
  select slug, row_number() over () as orden
  from public.get_artist_grid('tattoo', 100, 6, 'semilla-a')
) t;

select isnt(
  (select lista from ordenes where semilla = 'a'),
  (select lista from ordenes where semilla = 'b'),
  'dos semillas dan dos órdenes: nadie queda clavado arriba'
);

select is(
  (select lista from ordenes where semilla = 'a'),
  (select lista from ordenes where semilla = 'a-otra-vez'),
  'la misma semilla da el mismo orden: la lista no se mueve mientras la mirás'
);

select is(
  (select array_length(lista, 1) from ordenes where semilla = 'b'),
  12,
  'remezclar no pierde a nadie'
);

select is(
  (select count(distinct x)::int
   from ordenes, unnest(lista) as x
   where semilla = 'b'),
  12,
  'ni repite a nadie'
);

select is(
  (select count(*)::int from public.get_artist_grid('tattoo')),
  12,
  'sin semilla sigue andando: un cliente viejo no se rompe'
);

select * from finish();
rollback;
