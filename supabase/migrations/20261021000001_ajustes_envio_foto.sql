-- =============================================
-- Ajustes al envío de fotos
-- =============================================
-- 1. Las fotos se guardan en JPEG: Safari (iPhone) no genera WebP desde canvas.
-- 2. confirmar_envio exige el código del alumno, así nadie puede confirmar un
--    envío ajeno adivinando su id.

create or replace function public.preparar_envio(
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
      '%s/%s/%s/semana-%s-%s.jpg',
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


drop function public.confirmar_envio(bigint, int);

create function public.confirmar_envio(p_envio_id bigint, p_codigo text, p_tamano_bytes int)
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
  select e.* into v_envio
  from public.envios_foto e
  join public.alumnos a on a.id = e.alumno_id
  where e.id = p_envio_id
    and a.codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'))
  for update of e;

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

-- Solo las Edge Functions (service_role)
revoke execute on function public.confirmar_envio(bigint, text, int) from public, anon, authenticated;
