-- =============================================
-- Fase 7: asistencia a catequesis (pasar lista)
-- =============================================
-- 1. La función de cada persona va por comunidad (staff_comunidades.funcion):
--    guía (fotos, misa, códigos y pasar lista) o catequista (solo pasar lista).
--    Una persona puede ser guía en una comunidad y catequista en otra.
-- 2. es_staff_de pasa a significar "admin o guía de esa comunidad": todo lo de misa,
--    fotos y códigos queda cerrado al catequista sin tocar cada política ni cada RPC.
--    Pasar lista usa puede_pasar_lista (admin, guía o catequista de esa comunidad).
-- 3. Sesiones por fecha (la clase del sábado, eventos del domingo) y sus marcas, que
--    solo se escriben por RPC. Lo que no se marca queda "sin marcar" (no hay faltas solas).
-- 4. identificar_alumno devuelve también su catequesis.
--
-- El enum `actividad` del esquema inicial ya tenía 'catequesis', pero no se usa:
-- la catequesis va en sus propias tablas y `asistencias` sigue siendo solo de misa.

create type public.funcion_comunidad as enum ('guia', 'catequista');
create type public.estado_catequesis as enum ('presente', 'tardanza', 'falta', 'justificada');

-- Las asignaciones que ya existían quedan como guía: nada cambia para quien ya usa la app
alter table public.staff_comunidades
  add column funcion public.funcion_comunidad not null default 'guia';

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------

-- Admin, o guía de esa comunidad: fotos, asistencias de misa, alumnos y sus códigos
create or replace function public.es_staff_de(p_comunidad_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_admin() or exists (
    select 1
    from public.staff_comunidades sc
    where sc.staff_id = public.staff_actual_id()
      and sc.comunidad_id = p_comunidad_id
      and sc.funcion = 'guia'
  );
$$;

-- Admin, o guía o catequista de esa comunidad
create function public.puede_pasar_lista(p_comunidad_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_admin() or exists (
    select 1
    from public.staff_comunidades sc
    where sc.staff_id = public.staff_actual_id()
      and sc.comunidad_id = p_comunidad_id
  );
$$;

-- El catequista necesita ver sus comunidades (nombre y programa) para pasar lista
create policy "staff ve las comunidades donde pasa lista"
  on public.comunidades for select to authenticated
  using (public.puede_pasar_lista(id));

-- Al copiar las comunidades al ciclo nuevo, cada persona mantiene su función
create or replace function public.copiar_comunidades(p_desde_ciclo_id bigint, p_hacia_ciclo_id bigint)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_creadas int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede copiar comunidades.' using errcode = '42501';
  end if;
  if p_desde_ciclo_id = p_hacia_ciclo_id then
    raise exception 'Elige dos ciclos distintos.';
  end if;

  insert into public.comunidades (ciclo_id, programa, nombre, activa)
  select p_hacia_ciclo_id, c.programa, c.nombre, true
  from public.comunidades c
  where c.ciclo_id = p_desde_ciclo_id and c.activa
  on conflict (ciclo_id, programa, nombre) do nothing;
  get diagnostics v_creadas = row_count;

  -- Guías y catequistas siguen a cargo de las comunidades con el mismo programa y nombre
  insert into public.staff_comunidades (staff_id, comunidad_id, funcion)
  select sc.staff_id, nueva.id, sc.funcion
  from public.staff_comunidades sc
  join public.comunidades vieja on vieja.id = sc.comunidad_id and vieja.ciclo_id = p_desde_ciclo_id
  join public.comunidades nueva
    on nueva.ciclo_id = p_hacia_ciclo_id
   and nueva.programa = vieja.programa
   and nueva.nombre = vieja.nombre
  on conflict do nothing;

  return v_creadas;
end;
$$;

-- Perfil del staff: además del rol, si es guía o catequista en alguna comunidad del
-- ciclo activo (decide qué secciones ve). Cambia el tipo de retorno: hay que recrearla.
drop function public.mi_perfil_staff();

create function public.mi_perfil_staff()
returns table (
  id bigint,
  nombre text,
  rol public.rol_staff,
  ciclo_nombre text,
  semana_reciente int,
  es_guia boolean,
  es_catequista boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.nombre,
    s.rol,
    (select c.nombre from public.ciclos c where c.activo limit 1),
    public.semana_reciente(),
    s.rol = 'admin' or exists (
      select 1
      from public.staff_comunidades sc
      join public.comunidades c on c.id = sc.comunidad_id
      join public.ciclos ci on ci.id = c.ciclo_id and ci.activo
      where sc.staff_id = s.id and sc.funcion = 'guia'
    ),
    exists (
      select 1
      from public.staff_comunidades sc
      join public.comunidades c on c.id = sc.comunidad_id
      join public.ciclos ci on ci.id = c.ciclo_id and ci.activo
      where sc.staff_id = s.id and sc.funcion = 'catequista'
    )
  from public.staff s
  where s.id = public.staff_actual_id();
$$;

-- ---------------------------------------------
-- Tablas
-- ---------------------------------------------

create table public.sesiones_catequesis (
  id bigint generated always as identity primary key,
  comunidad_id bigint not null references public.comunidades on delete cascade,
  fecha date not null,
  titulo text not null default 'Catequesis',
  creada_por bigint references public.staff on delete set null,
  creado_en timestamptz not null default now(),
  constraint sesiones_catequesis_titulo check (titulo = btrim(titulo) and char_length(titulo) between 1 and 80)
);

-- Puede haber clase el sábado y un "Retiro" el domingo, pero no dos sesiones iguales
create unique index sesiones_catequesis_unica
  on public.sesiones_catequesis (comunidad_id, fecha, lower(titulo));

create table public.asistencias_catequesis (
  sesion_id bigint not null references public.sesiones_catequesis on delete cascade,
  alumno_id bigint not null references public.alumnos on delete cascade,
  estado public.estado_catequesis not null,
  -- Solo para las justificadas: lo ve el alumno
  motivo text,
  marcado_por bigint references public.staff on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (sesion_id, alumno_id),
  constraint asistencias_catequesis_motivo check (
    (estado = 'justificada' and motivo is not null and char_length(btrim(motivo)) between 1 and 300)
    or (estado <> 'justificada' and motivo is null)
  )
);

create index asistencias_catequesis_alumno_idx on public.asistencias_catequesis (alumno_id);

create trigger asistencias_catequesis_actualizado_en
  before update on public.asistencias_catequesis
  for each row execute function public.tocar_actualizado_en();

create function public.puede_pasar_lista_sesion(p_sesion_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.puede_pasar_lista(
    (select s.comunidad_id from public.sesiones_catequesis s where s.id = p_sesion_id)
  );
$$;

-- Solo lectura desde la app; las escrituras van por las RPC de abajo
alter table public.sesiones_catequesis enable row level security;
alter table public.asistencias_catequesis enable row level security;
revoke all on public.sesiones_catequesis, public.asistencias_catequesis from anon, authenticated;
grant select on public.sesiones_catequesis, public.asistencias_catequesis to authenticated;

create policy "staff ve las sesiones donde pasa lista"
  on public.sesiones_catequesis for select to authenticated
  using (public.puede_pasar_lista(comunidad_id));

create policy "staff ve las marcas de sus sesiones"
  on public.asistencias_catequesis for select to authenticated
  using (public.puede_pasar_lista_sesion(sesion_id));

-- ---------------------------------------------
-- Ayudas internas (sin permiso de ejecución para la app)
-- ---------------------------------------------

-- Título limpio: sin espacios de más; vacío = "Catequesis"
create function public._titulo_sesion(p_titulo text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_titulo text := regexp_replace(btrim(coalesce(p_titulo, '')), '\s+', ' ', 'g');
begin
  if v_titulo = '' then
    return 'Catequesis';
  end if;
  if char_length(v_titulo) > 80 then
    raise exception 'El nombre de la sesión es muy largo (máximo 80 caracteres).';
  end if;
  return v_titulo;
end;
$$;

-- La comunidad debe estar activa en el ciclo activo y la fecha, dentro del ciclo y no futura
create function public._validar_fecha_sesion(p_comunidad_id bigint, p_fecha date)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ciclo public.ciclos;
begin
  select ci.* into v_ciclo
  from public.comunidades c
  join public.ciclos ci on ci.id = c.ciclo_id
  where c.id = p_comunidad_id and c.activa and ci.activo;
  if not found then
    raise exception 'La comunidad no está activa en el ciclo actual.';
  end if;

  if p_fecha is null or p_fecha < v_ciclo.fecha_inicio or p_fecha > v_ciclo.fecha_fin then
    raise exception 'La fecha debe estar dentro del ciclo (% al %).', v_ciclo.fecha_inicio, v_ciclo.fecha_fin;
  end if;
  if p_fecha > (public.momento_actual() at time zone 'America/Lima')::date then
    raise exception 'No se puede pasar lista de una fecha futura.';
  end if;
end;
$$;

-- ---------------------------------------------
-- Sesiones
-- ---------------------------------------------

-- Crea la sesión (o devuelve la que ya existe con esa fecha y nombre). Sin fecha: hoy en Lima.
create function public.crear_sesion_catequesis(
  p_comunidad_id bigint,
  p_fecha date default null,
  p_titulo text default 'Catequesis'
)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_fecha date := coalesce(p_fecha, (public.momento_actual() at time zone 'America/Lima')::date);
  v_titulo text := public._titulo_sesion(p_titulo);
  v_id bigint;
begin
  if v_staff_id is null then
    raise exception 'No tienes permisos de staff.' using errcode = '42501';
  end if;
  if not public.puede_pasar_lista(p_comunidad_id) then
    raise exception 'Comunidad no encontrada.' using errcode = 'P0002';
  end if;
  perform public._validar_fecha_sesion(p_comunidad_id, v_fecha);

  insert into public.sesiones_catequesis (comunidad_id, fecha, titulo, creada_por)
  values (p_comunidad_id, v_fecha, v_titulo, v_staff_id)
  on conflict (comunidad_id, fecha, lower(titulo)) do nothing
  returning id into v_id;

  if v_id is null then
    select s.id into v_id
    from public.sesiones_catequesis s
    where s.comunidad_id = p_comunidad_id and s.fecha = v_fecha and lower(s.titulo) = lower(v_titulo);
  end if;
  return v_id;
end;
$$;

-- El admin crea un evento (retiro, misa especial…) para varias comunidades a la vez
create function public.crear_evento_catequesis(p_comunidades bigint[], p_fecha date, p_titulo text)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_titulo text := public._titulo_sesion(p_titulo);
  v_comunidad_id bigint;
  v_creadas int := 0;
  v_filas int;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede crear eventos para varias comunidades.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_comunidades), 0) = 0 then
    raise exception 'Elige al menos una comunidad.';
  end if;

  foreach v_comunidad_id in array (select array_agg(distinct x) from unnest(p_comunidades) x) loop
    perform public._validar_fecha_sesion(v_comunidad_id, p_fecha);
    insert into public.sesiones_catequesis (comunidad_id, fecha, titulo, creada_por)
    values (v_comunidad_id, p_fecha, v_titulo, v_staff_id)
    on conflict (comunidad_id, fecha, lower(titulo)) do nothing;
    get diagnostics v_filas = row_count;
    v_creadas := v_creadas + v_filas;
  end loop;

  return v_creadas;
end;
$$;

-- Corrige la fecha o el nombre de una sesión (mismas reglas que al crearla)
create function public.editar_sesion_catequesis(p_sesion_id bigint, p_fecha date, p_titulo text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_comunidad_id bigint;
  v_titulo text := public._titulo_sesion(p_titulo);
begin
  if not public.es_staff() then
    raise exception 'No tienes permisos de staff.' using errcode = '42501';
  end if;
  select s.comunidad_id into v_comunidad_id from public.sesiones_catequesis s where s.id = p_sesion_id;
  if not found or not public.puede_pasar_lista(v_comunidad_id) then
    raise exception 'Sesión no encontrada.' using errcode = 'P0002';
  end if;
  perform public._validar_fecha_sesion(v_comunidad_id, p_fecha);

  update public.sesiones_catequesis
  set fecha = p_fecha, titulo = v_titulo
  where id = p_sesion_id;
exception
  when unique_violation then
    raise exception 'Ya hay una sesión con ese nombre en esa fecha.';
end;
$$;

-- Borra una sesión con sus marcas (por si se creó por error): quien la creó o un admin
create function public.borrar_sesion_catequesis(p_sesion_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sesion public.sesiones_catequesis;
begin
  select * into v_sesion from public.sesiones_catequesis s where s.id = p_sesion_id;
  if not found or not public.puede_pasar_lista(v_sesion.comunidad_id) then
    raise exception 'Sesión no encontrada.' using errcode = 'P0002';
  end if;
  if not public.es_admin() and v_sesion.creada_por is distinct from public.staff_actual_id() then
    raise exception 'Solo quien creó la sesión o un administrador puede borrarla.' using errcode = '42501';
  end if;

  delete from public.sesiones_catequesis where id = p_sesion_id;
end;
$$;

-- Sesiones de una comunidad (la más reciente primero) con cuántos hay de cada estado
create function public.sesiones_de_comunidad(p_comunidad_id bigint)
returns table (
  id bigint,
  fecha date,
  titulo text,
  creada_por bigint,
  presentes int,
  tardanzas int,
  faltas int,
  justificadas int,
  alumnos_activos int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.puede_pasar_lista(p_comunidad_id) then
    raise exception 'Comunidad no encontrada.' using errcode = 'P0002';
  end if;

  return query
  select
    s.id,
    s.fecha,
    s.titulo,
    s.creada_por,
    count(*) filter (where ac.estado = 'presente')::int,
    count(*) filter (where ac.estado = 'tardanza')::int,
    count(*) filter (where ac.estado = 'falta')::int,
    count(*) filter (where ac.estado = 'justificada')::int,
    (select count(*)::int from public.alumnos a where a.comunidad_id = p_comunidad_id and a.activo)
  from public.sesiones_catequesis s
  left join public.asistencias_catequesis ac on ac.sesion_id = s.id
  where s.comunidad_id = p_comunidad_id
  group by s.id
  order by s.fecha desc, s.id desc;
end;
$$;

-- ---------------------------------------------
-- Pasar lista
-- ---------------------------------------------

-- Alumnos activos de la sesión con su marca (sin el código: el catequista no lo necesita)
create function public.lista_de_sesion(p_sesion_id bigint)
returns table (
  alumno_id bigint,
  nombre_completo text,
  estado public.estado_catequesis,
  motivo text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.puede_pasar_lista_sesion(p_sesion_id) then
    raise exception 'Sesión no encontrada.' using errcode = 'P0002';
  end if;

  return query
  select a.id, a.nombre_completo, ac.estado, ac.motivo
  from public.sesiones_catequesis s
  join public.alumnos a on a.comunidad_id = s.comunidad_id and a.activo
  left join public.asistencias_catequesis ac on ac.sesion_id = s.id and ac.alumno_id = a.id
  where s.id = p_sesion_id
  order by a.nombre_completo;
end;
$$;

-- Marca, cambia o (con p_estado null) borra la marca de un alumno en una sesión
create function public.marcar_catequesis(
  p_sesion_id bigint,
  p_alumno_id bigint,
  p_estado public.estado_catequesis,
  p_motivo text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
begin
  if v_staff_id is null then
    raise exception 'No tienes permisos de staff.' using errcode = '42501';
  end if;
  if not public.puede_pasar_lista_sesion(p_sesion_id) then
    raise exception 'Sesión no encontrada.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1
    from public.sesiones_catequesis s
    join public.alumnos a on a.comunidad_id = s.comunidad_id
    where s.id = p_sesion_id and a.id = p_alumno_id and a.activo
  ) then
    raise exception 'Alumno no encontrado.' using errcode = 'P0002';
  end if;

  if p_estado is null then
    delete from public.asistencias_catequesis where sesion_id = p_sesion_id and alumno_id = p_alumno_id;
    return;
  end if;

  if p_estado = 'justificada' then
    if v_motivo is null then
      raise exception 'Indica el motivo de la justificación.';
    end if;
    if char_length(v_motivo) > 300 then
      raise exception 'El motivo es muy largo (máximo 300 caracteres).';
    end if;
  else
    v_motivo := null;
  end if;

  insert into public.asistencias_catequesis (sesion_id, alumno_id, estado, motivo, marcado_por)
  values (p_sesion_id, p_alumno_id, p_estado, v_motivo, v_staff_id)
  on conflict (sesion_id, alumno_id) do update
    set estado = excluded.estado,
        motivo = excluded.motivo,
        marcado_por = excluded.marcado_por;
end;
$$;

-- Marca como presentes a los alumnos activos que aún no tienen marca (no pisa las demás)
create function public.marcar_todos_presentes(p_sesion_id bigint)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_marcados int;
begin
  if v_staff_id is null then
    raise exception 'No tienes permisos de staff.' using errcode = '42501';
  end if;
  if not public.puede_pasar_lista_sesion(p_sesion_id) then
    raise exception 'Sesión no encontrada.' using errcode = 'P0002';
  end if;

  insert into public.asistencias_catequesis (sesion_id, alumno_id, estado, marcado_por)
  select s.id, a.id, 'presente', v_staff_id
  from public.sesiones_catequesis s
  join public.alumnos a on a.comunidad_id = s.comunidad_id and a.activo
  where s.id = p_sesion_id
  on conflict (sesion_id, alumno_id) do nothing;
  get diagnostics v_marcados = row_count;

  return v_marcados;
end;
$$;

-- Alumnos de la comunidad con todas sus marcas (para la tabla y el Excel).
-- Un alumno sin marcas sale una vez con sesion_id null.
create function public.resumen_catequesis(p_comunidad_id bigint)
returns table (
  alumno_id bigint,
  nombre_completo text,
  activo boolean,
  sesion_id bigint,
  estado public.estado_catequesis,
  motivo text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.puede_pasar_lista(p_comunidad_id) then
    raise exception 'Comunidad no encontrada.' using errcode = 'P0002';
  end if;

  return query
  select a.id, a.nombre_completo, a.activo, ac.sesion_id, ac.estado, ac.motivo
  from public.alumnos a
  left join public.asistencias_catequesis ac
    on ac.alumno_id = a.id
   and ac.sesion_id in (select s.id from public.sesiones_catequesis s where s.comunidad_id = p_comunidad_id)
  where a.comunidad_id = p_comunidad_id
  order by a.nombre_completo, ac.sesion_id;
end;
$$;

-- ---------------------------------------------
-- El alumno ve también su catequesis
-- ---------------------------------------------
-- Misma firma y atributos que antes (conserva el permiso de anon).

create or replace function public.identificar_alumno(p_codigo text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ip text := public._ip_cliente();
  v_alumno record;
  v_estado record;
  v_actual public.asistencias;
  v_inicio date;
  v_semanas jsonb;
  v_catequesis jsonb;
  v_accion text;
begin
  if public._limite_intentos_superado(v_ip) then
    return jsonb_build_object('ok', false, 'error', 'demasiados_intentos');
  end if;

  select * into v_alumno from public._buscar_alumno(p_codigo);
  if not found then
    perform public._registrar_intento_fallido(v_ip);
    return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  end if;

  select * into v_estado from public.estado_formulario();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'sin_ciclo_activo');
  end if;

  select ci.fecha_inicio into v_inicio from public.ciclos ci where ci.id = v_alumno.ciclo_id;

  select * into v_actual
  from public.asistencias a
  where a.alumno_id = v_alumno.alumno_id
    and a.actividad = 'misa'
    and a.semana_numero = v_estado.semana;

  v_accion := case
    when v_estado.semana < 1 then null
    when v_actual.id is null and v_estado.abierto then 'enviar'
    when v_actual.estado = 'rechazado' and v_estado.reenvio_abierto then 'reenviar'
  end;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'semana', s.n,
        'domingo', public.primer_domingo(v_inicio) + (s.n - 1) * 7,
        'estado', coalesce(a.estado::text, 'sin_registro'),
        'motivo', case when a.estado in ('rechazado', 'justificada') then a.motivo end
      )
      order by s.n desc
    ),
    '[]'::jsonb
  )
  into v_semanas
  from generate_series(1, v_estado.semana) as s(n)
  left join public.asistencias a
    on a.alumno_id = v_alumno.alumno_id
   and a.actividad = 'misa'
   and a.semana_numero = s.n;

  -- Sesiones de catequesis de su comunidad, la más reciente primero
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'fecha', s.fecha,
        'titulo', s.titulo,
        'estado', coalesce(ac.estado::text, 'sin_marcar'),
        'motivo', ac.motivo
      )
      order by s.fecha desc, s.id desc
    ),
    '[]'::jsonb
  )
  into v_catequesis
  from public.sesiones_catequesis s
  left join public.asistencias_catequesis ac
    on ac.sesion_id = s.id
   and ac.alumno_id = v_alumno.alumno_id
  where s.comunidad_id = v_alumno.comunidad_id;

  return jsonb_build_object(
    'ok', true,
    'alumno', jsonb_build_object(
      'nombre_corto', public._nombre_corto(v_alumno.nombre_completo),
      'comunidad', v_alumno.comunidad,
      'programa', v_alumno.programa
    ),
    'formulario', to_jsonb(v_estado),
    'accion', v_accion,
    'semanas', v_semanas,
    'catequesis', v_catequesis
  );
end;
$$;

-- ---------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------
-- Las funciones nuevas nacen ejecutables por todos: se quita y se concede solo lo necesario.

revoke execute on function
  public.puede_pasar_lista(bigint),
  public.puede_pasar_lista_sesion(bigint),
  public.mi_perfil_staff(),
  public._titulo_sesion(text),
  public._validar_fecha_sesion(bigint, date),
  public.crear_sesion_catequesis(bigint, date, text),
  public.crear_evento_catequesis(bigint[], date, text),
  public.editar_sesion_catequesis(bigint, date, text),
  public.borrar_sesion_catequesis(bigint),
  public.sesiones_de_comunidad(bigint),
  public.lista_de_sesion(bigint),
  public.marcar_catequesis(bigint, bigint, public.estado_catequesis, text),
  public.marcar_todos_presentes(bigint),
  public.resumen_catequesis(bigint)
from public, anon, authenticated;

-- Usadas por las políticas RLS
grant execute on function
  public.puede_pasar_lista(bigint),
  public.puede_pasar_lista_sesion(bigint)
to authenticated;

grant execute on function
  public.mi_perfil_staff(),
  public.crear_sesion_catequesis(bigint, date, text),
  public.crear_evento_catequesis(bigint[], date, text),
  public.editar_sesion_catequesis(bigint, date, text),
  public.borrar_sesion_catequesis(bigint),
  public.sesiones_de_comunidad(bigint),
  public.lista_de_sesion(bigint),
  public.marcar_catequesis(bigint, bigint, public.estado_catequesis, text),
  public.marcar_todos_presentes(bigint),
  public.resumen_catequesis(bigint)
to authenticated;
