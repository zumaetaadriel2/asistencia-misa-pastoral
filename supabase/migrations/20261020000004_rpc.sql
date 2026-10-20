-- =============================================
-- Funciones RPC
-- =============================================
-- Alumno (anon):        estado_formulario, identificar_alumno
-- Edge Functions:       preparar_envio, confirmar_envio (solo service_role)
-- Staff (authenticated): revisar_asistencia, justificar_falta, reasignar_asistencia, cerrar_semana
-- Las funciones con prefijo "_" son internas y ningún cliente puede llamarlas.

-- ---------------------------------------------
-- Auxiliares internas
-- ---------------------------------------------

-- IP del cliente según los headers que PostgREST expone en `request.headers`
create function public._ip_cliente()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_headers jsonb := nullif(current_setting('request.headers', true), '')::jsonb;
begin
  return coalesce(
    nullif(v_headers ->> 'cf-connecting-ip', ''),
    nullif(v_headers ->> 'x-real-ip', ''),
    nullif(trim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), ''),
    'desconocida'
  );
end;
$$;

-- Límite: 10 códigos fallidos por IP o 300 en total cada 15 minutos
create function public._limite_intentos_superado(p_ip text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (select count(*) from public.intentos_codigo i
      where i.ip = p_ip and i.creado_en > now() - interval '15 minutes') >= 10
    or
    (select count(*) from public.intentos_codigo i
      where i.creado_en > now() - interval '15 minutes') >= 300;
$$;

create function public._registrar_intento_fallido(p_ip text)
returns void
language sql
volatile
set search_path = ''
as $$
  insert into public.intentos_codigo (ip) values (p_ip);
$$;

-- "María Fernanda López" -> "María F."
create function public._nombre_corto(p_nombre text)
returns text
language sql
immutable
set search_path = ''
as $$
  with partes as (
    select regexp_split_to_array(regexp_replace(trim(p_nombre), '\s+', ' ', 'g'), ' ') as p
  )
  select case
    when array_length(p, 1) > 1 then p[1] || ' ' || left(p[2], 1) || '.'
    else p[1]
  end
  from partes;
$$;

-- Alumno activo del ciclo activo con ese código (acepta minúsculas, espacios y guiones)
create function public._buscar_alumno(p_codigo text)
returns table (
  alumno_id bigint,
  nombre_completo text,
  comunidad_id bigint,
  comunidad text,
  programa public.programa,
  ciclo_id bigint
)
language sql
stable
set search_path = ''
as $$
  select a.id, a.nombre_completo, c.id, c.nombre, c.programa, c.ciclo_id
  from public.alumnos a
  join public.comunidades c on c.id = a.comunidad_id
  join public.ciclos ci on ci.id = c.ciclo_id
  where a.codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'))
    and a.activo
    and c.activa
    and ci.activo;
$$;

-- ---------------------------------------------
-- Alumno: identificarse con su código
-- ---------------------------------------------
-- Los errores se devuelven como { ok: false, error } y no como excepción,
-- para que el intento fallido quede registrado.

create function public.identificar_alumno(p_codigo text)
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
  v_semanas jsonb;
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

  return jsonb_build_object(
    'ok', true,
    'alumno', jsonb_build_object(
      'nombre_corto', public._nombre_corto(v_alumno.nombre_completo),
      'comunidad', v_alumno.comunidad,
      'programa', v_alumno.programa
    ),
    'formulario', to_jsonb(v_estado),
    'accion', v_accion,
    'semanas', v_semanas
  );
end;
$$;

-- ---------------------------------------------
-- Edge Function subir-foto: preparar y confirmar el envío
-- ---------------------------------------------

create function public.preparar_envio(
  p_codigo text,
  p_ip text,
  p_huella bigint default null,
  p_fecha_exif timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ip text := coalesce(nullif(p_ip, ''), 'desconocida');
  v_alumno record;
  v_estado record;
  v_actual public.asistencias;
  v_envio public.envios_foto;
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
  if not found or not v_estado.en_curso or v_estado.semana < 1 then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_ciclo');
  end if;

  select * into v_actual
  from public.asistencias a
  where a.alumno_id = v_alumno.alumno_id
    and a.actividad = 'misa'
    and a.semana_numero = v_estado.semana;

  if v_actual.id is null then
    if not v_estado.abierto then
      return jsonb_build_object('ok', false, 'error', 'formulario_cerrado');
    end if;
  elsif v_actual.estado = 'rechazado' then
    if not v_estado.reenvio_abierto then
      return jsonb_build_object('ok', false, 'error', 'formulario_cerrado');
    end if;
  elsif v_actual.estado = 'inasistencia' then
    return jsonb_build_object('ok', false, 'error', 'semana_cerrada');
  else
    return jsonb_build_object('ok', false, 'error', 'ya_registrada', 'estado', v_actual.estado);
  end if;

  insert into public.envios_foto (
    ciclo_id, alumno_id, actividad, semana_numero, foto_key, huella, fecha_exif
  )
  values (
    v_alumno.ciclo_id,
    v_alumno.alumno_id,
    'misa',
    v_estado.semana,
    format(
      '%s/%s/%s/semana-%s-%s.webp',
      v_alumno.ciclo_id, v_alumno.comunidad_id, v_alumno.alumno_id, v_estado.semana, gen_random_uuid()
    ),
    p_huella,
    p_fecha_exif
  )
  returning * into v_envio;

  return jsonb_build_object(
    'ok', true,
    'envio_id', v_envio.id,
    'foto_key', v_envio.foto_key,
    'semana', v_estado.semana
  );
end;
$$;

-- La Edge Function ya comprobó que el archivo existe en R2
create function public.confirmar_envio(p_envio_id bigint, p_tamano_bytes int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_envio public.envios_foto;
  v_actual public.asistencias;
  v_comunidad_id bigint;
  v_asistencia_id bigint;
  v_similar_id bigint;
  v_distancia int;
begin
  select * into v_envio from public.envios_foto e where e.id = p_envio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'envio_no_existe');
  end if;
  if v_envio.confirmado then
    return jsonb_build_object('ok', false, 'error', 'envio_ya_confirmado');
  end if;
  if v_envio.enviado_en < now() - interval '15 minutes' then
    return jsonb_build_object('ok', false, 'error', 'envio_expirado');
  end if;

  select a.comunidad_id into v_comunidad_id from public.alumnos a where a.id = v_envio.alumno_id;

  select * into v_actual
  from public.asistencias a
  where a.alumno_id = v_envio.alumno_id
    and a.actividad = v_envio.actividad
    and a.semana_numero = v_envio.semana_numero
  for update;

  if v_actual.id is null then
    insert into public.asistencias (ciclo_id, alumno_id, actividad, semana_numero, estado, envio_actual_id)
    values (v_envio.ciclo_id, v_envio.alumno_id, v_envio.actividad, v_envio.semana_numero, 'pendiente', v_envio.id)
    returning id into v_asistencia_id;
  elsif v_actual.estado = 'rechazado' then
    update public.asistencias
    set estado = 'pendiente',
        envio_actual_id = v_envio.id,
        motivo = null,
        revisado_por = null,
        revisado_en = null
    where id = v_actual.id;
    v_asistencia_id := v_actual.id;
  else
    return jsonb_build_object('ok', false, 'error', 'ya_registrada', 'estado', v_actual.estado);
  end if;

  -- Foto más parecida entre las ya confirmadas de la misma comunidad en el ciclo
  if v_envio.huella is not null then
    select e.id, bit_count((e.huella # v_envio.huella)::bit(64))::int
    into v_similar_id, v_distancia
    from public.envios_foto e
    join public.alumnos a on a.id = e.alumno_id
    where e.confirmado
      and e.huella is not null
      and e.ciclo_id = v_envio.ciclo_id
      and a.comunidad_id = v_comunidad_id
    order by 2
    limit 1;
  end if;

  update public.envios_foto
  set confirmado = true,
      tamano_bytes = p_tamano_bytes,
      similar_a_envio_id = case when v_distancia <= 8 then v_similar_id end,
      distancia_similar = case when v_distancia <= 8 then v_distancia end
  where id = v_envio.id;

  return jsonb_build_object(
    'ok', true,
    'asistencia_id', v_asistencia_id,
    'similar', coalesce(v_distancia <= 8, false)
  );
end;
$$;

-- ---------------------------------------------
-- Staff: revisar, justificar y reasignar
-- ---------------------------------------------

create function public.revisar_asistencia(
  p_asistencia_id bigint,
  p_accion text,
  p_motivo text default null
)
returns public.estado_asistencia
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_asistencia public.asistencias;
begin
  if v_staff_id is null then
    raise exception 'No tienes permisos de staff.' using errcode = '42501';
  end if;

  select * into v_asistencia from public.asistencias a where a.id = p_asistencia_id for update;
  if not found or not public.es_staff_de_alumno(v_asistencia.alumno_id) then
    raise exception 'Asistencia no encontrada.' using errcode = 'P0002';
  end if;

  case p_accion
    when 'validar' then
      if v_asistencia.estado <> 'pendiente' then
        raise exception 'Solo se puede validar una asistencia pendiente.';
      end if;
      update public.asistencias
      set estado = 'validado', motivo = null, revisado_por = v_staff_id, revisado_en = now()
      where id = p_asistencia_id;
      return 'validado';

    when 'rechazar' then
      if v_asistencia.estado <> 'pendiente' then
        raise exception 'Solo se puede rechazar una asistencia pendiente.';
      end if;
      if v_motivo is null then
        raise exception 'Indica el motivo del rechazo.';
      end if;
      update public.asistencias
      set estado = 'rechazado', motivo = v_motivo, revisado_por = v_staff_id, revisado_en = now()
      where id = p_asistencia_id;
      return 'rechazado';

    when 'deshacer' then
      if v_asistencia.estado not in ('validado', 'rechazado')
        or v_asistencia.revisado_por is distinct from v_staff_id
        or v_asistencia.revisado_en < now() - interval '2 minutes' then
        raise exception 'Ya no se puede deshacer esta revisión.';
      end if;
      update public.asistencias
      set estado = 'pendiente', motivo = null, revisado_por = null, revisado_en = null
      where id = p_asistencia_id;
      return 'pendiente';

    else
      raise exception 'Acción desconocida: %', p_accion;
  end case;
end;
$$;

create function public.justificar_falta(p_alumno_id bigint, p_semana int, p_motivo text)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_ciclo_id bigint;
  v_id bigint;
begin
  if v_staff_id is null then
    raise exception 'No tienes permisos de staff.' using errcode = '42501';
  end if;
  if not public.es_staff_de_alumno(p_alumno_id) then
    raise exception 'Alumno no encontrado.' using errcode = 'P0002';
  end if;
  if v_motivo is null then
    raise exception 'Indica el motivo de la justificación.';
  end if;
  if p_semana is null or p_semana < 1 then
    raise exception 'Semana no válida.';
  end if;

  select c.ciclo_id into v_ciclo_id
  from public.alumnos a
  join public.comunidades c on c.id = a.comunidad_id
  where a.id = p_alumno_id;

  insert into public.asistencias (
    ciclo_id, alumno_id, actividad, semana_numero, estado, motivo, revisado_por, revisado_en
  )
  values (v_ciclo_id, p_alumno_id, 'misa', p_semana, 'justificada', v_motivo, v_staff_id, now())
  on conflict (alumno_id, actividad, semana_numero) do update
    set estado = 'justificada',
        motivo = excluded.motivo,
        revisado_por = excluded.revisado_por,
        revisado_en = excluded.revisado_en
    where public.asistencias.estado <> 'validado'
  returning id into v_id;

  if v_id is null then
    raise exception 'La semana % ya está validada; no hace falta justificarla.', p_semana;
  end if;

  return v_id;
end;
$$;

-- Corrige un envío hecho con el código equivocado: pasa la foto pendiente a otro alumno
create function public.reasignar_asistencia(p_asistencia_id bigint, p_alumno_destino_id bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_asistencia public.asistencias;
  v_destino_ciclo_id bigint;
  v_destino_actual public.asistencias;
begin
  if v_staff_id is null then
    raise exception 'No tienes permisos de staff.' using errcode = '42501';
  end if;

  select * into v_asistencia from public.asistencias a where a.id = p_asistencia_id for update;
  if not found or not public.es_staff_de_alumno(v_asistencia.alumno_id) then
    raise exception 'Asistencia no encontrada.' using errcode = 'P0002';
  end if;
  if v_asistencia.estado <> 'pendiente' then
    raise exception 'Solo se puede reasignar una foto pendiente de revisión.';
  end if;
  if p_alumno_destino_id = v_asistencia.alumno_id then
    raise exception 'La foto ya está a nombre de ese alumno.';
  end if;

  select c.ciclo_id into v_destino_ciclo_id
  from public.alumnos a
  join public.comunidades c on c.id = a.comunidad_id
  where a.id = p_alumno_destino_id and a.activo;

  if v_destino_ciclo_id is null
    or v_destino_ciclo_id <> v_asistencia.ciclo_id
    or not public.es_staff_de_alumno(p_alumno_destino_id) then
    raise exception 'Alumno de destino no encontrado.' using errcode = 'P0002';
  end if;

  select * into v_destino_actual
  from public.asistencias a
  where a.alumno_id = p_alumno_destino_id
    and a.actividad = v_asistencia.actividad
    and a.semana_numero = v_asistencia.semana_numero
  for update;

  if v_destino_actual.id is not null then
    if v_destino_actual.estado <> 'inasistencia' then
      raise exception 'Ese alumno ya tiene un registro en la semana %.', v_asistencia.semana_numero;
    end if;
    delete from public.asistencias where id = v_destino_actual.id;
  end if;

  update public.asistencias set alumno_id = p_alumno_destino_id where id = p_asistencia_id;
  update public.envios_foto set alumno_id = p_alumno_destino_id where id = v_asistencia.envio_actual_id;
end;
$$;

-- ---------------------------------------------
-- Cierre de semana: inasistencia para quien no envió nada
-- ---------------------------------------------

create function public._cerrar_semana(p_ciclo_id bigint, p_semana int)
returns int
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_total int;
begin
  insert into public.asistencias (ciclo_id, alumno_id, actividad, semana_numero, estado)
  select c.ciclo_id, a.id, 'misa', p_semana, 'inasistencia'
  from public.alumnos a
  join public.comunidades c on c.id = a.comunidad_id
  where c.ciclo_id = p_ciclo_id
    and a.activo
    and c.activa
  on conflict (alumno_id, actividad, semana_numero) do nothing;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Fecha límite de una semana: miércoles 23:59:59 (Lima) después de su domingo
create function public._fin_de_reenvio(p_fecha_inicio date, p_semana int)
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select ((public.primer_domingo(p_fecha_inicio) + (p_semana - 1) * 7 + 3) + time '23:59:59')
    at time zone 'America/Lima';
$$;

-- Lo ejecuta pg_cron cada jueves 00:05 (Lima): cierra la semana cuyo reenvío ya venció
create function public._cerrar_semana_vencida()
returns int
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_ciclo public.ciclos;
  v_fecha date;
  v_domingo date;
begin
  select * into v_ciclo from public.ciclos c where c.activo limit 1;
  if not found then
    return 0;
  end if;

  v_fecha := (public.momento_actual() at time zone 'America/Lima')::date;
  v_domingo := v_fecha - extract(dow from v_fecha)::int;
  -- Si el reenvío de ese domingo aún no vence (lun–mié), cerrar la semana anterior
  if v_fecha < v_domingo + 4 then
    v_domingo := v_domingo - 7;
  end if;

  if v_domingo < public.primer_domingo(v_ciclo.fecha_inicio) or v_domingo > v_ciclo.fecha_fin then
    return 0;
  end if;

  return public._cerrar_semana(v_ciclo.id, public.semana_de_domingo(v_ciclo.fecha_inicio, v_domingo));
end;
$$;

-- El admin puede cerrar a mano una semana cuyo reenvío ya venció
create function public.cerrar_semana(p_semana int)
returns int
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_ciclo public.ciclos;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cerrar semanas.' using errcode = '42501';
  end if;

  select * into v_ciclo from public.ciclos c where c.activo limit 1;
  if not found then
    raise exception 'No hay un ciclo activo.';
  end if;
  if p_semana is null or p_semana < 1 then
    raise exception 'Semana no válida.';
  end if;
  if public.momento_actual() <= public._fin_de_reenvio(v_ciclo.fecha_inicio, p_semana) then
    raise exception 'La semana % todavía recibe fotos; se puede cerrar desde el jueves.', p_semana;
  end if;

  return public._cerrar_semana(v_ciclo.id, p_semana);
end;
$$;

-- ---------------------------------------------
-- Latido diario (GitHub Actions) para que el proyecto gratuito no se pause
-- ---------------------------------------------

create function public.latido()
returns timestamptz
language sql
volatile
security definer
set search_path = ''
as $$
  update public.latido set ultima_vez = now() where id = 1 returning ultima_vez;
$$;

-- ---------------------------------------------
-- Auth hook: solo los correos registrados en `staff` pueden crear cuenta
-- ---------------------------------------------

create function public.hook_antes_de_crear_usuario(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
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
-- Permisos de ejecución
-- ---------------------------------------------
-- Por defecto Postgres deja ejecutar cualquier función a todos: se quita y se
-- concede solo lo necesario. service_role conserva su permiso explícito.

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.estado_formulario() to anon, authenticated;
grant execute on function public.identificar_alumno(text) to anon;
grant execute on function public.latido() to anon;

-- Usadas por las políticas RLS y por el valor por defecto de alumnos.codigo
grant execute on function
  public.staff_actual_id(),
  public.es_admin(),
  public.es_staff(),
  public.es_staff_de(bigint),
  public.es_staff_de_alumno(bigint),
  public.generar_codigo_alumno()
to authenticated;

grant execute on function
  public.revisar_asistencia(bigint, text, text),
  public.justificar_falta(bigint, int, text),
  public.reasignar_asistencia(bigint, bigint),
  public.cerrar_semana(int)
to authenticated;

grant execute on function public.hook_antes_de_crear_usuario(jsonb) to supabase_auth_admin;
