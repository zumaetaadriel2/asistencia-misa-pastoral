-- =============================================
-- Administración: ciclos, comunidades, códigos e importación de alumnos
-- =============================================
-- El resto de la administración (crear ciclos, comunidades y staff) se hace
-- con consultas normales: las políticas RLS ya solo dejan escribir al admin.

-- ---------------------------------------------
-- Activar un ciclo (solo puede haber uno activo)
-- ---------------------------------------------
create function public.activar_ciclo(p_ciclo_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede activar ciclos.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.ciclos c where c.id = p_ciclo_id) then
    raise exception 'Ciclo no encontrado.' using errcode = 'P0002';
  end if;

  -- Dos pasos: el índice único no permite dos ciclos activos ni por un instante
  update public.ciclos set activo = false where activo and id <> p_ciclo_id;
  update public.ciclos set activo = true where id = p_ciclo_id;
end;
$$;

-- ---------------------------------------------
-- Copiar comunidades y guías asignados de un ciclo a otro (al empezar el año)
-- ---------------------------------------------
create function public.copiar_comunidades(p_desde_ciclo_id bigint, p_hacia_ciclo_id bigint)
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

  -- Los guías siguen a cargo de las comunidades con el mismo programa y nombre
  insert into public.staff_comunidades (staff_id, comunidad_id)
  select sc.staff_id, nueva.id
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

-- ---------------------------------------------
-- Nuevo código para un alumno que perdió el suyo (guía de su comunidad o admin)
-- ---------------------------------------------
create function public.regenerar_codigo(p_alumno_id bigint)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_codigo text;
begin
  if not public.es_staff_de_alumno(p_alumno_id) then
    raise exception 'Alumno no encontrado.' using errcode = 'P0002';
  end if;

  update public.alumnos
  set codigo = public.generar_codigo_alumno()
  where id = p_alumno_id
  returning codigo into v_codigo;

  return v_codigo;
end;
$$;

-- ---------------------------------------------
-- Importar alumnos pegados desde Excel (un nombre por línea)
-- ---------------------------------------------
-- Ignora líneas vacías y nombres repetidos (en la lista o ya registrados en la
-- comunidad, sin importar mayúsculas ni espacios de más).
create function public.importar_alumnos(p_comunidad_id bigint, p_nombres text[])
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_nombre text;
  v_limpio text;
  v_agregados int := 0;
  v_repetidos int := 0;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede importar alumnos.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.comunidades c where c.id = p_comunidad_id) then
    raise exception 'Comunidad no encontrada.' using errcode = 'P0002';
  end if;

  foreach v_nombre in array coalesce(p_nombres, '{}') loop
    v_limpio := regexp_replace(trim(coalesce(v_nombre, '')), '\s+', ' ', 'g');
    continue when v_limpio = '';

    if exists (
      select 1 from public.alumnos a
      where a.comunidad_id = p_comunidad_id
        and lower(a.nombre_completo) = lower(v_limpio)
    ) then
      v_repetidos := v_repetidos + 1;
    else
      insert into public.alumnos (comunidad_id, nombre_completo) values (p_comunidad_id, v_limpio);
      v_agregados := v_agregados + 1;
    end if;
  end loop;

  return jsonb_build_object('agregados', v_agregados, 'repetidos', v_repetidos);
end;
$$;

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------
revoke execute on function
  public.activar_ciclo(bigint),
  public.copiar_comunidades(bigint, bigint),
  public.regenerar_codigo(bigint),
  public.importar_alumnos(bigint, text[])
from public, anon, authenticated;

grant execute on function
  public.activar_ciclo(bigint),
  public.copiar_comunidades(bigint, bigint),
  public.regenerar_codigo(bigint),
  public.importar_alumnos(bigint, text[])
to authenticated;
