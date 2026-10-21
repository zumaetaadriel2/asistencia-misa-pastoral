-- =============================================
-- Panel de revisión del staff
-- =============================================
-- 1. En producción solo se entra con Google: el hook rechaza otros proveedores
--    salvo que `ajustes.permitir_login_correo` esté activo (solo lo activa el seed local).
-- 2. mi_perfil_staff: quién soy, mi rol y la semana de la última misa.
-- 3. cola_revision: fotos pendientes con la foto anterior del alumno y la parecida.
-- 4. resumen_semana: estado de cada alumno en una semana (para el resumen de WhatsApp).

-- ---------------------------------------------
-- Ajustes
-- ---------------------------------------------

create table public.ajustes (
  id int primary key default 1 check (id = 1),
  -- Solo para desarrollo local: en producción el staff entra únicamente con Google
  permitir_login_correo boolean not null default false
);

insert into public.ajustes default values;

alter table public.ajustes enable row level security;
revoke all on public.ajustes from anon, authenticated;

create or replace function public.hook_antes_de_crear_usuario(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_proveedor text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '');
begin
  if v_proveedor <> 'google'
    and not (select a.permitir_login_correo from public.ajustes a where a.id = 1) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Solo se puede entrar con una cuenta de Google.'
      )
    );
  end if;

  if exists (
    select 1
    from public.staff s
    where lower(s.email) = lower(coalesce(event -> 'user' ->> 'email', ''))
      and s.activo
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Tu correo no está registrado como staff de la pastoral. Pide al administrador que lo agregue.'
    )
  );
end;
$$;

-- ---------------------------------------------
-- Semana de la última misa (el domingo más reciente, o hoy si es domingo)
-- ---------------------------------------------

create function public.semana_reciente()
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ciclo public.ciclos;
  v_fecha date;
begin
  select * into v_ciclo from public.ciclos c where c.activo limit 1;
  if not found then
    return null;
  end if;

  v_fecha := (public.momento_actual() at time zone 'America/Lima')::date;
  return greatest(
    public.semana_de_domingo(v_ciclo.fecha_inicio, v_fecha - extract(dow from v_fecha)::int),
    0
  );
end;
$$;

-- ---------------------------------------------
-- Perfil del staff que inició sesión (vacío si no es staff)
-- ---------------------------------------------

create function public.mi_perfil_staff()
returns table (
  id bigint,
  nombre text,
  rol public.rol_staff,
  ciclo_nombre text,
  semana_reciente int
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
    public.semana_reciente()
  from public.staff s
  where s.id = public.staff_actual_id();
$$;

-- ---------------------------------------------
-- Cola de revisión: RLS decide qué comunidades ve cada uno (security invoker)
-- ---------------------------------------------

create function public.cola_revision()
returns table (
  asistencia_id bigint,
  semana int,
  -- Domingo de esa semana (para juzgar la fecha de la cámara)
  domingo date,
  alumno_id bigint,
  alumno text,
  comunidad_id bigint,
  comunidad text,
  programa public.programa,
  envio_id bigint,
  enviado_en timestamptz,
  fecha_exif timestamptz,
  similar_envio_id bigint,
  similar_alumno text,
  similar_semana int,
  distancia_similar int,
  anterior_envio_id bigint,
  anterior_semana int
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.semana_numero,
    public.primer_domingo(ci.fecha_inicio) + (a.semana_numero - 1) * 7,
    al.id,
    al.nombre_completo,
    c.id,
    c.nombre,
    c.programa,
    e.id,
    e.enviado_en,
    e.fecha_exif,
    s.id,
    sal.nombre_completo,
    s.semana_numero,
    e.distancia_similar,
    ant.id,
    ant.semana_numero
  from public.asistencias a
  join public.alumnos al on al.id = a.alumno_id
  join public.comunidades c on c.id = al.comunidad_id
  join public.ciclos ci on ci.id = a.ciclo_id
  join public.envios_foto e on e.id = a.envio_actual_id
  left join public.envios_foto s on s.id = e.similar_a_envio_id
  left join public.alumnos sal on sal.id = s.alumno_id
  -- Foto anterior del mismo alumno (incluida una rechazada de esta misma semana)
  left join lateral (
    select p.id, p.semana_numero
    from public.envios_foto p
    where p.alumno_id = a.alumno_id
      and p.confirmado
      and p.id <> e.id
    order by p.semana_numero desc, p.id desc
    limit 1
  ) ant on true
  where a.estado = 'pendiente'
    and a.actividad = 'misa'
  order by a.actualizado_en, a.id;
$$;

-- ---------------------------------------------
-- Estado de cada alumno en una semana (security invoker: RLS filtra comunidades)
-- ---------------------------------------------

create function public.resumen_semana(p_semana int)
returns table (
  alumno_id bigint,
  alumno text,
  comunidad_id bigint,
  comunidad text,
  programa public.programa,
  estado text,
  motivo text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    al.id,
    al.nombre_completo,
    c.id,
    c.nombre,
    c.programa,
    coalesce(a.estado::text, 'sin_registro'),
    a.motivo
  from public.alumnos al
  join public.comunidades c on c.id = al.comunidad_id
  join public.ciclos ci on ci.id = c.ciclo_id and ci.activo
  left join public.asistencias a
    on a.alumno_id = al.id
   and a.actividad = 'misa'
   and a.semana_numero = p_semana
  where al.activo
    and c.activa
  order by c.nombre, al.nombre_completo;
$$;

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------

revoke execute on function
  public.semana_reciente(),
  public.mi_perfil_staff(),
  public.cola_revision(),
  public.resumen_semana(int)
from public, anon, authenticated;

grant execute on function
  public.mi_perfil_staff(),
  public.cola_revision(),
  public.resumen_semana(int)
to authenticated;

-- cola_revision corre con los permisos del staff y calcula el domingo de cada semana
grant execute on function public.primer_domingo(date) to authenticated;
