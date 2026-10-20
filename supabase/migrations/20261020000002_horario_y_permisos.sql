-- =============================================
-- Horario del formulario (hora de Lima) y funciones de permisos
-- =============================================

-- ---------------------------------------------
-- Reloj
-- ---------------------------------------------

-- Hora actual. Los tests la simulan con `set_config('app.ahora', ...)`; los clientes
-- (PostgREST / supabase-js) no pueden cambiar esa variable.
create function public.momento_actual()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.ahora', true), '')::timestamptz, now());
$$;

-- Primer domingo en o después de una fecha: es el domingo de la semana 1
create function public.primer_domingo(p_fecha date)
returns date
language sql
immutable
set search_path = ''
as $$
  select p_fecha + ((7 - extract(dow from p_fecha)::int) % 7);
$$;

-- Domingo al que corresponde un día:
--   jue, vie, sáb -> el domingo que viene (la misa de sábado en la noche cuenta para ese domingo)
--   dom           -> ese mismo domingo
--   lun, mar, mié -> el domingo anterior (cierre del lunes y reenvíos hasta el miércoles)
create function public.domingo_de_referencia(p_fecha date)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when extract(dow from p_fecha)::int >= 4 then p_fecha + (7 - extract(dow from p_fecha)::int)
    else p_fecha - extract(dow from p_fecha)::int
  end;
$$;

-- Número de semana (1-indexado) de un domingo dentro del ciclo
create function public.semana_de_domingo(p_fecha_inicio date, p_domingo date)
returns int
language sql
immutable
set search_path = ''
as $$
  select ((p_domingo - public.primer_domingo(p_fecha_inicio)) / 7) + 1;
$$;

-- ---------------------------------------------
-- Estado del formulario para el ciclo activo
-- ---------------------------------------------
-- Envío nuevo: sábado 19:00 -> lunes 23:59:59.
-- Reenvío de una foto rechazada: hasta el miércoles 23:59:59.
-- `abierto_manual` true/false fuerza ambos; null = horario automático.

create function public.estado_formulario()
returns table (
  ciclo_id bigint,
  ciclo_nombre text,
  semana int,
  en_curso boolean,
  abierto boolean,
  reenvio_abierto boolean,
  manual boolean,
  cierre_envio timestamptz,
  cierre_reenvio timestamptz,
  proxima_apertura timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ciclo public.ciclos;
  v_local timestamp;
  v_fecha date;
  v_dow int;
  v_domingo date;
  v_domingo_inicio date;
  v_en_ventana boolean;
  v_en_reenvio boolean;
begin
  select * into v_ciclo from public.ciclos c where c.activo limit 1;
  if not found then
    return;
  end if;

  v_local := public.momento_actual() at time zone 'America/Lima';
  v_fecha := v_local::date;
  v_dow := extract(dow from v_fecha)::int;
  v_domingo := public.domingo_de_referencia(v_fecha);
  v_domingo_inicio := public.primer_domingo(v_ciclo.fecha_inicio);

  ciclo_id := v_ciclo.id;
  ciclo_nombre := v_ciclo.nombre;
  semana := greatest(public.semana_de_domingo(v_ciclo.fecha_inicio, v_domingo), 0);
  en_curso := v_domingo >= v_domingo_inicio and v_domingo <= v_ciclo.fecha_fin;
  manual := v_ciclo.abierto_manual is not null;

  v_en_ventana := (v_dow = 6 and v_local::time >= time '19:00') or v_dow in (0, 1);
  v_en_reenvio := v_en_ventana or v_dow in (2, 3);

  if manual then
    abierto := en_curso and v_ciclo.abierto_manual;
    reenvio_abierto := abierto;
  else
    abierto := en_curso and v_en_ventana;
    reenvio_abierto := en_curso and v_en_reenvio;
  end if;

  cierre_envio := case
    when abierto and not manual
      then ((v_domingo + 1) + time '23:59:59') at time zone 'America/Lima'
  end;
  cierre_reenvio := case
    when reenvio_abierto and not manual
      then ((v_domingo + 3) + time '23:59:59') at time zone 'America/Lima'
  end;

  proxima_apertura := case
    when abierto or manual then null
    -- El ciclo aún no empieza: abre el sábado anterior al primer domingo
    when v_domingo < v_domingo_inicio
      then ((v_domingo_inicio - 1) + time '19:00') at time zone 'America/Lima'
    -- El ciclo ya terminó
    when v_domingo > v_ciclo.fecha_fin then null
    -- Próximo sábado a las 19:00 (hoy mismo si es sábado antes de esa hora)
    else ((v_fecha + ((6 - v_dow + 7) % 7)) + time '19:00') at time zone 'America/Lima'
  end;

  return next;
end;
$$;

-- ---------------------------------------------
-- Permisos del staff (se identifica por el email del JWT de Google)
-- ---------------------------------------------

create function public.staff_actual_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.staff s
  where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and s.activo;
$$;

create function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff s
    where s.id = public.staff_actual_id()
      and s.rol = 'admin'
  );
$$;

create function public.es_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_actual_id() is not null;
$$;

-- Admin, o guía asignado a esa comunidad
create function public.es_staff_de(p_comunidad_id bigint)
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

create function public.es_staff_de_alumno(p_alumno_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.es_staff_de(
    (select a.comunidad_id from public.alumnos a where a.id = p_alumno_id)
  );
$$;
