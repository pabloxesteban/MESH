-- Llevarte lo tuyo antes de irte.
--
-- Ver ADR-028.
--
-- ## Por qué esto existe
--
-- ADR-024 dejó escrito el hueco: *"Exportar tus datos antes de borrarlos. La
-- Ley 25.326 reconoce el derecho de acceso, y hoy se satisface porque todo está
-- a la vista en la app. Un ZIP descargable es mejor y no está."*
--
-- Y hay un problema de orden que lo vuelve urgente: **borrar la cuenta es
-- inmediato y no tiene marcha atrás**. Sin una forma de llevarse las cosas
-- antes, el derecho de supresión y el de acceso se pisan — ejercer uno destruye
-- la posibilidad de ejercer el otro.
--
-- ## La regla que decide qué entra
--
-- **Lo que escribiste vos, y lo que te pasó a vos.** Lo que escribieron otros,
-- no.
--
-- Por eso el export lleva tus mensajes pero no las respuestas del artista, y
-- lleva que alguien respondió a tu búsqueda pero no el precio que te pasó. Esas
-- son palabras de otra persona: seguís pudiendo leerlas en la app, pero un
-- archivo que se comparte y se reenvía es una superficie de distribución nueva,
-- y no es tuya para abrirla.
--
-- La excepción es el asistente: del otro lado no hay una persona, así que sus
-- turnos también son tuyos.
--
-- ## Qué NO hace
--
-- No incluye las fotos. Un `jsonb` con imágenes adentro sería un archivo
-- imposible de abrir. La función devuelve las **rutas**, y la app las cambia
-- por enlaces firmados antes de armar el archivo.

/**
 * Todo lo tuyo, en un JSON.
 *
 * `security definer` por una sola cosa: leer tu correo de `auth.users`, que
 * ninguna política de cliente alcanza. El resto podría salir por RLS, pero
 * armarlo en una sola función tiene una ventaja que importa más que la pureza —
 * **hay un solo lugar donde mirar qué entra y qué no**, en vez de doce consultas
 * repartidas por la app.
 *
 * El candado es el mismo de siempre: **no recibe a quién exportar**. Saca el id
 * de `auth.uid()`.
 */
create or replace function public.export_own_account()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  quien uuid := (select auth.uid());
  salida jsonb;
begin
  if quien is null then
    raise exception 'hace falta una sesión' using errcode = '28000';
  end if;

  select jsonb_build_object(
    'exportado_el', now(),
    'que_es', 'Todo lo que MESH guarda de vos. Lo que escribieron otras personas no está: eso es de ellas, y lo podés seguir leyendo en la app.',

    'cuenta', (
      select jsonb_build_object(
        'id', p.id,
        'correo', u.email,
        'nombre', p.display_name,
        'vino_a', p.onboarding_intent,
        'declaro_ser_mayor_el', p.adult_confirmed_at,
        'datos_de_uso', p.analytics_opt_in,
        'avisos', p.notifications_opt_in,
        'creada_el', p.created_at
      )
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id = quien
    ),

    'busquedas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'titulo', pr.title,
        'lo_que_pediste', pr.description,
        'estado', pr.status,
        'abierta_a_tatuadores', pr.is_open_to_professionals,
        'creada_el', pr.created_at,
        'estilos', coalesce((
          select jsonb_agg(s.slug::text order by s.slug)
          from public.project_styles ps
          join public.styles s on s.id = ps.style_id
          where ps.project_id = pr.id
        ), '[]'::jsonb),
        'rasgos', coalesce((
          select jsonb_agg(t.slug::text order by t.slug)
          from public.project_traits pt
          join public.traits t on t.id = pt.trait_id
          where pt.project_id = pr.id
        ), '[]'::jsonb),
        'fotos', coalesce((
          select jsonb_agg(jsonb_build_object('bucket', m.bucket, 'ruta', m.path)
                           order by prf.sort_order)
          from public.project_references prf
          join public.media_assets m on m.id = prf.media_id
          where prf.project_id = pr.id
        ), '[]'::jsonb)
      ) order by pr.created_at)
      from public.projects pr
      where pr.user_id = quien
    ), '[]'::jsonb),

    -- Las conversaciones: que existieron y con quién. **No los mensajes del
    -- otro lado.**
    'conversaciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'con', pro.display_name,
        'abierta_el', c.created_at,
        'tus_mensajes', coalesce((
          select jsonb_agg(jsonb_build_object(
            'cuando', m.created_at,
            'texto', m.body
          ) order by m.created_at)
          from public.messages m
          where m.conversation_id = c.id
            and m.sender_user_id = quien
        ), '[]'::jsonb)
      ) order by c.created_at)
      from public.conversations c
      join public.professionals pro on pro.id = c.professional_id
      where c.user_id = quien
    ), '[]'::jsonb),

    'turnos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'con', pro.display_name,
        'empieza', a.starts_at,
        'termina', a.ends_at,
        'estado', a.status
      ) order by a.starts_at)
      from public.appointments a
      join public.professionals pro on pro.id = a.professional_id
      where a.user_id = quien
    ), '[]'::jsonb),

    'resenas_que_escribiste', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sobre', pro.display_name,
        'puntaje', r.rating,
        'texto', r.body,
        'foto', (select jsonb_build_object('bucket', m.bucket, 'ruta', m.path)
                 from public.media_assets m where m.id = r.media_id),
        'escrita_el', r.created_at
      ) order by r.created_at)
      from public.reviews r
      join public.professionals pro on pro.id = r.professional_id
      where r.user_id = quien
    ), '[]'::jsonb),

    'obra_guardada', coalesce((
      select jsonb_agg(jsonb_build_object(
        'de', pro.display_name,
        'guardada_el', si.created_at
      ) order by si.created_at)
      from public.saved_items si
      join public.portfolio_items it on it.id = si.portfolio_item_id
      join public.professionals pro on pro.id = it.professional_id
      where si.user_id = quien
    ), '[]'::jsonb),

    -- El asistente entero, los dos lados: del otro no hay una persona.
    'asistente', coalesce((
      select jsonb_agg(jsonb_build_object(
        'empezada_el', th.created_at,
        'turnos', coalesce((
          select jsonb_agg(jsonb_build_object(
            'quien', tu.role,
            'texto', tu.body,
            'cuando', tu.created_at
          ) order by tu.created_at)
          from public.assistant_turns tu
          where tu.thread_id = th.id
        ), '[]'::jsonb)
      ) order by th.created_at)
      from public.assistant_threads th
      where th.user_id = quien
    ), '[]'::jsonb),

    'denuncias_que_hiciste', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sobre_que', rep.target_kind,
        'motivo', rep.reason,
        'lo_que_escribiste', rep.note,
        'estado', rep.status,
        'hecha_el', rep.created_at
      ) order by rep.created_at)
      from public.reports rep
      where rep.reporter_user_id = quien
    ), '[]'::jsonb),

    'bloqueos', coalesce((
      select jsonb_agg(jsonb_build_object(
        -- Del lado del artista, el bloqueado es una persona: su nombre no entra,
        -- porque no es un dato tuyo.
        'a', coalesce(pro.display_name, 'una persona'),
        'desde', b.created_at
      ) order by b.created_at)
      from public.blocks b
      left join public.professionals pro on pro.id = b.blocked_professional_id
      where b.blocker_user_id = quien
    ), '[]'::jsonb),

    'avisos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'tipo', n.kind,
        'resultado', n.outcome,
        'cuando', n.created_at
      ) order by n.created_at)
      from public.notifications n
      where n.user_id = quien
    ), '[]'::jsonb),

    'perfil_de_artista', (
      select jsonb_build_object(
        'nombre', pro.display_name,
        'bio', pro.bio,
        'instagram', pro.instagram_handle,
        'whatsapp', pro.whatsapp_e164,
        'publicado', pro.is_published,
        'estilos', coalesce((
          select jsonb_agg(s.slug::text order by s.slug)
          from public.professional_styles ps
          join public.styles s on s.id = ps.style_id
          where ps.professional_id = pro.id
        ), '[]'::jsonb),
        'obra', coalesce((
          select jsonb_agg(jsonb_build_object(
            'epigrafe', it.caption,
            'anio', it.year,
            'foto', jsonb_build_object('bucket', m.bucket, 'ruta', m.path)
          ) order by it.sort_order)
          from public.portfolio_items it
          join public.media_assets m on m.id = it.media_id
          where it.professional_id = pro.id
        ), '[]'::jsonb)
      )
      from public.professionals pro
      where pro.owner_user_id = quien
    )
  ) into salida;

  return salida;
end;
$$;

revoke all on function public.export_own_account() from public, anon;
grant execute on function public.export_own_account() to authenticated;

comment on function public.export_own_account is
  'Todo lo tuyo, en un JSON. Lo que escribieron otros no entra. Ver ADR-028.';
