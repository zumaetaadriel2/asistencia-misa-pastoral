-- =============================================
-- Fase 8: misas cerca de mí
-- =============================================
-- Iglesias de la provincia de Trujillo con sus misas del fin de semana: las del sábado
-- desde las 17:00 (víspera) y las del domingo. No dependen del ciclo: sirven año tras año.
--
-- Cualquiera las lee con iglesias_con_misas() (página pública /misas, sin código). Solo
-- el admin las escribe: guardar_iglesia e importar_iglesias (pegadas desde Excel) crean o
-- actualizan la iglesia y reemplazan sus misas en una sola operación. La ubicación del
-- alumno nunca llega a la base: la distancia se calcula en su celular.

create table public.iglesias (
  id bigint generated always as identity primary key,
  nombre text not null,
  distrito text not null,
  direccion text not null default '',
  latitud numeric(9, 6) not null,
  longitud numeric(9, 6) not null,
  telefono text,
  notas text,
  activa boolean not null default true,
  -- Última vez que el admin guardó sus misas (se muestra como "horarios revisados en…")
  verificado_en date,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint iglesias_nombre check (nombre = btrim(nombre) and char_length(nombre) between 1 and 120),
  constraint iglesias_distrito check (distrito in (
    'Trujillo', 'Víctor Larco Herrera', 'La Esperanza', 'El Porvenir', 'Florencia de Mora',
    'Alto Trujillo', 'Huanchaco', 'Moche', 'Laredo', 'Salaverry', 'Poroto', 'Simbal'
  )),
  constraint iglesias_direccion check (char_length(direccion) <= 200),
  constraint iglesias_telefono check (telefono is null or char_length(telefono) between 1 and 40),
  constraint iglesias_notas check (notas is null or char_length(notas) between 1 and 300),
  -- La provincia de Trujillo, con margen: atrapa latitud y longitud invertidas
  constraint iglesias_en_trujillo check (latitud between -8.5 and -7.5 and longitud between -79.5 and -78.5)
);

-- Puede haber una "San José" en dos distritos, pero no dos en el mismo
create unique index iglesias_nombre_distrito on public.iglesias (lower(nombre), distrito);

create trigger iglesias_actualizado_en
  before update on public.iglesias
  for each row execute function public.tocar_actualizado_en();

create table public.horarios_misa (
  id bigint generated always as identity primary key,
  iglesia_id bigint not null references public.iglesias on delete cascade,
  -- Como extract(isodow): 6 sábado, 7 domingo
  dia smallint not null,
  hora time not null,
  constraint horarios_misa_dia check (dia in (6, 7)),
  constraint horarios_misa_sabado check (dia <> 6 or hora >= time '17:00')
);

create unique index horarios_misa_unico on public.horarios_misa (iglesia_id, dia, hora);

-- El admin las lee y cambia "activa" o borra directo (RLS); crear y editar va por RPC
alter table public.iglesias enable row level security;
alter table public.horarios_misa enable row level security;
revoke all on public.iglesias, public.horarios_misa from anon, authenticated;
grant select, update, delete on public.iglesias to authenticated;
grant select on public.horarios_misa to authenticated;

create policy "admin gestiona las iglesias"
  on public.iglesias for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "admin ve las misas"
  on public.horarios_misa for select to authenticated
  using (public.es_admin());

-- ---------------------------------------------
-- Lectura pública
-- ---------------------------------------------

-- Iglesias activas con al menos una misa, cada una con sus misas en orden
create function public.iglesias_con_misas()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'nombre', i.nombre,
        'distrito', i.distrito,
        'direccion', i.direccion,
        'latitud', i.latitud,
        'longitud', i.longitud,
        'telefono', i.telefono,
        'notas', i.notas,
        'verificado_en', i.verificado_en,
        'misas', (
          select jsonb_agg(jsonb_build_object('dia', h.dia, 'hora', to_char(h.hora, 'HH24:MI')) order by h.dia, h.hora)
          from public.horarios_misa h
          where h.iglesia_id = i.id
        )
      )
      order by i.nombre
    ),
    '[]'::jsonb
  )
  from public.iglesias i
  where i.activa and exists (select 1 from public.horarios_misa h where h.iglesia_id = i.id);
$$;

-- ---------------------------------------------
-- Escritura (solo admin)
-- ---------------------------------------------

-- Crea o actualiza una iglesia y reemplaza sus misas.
-- p_datos: {nombre, distrito, direccion, latitud, longitud, telefono, notas, misas: [{dia, hora}]}
-- Sin p_id busca por nombre y distrito (sin importar mayúsculas) y, si no existe, la crea.
create function public._guardar_iglesia(p_id bigint, p_datos jsonb, out v_id bigint, out v_creada boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_nombre text := regexp_replace(btrim(coalesce(p_datos ->> 'nombre', '')), '\s+', ' ', 'g');
  v_distrito text := btrim(coalesce(p_datos ->> 'distrito', ''));
  v_direccion text := regexp_replace(btrim(coalesce(p_datos ->> 'direccion', '')), '\s+', ' ', 'g');
  v_telefono text := nullif(btrim(coalesce(p_datos ->> 'telefono', '')), '');
  v_notas text := nullif(btrim(coalesce(p_datos ->> 'notas', '')), '');
  v_hoy date := (public.momento_actual() at time zone 'America/Lima')::date;
  v_restriccion text;
begin
  if v_nombre = '' then
    raise exception 'Falta el nombre de la iglesia.';
  end if;
  if coalesce(p_datos ->> 'latitud', '') = '' or coalesce(p_datos ->> 'longitud', '') = '' then
    raise exception 'Falta la ubicación de «%».', v_nombre;
  end if;

  if p_id is null then
    select i.id into v_id
    from public.iglesias i
    where lower(i.nombre) = lower(v_nombre) and i.distrito = v_distrito;
  else
    select i.id into v_id from public.iglesias i where i.id = p_id;
    if v_id is null then
      raise exception 'Iglesia no encontrada.' using errcode = 'P0002';
    end if;
  end if;
  v_creada := v_id is null;

  if v_creada then
    insert into public.iglesias (nombre, distrito, direccion, latitud, longitud, telefono, notas, verificado_en)
    values (
      v_nombre, v_distrito, v_direccion,
      (p_datos ->> 'latitud')::numeric, (p_datos ->> 'longitud')::numeric,
      v_telefono, v_notas, v_hoy
    )
    returning id into v_id;
  else
    update public.iglesias i
    set nombre = v_nombre,
        distrito = v_distrito,
        direccion = v_direccion,
        latitud = (p_datos ->> 'latitud')::numeric,
        longitud = (p_datos ->> 'longitud')::numeric,
        telefono = v_telefono,
        notas = v_notas,
        verificado_en = v_hoy
    where i.id = v_id;
  end if;

  delete from public.horarios_misa h where h.iglesia_id = v_id;
  insert into public.horarios_misa (iglesia_id, dia, hora)
  select distinct v_id, (m ->> 'dia')::smallint, (m ->> 'hora')::time
  from jsonb_array_elements(coalesce(p_datos -> 'misas', '[]'::jsonb)) as m;

exception
  when check_violation then
    get stacked diagnostics v_restriccion = constraint_name;
    raise exception '%', case v_restriccion
      when 'iglesias_en_trujillo' then
        format('La ubicación de «%s» no está en la provincia de Trujillo (¿latitud y longitud al revés?).', v_nombre)
      when 'iglesias_distrito' then format('El distrito de «%s» no es de la provincia de Trujillo.', v_nombre)
      when 'horarios_misa_dia' then format('«%s»: solo se cargan misas de sábado y domingo.', v_nombre)
      when 'horarios_misa_sabado' then
        format('«%s»: las misas del sábado antes de las 17:00 no son dominicales.', v_nombre)
      else format('Revisa los datos de «%s» (nombre, dirección, teléfono o notas muy largos).', v_nombre)
    end;
  when unique_violation then
    raise exception 'Ya hay otra iglesia «%» en %.', v_nombre, v_distrito;
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'Revisa la ubicación o las horas de «%».', v_nombre;
end;
$$;

create function public.guardar_iglesia(p_id bigint, p_datos jsonb)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_resultado record;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede editar las iglesias.' using errcode = '42501';
  end if;
  select * into v_resultado from public._guardar_iglesia(p_id, p_datos);
  return v_resultado.v_id;
end;
$$;

-- Todo o nada: si una fila falla, no se importa ninguna (el mensaje dice cuál)
create function public.importar_iglesias(p_filas jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_fila jsonb;
  v_resultado record;
  v_creadas int := 0;
  v_actualizadas int := 0;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede importar iglesias.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_filas) is distinct from 'array' or jsonb_array_length(p_filas) = 0 then
    raise exception 'No hay iglesias para importar.';
  end if;

  for v_fila in select f from jsonb_array_elements(p_filas) as f loop
    select * into v_resultado from public._guardar_iglesia(null, v_fila);
    if v_resultado.v_creada then
      v_creadas := v_creadas + 1;
    else
      v_actualizadas := v_actualizadas + 1;
    end if;
  end loop;

  return jsonb_build_object('creadas', v_creadas, 'actualizadas', v_actualizadas);
end;
$$;

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------
-- Las funciones nuevas nacen ejecutables por todos: se quita y se concede solo lo necesario.

revoke execute on function
  public.iglesias_con_misas(),
  public._guardar_iglesia(bigint, jsonb),
  public.guardar_iglesia(bigint, jsonb),
  public.importar_iglesias(jsonb)
from public, anon, authenticated;

grant execute on function public.iglesias_con_misas() to anon, authenticated;

grant execute on function
  public.guardar_iglesia(bigint, jsonb),
  public.importar_iglesias(jsonb)
to authenticated;
