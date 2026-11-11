-- =============================================
-- v1.12.0: aviso cuando rechazan la foto
-- =============================================
-- Si el guía rechaza la foto, el alumno con avisos activados recibe uno para mandar otra
-- mientras todavía puede (hasta el miércoles 23:59). Sale en lotes cada 15 minutos y solo para
-- rechazos de hace más de 2 minutos: es el tiempo en que el guía puede deshacer su revisión.
-- El texto es genérico: el motivo lo escribió el guía y no viaja por el servicio de avisos; el
-- alumno lo ve en la app.

-- Cada foto rechazada se avisa una sola vez. Si el alumno manda otra y también la rechazan, es
-- otra foto y se vuelve a avisar.
create table public.rechazos_avisados (
  envio_id bigint primary key references public.envios_foto on delete cascade,
  avisado_en timestamptz not null default now()
);

-- Sin políticas ni permisos: solo la usan las funciones de abajo
alter table public.rechazos_avisados enable row level security;
revoke all on public.rechazos_avisados from anon, authenticated;

-- ---------------------------------------------
-- Qué rechazos avisar
-- ---------------------------------------------

-- Rechazos de esta semana que todavía se pueden corregir, ya firmes (pasaron los 2 minutos de
-- "Deshacer") y sin avisar. revisado_en es la hora real del rechazo (now()), como en revisar_asistencia.
create function public._rechazos_por_avisar()
returns table (alumno_id bigint, envio_id bigint)
language sql
stable
set search_path = ''
as $$
  select a.alumno_id, a.envio_actual_id
  from public.asistencias a
  join public.alumnos al on al.id = a.alumno_id and al.activo
  join public.comunidades c on c.id = al.comunidad_id and c.activa
  join public.ciclos ci on ci.id = a.ciclo_id and ci.activo
  cross join public.estado_formulario() e
  where a.estado = 'rechazado'
    and a.actividad = 'misa'
    and a.envio_actual_id is not null
    -- Solo se puede reenviar la foto de la semana del formulario, y mientras dure el reenvío
    and a.semana_numero = e.semana
    and e.reenvio_abierto
    and a.revisado_en < now() - interval '2 minutes'
    and not exists (select 1 from public.rechazos_avisados r where r.envio_id = a.envio_actual_id);
$$;

-- ---------------------------------------------
-- A quién avisar: se suma el tipo "rechazo"
-- ---------------------------------------------
-- Pasa a volatile: con "rechazo" deja marcadas las fotos que avisa, para no repetirlas.

create or replace function public.avisos_para_enviar(p_tipo text)
returns table (
  suscripcion_id bigint,
  endpoint text,
  p256dh text,
  auth text,
  titulo text,
  cuerpo text,
  url text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_estado record;
begin
  if p_tipo in ('apertura', 'recordatorio', 'cierre') then
    select * into v_estado from public.estado_formulario();
    if not coalesce(v_estado.abierto, false) then
      return;
    end if;

    return query
    select
      s.id,
      s.endpoint,
      s.p256dh,
      s.auth,
      'Mi Misa PS'::text,
      case p_tipo
        when 'apertura' then 'Ya puedes subir tu foto de misa de este fin de semana.'
        when 'recordatorio' then '¿Ya fuiste a misa? Recuerda subir tu foto de este fin de semana.'
        else 'Te falta tu foto de esta semana: el envío cierra hoy a las 11:59 p. m.'
      end,
      '/alumno'::text
    from public.suscripciones_push s
    join public.alumnos a on a.id = s.alumno_id and a.activo
    join public.comunidades c on c.id = a.comunidad_id and c.activa
    join public.ciclos ci on ci.id = c.ciclo_id and ci.activo
    -- El sábado se avisa a todos; después, solo a quien todavía no envió nada
    where p_tipo = 'apertura'
      or not exists (
        select 1
        from public.asistencias r
        where r.alumno_id = a.id
          and r.actividad = 'misa'
          and r.semana_numero = v_estado.semana
      );

  elsif p_tipo = 'revision' then
    return query
    with pendientes as (
      select c.id as comunidad_id, c.nombre, count(*) as cantidad
      from public.asistencias r
      join public.alumnos a on a.id = r.alumno_id
      join public.comunidades c on c.id = a.comunidad_id and c.activa
      join public.ciclos ci on ci.id = c.ciclo_id and ci.activo
      where r.estado = 'pendiente'
        and r.actividad = 'misa'
      group by c.id, c.nombre
    ),
    por_staff as (
      -- El admin ve todas las comunidades; el guía, solo donde es guía
      select st.id as staff_id, sum(p.cantidad) as total, null::text as comunidades
      from public.staff st
      cross join pendientes p
      where st.activo and st.rol = 'admin'
      group by st.id
      union all
      select st.id, sum(p.cantidad), string_agg(p.nombre, ', ' order by p.nombre)
      from public.staff st
      join public.staff_comunidades sc on sc.staff_id = st.id and sc.funcion = 'guia'
      join pendientes p on p.comunidad_id = sc.comunidad_id
      where st.activo and st.rol <> 'admin'
      group by st.id
    )
    select
      s.id,
      s.endpoint,
      s.p256dh,
      s.auth,
      'Mi Misa PS'::text,
      case
        when ps.comunidades is null then
          format('Hay %s %s por revisar en todas las comunidades.', ps.total, case ps.total when 1 then 'foto' else 'fotos' end)
        else
          format('Tienes %s %s por revisar en %s.', ps.total, case ps.total when 1 then 'foto' else 'fotos' end, ps.comunidades)
      end,
      '/dashboard'::text
    from public.suscripciones_push s
    join por_staff ps on ps.staff_id = s.staff_id;

  elsif p_tipo = 'rechazo' then
    -- Se marcan solo las fotos de alumnos con avisos activados: si alguien los activa después,
    -- todavía le llega el aviso de su rechazo de esta semana
    return query
    with por_avisar as (
      select distinct p.alumno_id, p.envio_id
      from public._rechazos_por_avisar() p
      where exists (select 1 from public.suscripciones_push s where s.alumno_id = p.alumno_id)
    ),
    marcados as (
      insert into public.rechazos_avisados (envio_id)
      select pa.envio_id from por_avisar pa
      on conflict do nothing
      returning rechazos_avisados.envio_id
    )
    select
      s.id,
      s.endpoint,
      s.p256dh,
      s.auth,
      'Mi Misa PS'::text,
      'Tu foto de esta semana fue rechazada. Entra para ver el motivo y enviar otra hasta el miércoles a las 11:59 p. m.'::text,
      '/alumno'::text
    from marcados m
    join por_avisar pa on pa.envio_id = m.envio_id
    join public.suscripciones_push s on s.alumno_id = pa.alumno_id;

  else
    raise exception 'Tipo de aviso desconocido: %', p_tipo using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------
-- Envío programado
-- ---------------------------------------------

-- Cada 15 minutos, pero solo llama a enviar-avisos si de verdad hay a quién avisar
create function public._avisar_rechazos()
returns void
language plpgsql
volatile
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public._rechazos_por_avisar() p
    join public.suscripciones_push s on s.alumno_id = p.alumno_id
  ) then
    perform public._pedir_avisos('rechazo');
  end if;
end;
$$;

select cron.schedule('avisos-rechazo', '*/15 * * * *', $$select public._avisar_rechazos()$$);

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------
-- Las funciones nuevas nacen ejecutables por todos: se quita. avisos_para_enviar conserva los
-- suyos (create or replace no los cambia): solo service_role.

revoke execute on function
  public._rechazos_por_avisar(),
  public._avisar_rechazos()
from public, anon, authenticated;
