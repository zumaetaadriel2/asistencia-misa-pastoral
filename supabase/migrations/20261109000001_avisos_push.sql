-- =============================================
-- v1.10.0: avisos push (Web Push con VAPID)
-- =============================================
-- Al alumno: el sábado a las 7 p. m. cuando abre el envío, y el domingo a las 8 a. m. y el
-- lunes a las 6 p. m. solo si todavía no envió su foto. Al guía: el lunes a las 8 p. m. si
-- tiene fotos por revisar en sus comunidades.
--
-- Cada celular que activa los avisos deja aquí su "suscripción": la dirección que le da su
-- navegador en el servicio de avisos (Google, Apple, Mozilla o Microsoft) y sus claves. Los
-- textos no llevan datos del alumno. pg_cron llama a la Edge Function enviar-avisos, que pide
-- a quién avisar con avisos_para_enviar() y manda cada aviso.

create extension if not exists pg_net with schema extensions;

create table public.suscripciones_push (
  id bigint generated always as identity primary key,
  -- Dirección del celular en el servicio de avisos de su navegador
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  alumno_id bigint references public.alumnos on delete cascade,
  staff_id bigint references public.staff on delete cascade,
  creado_en timestamptz not null default now(),
  -- Cada celular es de un alumno o de alguien del staff
  check (num_nonnulls(alumno_id, staff_id) = 1)
);

-- Sin políticas ni permisos: solo se toca por las funciones de abajo
alter table public.suscripciones_push enable row level security;
revoke all on public.suscripciones_push from anon, authenticated;

-- ---------------------------------------------
-- Registrar y quitar
-- ---------------------------------------------

-- Guarda la suscripción de este celular (si ya existía, pasa a ser de quien la activa ahora).
-- Solo direcciones de los servicios de avisos: enviar-avisos hace una llamada a cada una, así
-- que aceptar cualquier URL permitiría usar nuestro servidor para llamar a otros sitios.
create function public._guardar_suscripcion(p_suscripcion jsonb, p_alumno_id bigint, p_staff_id bigint)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_endpoint text := p_suscripcion ->> 'endpoint';
  v_p256dh text := p_suscripcion -> 'keys' ->> 'p256dh';
  v_auth text := p_suscripcion -> 'keys' ->> 'auth';
begin
  if v_endpoint is null
    or length(v_endpoint) > 2048
    or v_endpoint !~ '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|android\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)/'
    or coalesce(v_p256dh, '') !~ '^[A-Za-z0-9_-]{20,200}=*$'
    or coalesce(v_auth, '') !~ '^[A-Za-z0-9_-]{10,100}=*$'
  then
    raise exception 'La suscripción de avisos no es válida.' using errcode = '22023';
  end if;

  insert into public.suscripciones_push (endpoint, p256dh, auth, alumno_id, staff_id)
  values (v_endpoint, v_p256dh, v_auth, p_alumno_id, p_staff_id)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        alumno_id = excluded.alumno_id,
        staff_id = excluded.staff_id;

  -- Como máximo 5 celulares por persona: se quitan los más antiguos
  delete from public.suscripciones_push s
  where s.id in (
    select v.id
    from public.suscripciones_push v
    where v.alumno_id is not distinct from p_alumno_id
      and v.staff_id is not distinct from p_staff_id
    order by v.id desc
    offset 5
  );
end;
$$;

-- El alumno activa los avisos con su código (mismo límite de intentos que identificar_alumno)
create function public.registrar_aviso_alumno(p_codigo text, p_suscripcion jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ip text := public._ip_cliente();
  v_alumno record;
begin
  if public._limite_intentos_superado(v_ip) then
    return jsonb_build_object('ok', false, 'error', 'demasiados_intentos');
  end if;

  select * into v_alumno from public._buscar_alumno(p_codigo);
  if not found then
    perform public._registrar_intento_fallido(v_ip);
    return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  end if;

  perform public._guardar_suscripcion(p_suscripcion, v_alumno.alumno_id, null);
  return jsonb_build_object('ok', true);
end;
$$;

-- El guía o el admin activa los avisos con su sesión
create function public.registrar_aviso_staff(p_suscripcion jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
begin
  if v_staff_id is null then
    raise exception 'Solo el staff puede activar estos avisos.' using errcode = '42501';
  end if;
  perform public._guardar_suscripcion(p_suscripcion, null, v_staff_id);
end;
$$;

-- Quita los avisos de este celular. La dirección es larga e imposible de adivinar: quien la
-- tiene es su dueño. Sirve también sin sesión (alumno) y al cerrar sesión (staff).
create function public.quitar_aviso(p_endpoint text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.suscripciones_push s where s.endpoint = p_endpoint;
$$;

-- ---------------------------------------------
-- A quién avisar (solo enviar-avisos, con service_role)
-- ---------------------------------------------

-- Una fila por celular. Los de alumno solo salen con el formulario abierto: así no se avisa
-- fuera del ciclo ni con el formulario forzado en «Cerrado».
create function public.avisos_para_enviar(p_tipo text)
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
stable
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

  else
    raise exception 'Tipo de aviso desconocido: %', p_tipo using errcode = '22023';
  end if;
end;
$$;

-- Borra las suscripciones que el servicio de avisos ya no reconoce (404 o 410)
create function public.quitar_suscripciones(p_ids bigint[])
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.suscripciones_push s where s.id = any(p_ids);
$$;

-- ---------------------------------------------
-- Envío programado
-- ---------------------------------------------

-- Llama a enviar-avisos. La dirección y la clave se leen de Vault; sin ellas (en local o en la
-- CI) no hace nada.
create function public._pedir_avisos(p_tipo text)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_url text;
  v_clave text;
begin
  select d.decrypted_secret into v_url from vault.decrypted_secrets d where d.name = 'avisos_url';
  select d.decrypted_secret into v_clave from vault.decrypted_secrets d where d.name = 'avisos_clave';
  if v_url is null or v_clave is null then
    return;
  end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('tipo', p_tipo),
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', v_clave),
    timeout_milliseconds := 60000
  );
end;
$$;

-- pg_cron va en hora UTC; Lima es UTC-5 todo el año
select cron.schedule('avisos-apertura', '0 0 * * 0', $$select public._pedir_avisos('apertura')$$); -- sábado 19:00
select cron.schedule('avisos-recordatorio', '0 13 * * 0', $$select public._pedir_avisos('recordatorio')$$); -- domingo 08:00
select cron.schedule('avisos-cierre', '0 23 * * 1', $$select public._pedir_avisos('cierre')$$); -- lunes 18:00
select cron.schedule('avisos-revision', '0 1 * * 2', $$select public._pedir_avisos('revision')$$); -- lunes 20:00

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------
-- Las funciones nuevas nacen ejecutables por todos: se quita y se concede solo lo necesario.
-- service_role conserva su permiso.

revoke execute on function
  public._guardar_suscripcion(jsonb, bigint, bigint),
  public.registrar_aviso_alumno(text, jsonb),
  public.registrar_aviso_staff(jsonb),
  public.quitar_aviso(text),
  public.avisos_para_enviar(text),
  public.quitar_suscripciones(bigint[]),
  public._pedir_avisos(text)
from public, anon, authenticated;

-- El alumno con sesión de staff en el mismo celular usa el cliente sin sesión: basta con anon
grant execute on function public.registrar_aviso_alumno(text, jsonb) to anon;
grant execute on function public.registrar_aviso_staff(jsonb) to authenticated;
grant execute on function public.quitar_aviso(text) to anon, authenticated;
