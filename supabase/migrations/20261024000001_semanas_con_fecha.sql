-- =============================================
-- El alumno ve la fecha de cada semana ("Semana 12 · dom 24 nov")
-- =============================================
-- identificar_alumno agrega a cada semana su domingo, calculado igual que en
-- cola_revision. Mismo nombre, argumentos y retorno: se conservan los permisos.

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
