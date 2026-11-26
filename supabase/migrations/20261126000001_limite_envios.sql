-- =============================================
-- Seguridad: tope de envíos de foto por alumno
-- =============================================
-- preparar_envio deja hasta 20 envíos por alumno en 24 horas (confirmados o no). Así un código
-- filtrado no sirve para subir fotos sin fin a R2. El tamaño de cada foto lo limita la URL
-- firmada (subir-foto firma el Content-Length, como máximo 1 MB).
-- El resto de la función no cambia (ver 20261021000001_ajustes_envio_foto.sql).

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

  -- Cada envío preparado reserva una subida a R2: sin tope, alguien con un código válido podría
  -- llenar el bucket. Un alumno de verdad necesita pocos (reintentos, reenvío tras un rechazo).
  if (
    select count(*)
    from public.envios_foto e
    where e.alumno_id = v_alumno.alumno_id
      and e.enviado_en > now() - interval '24 hours'
  ) >= 20 then
    return jsonb_build_object('ok', false, 'error', 'demasiados_envios');
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
