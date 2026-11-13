-- =============================================
-- v1.14.0: resumen para guías
-- =============================================
-- El guía ve en Mi comunidad → Resumen lo mismo que el administrador en su Resumen, pero solo de
-- las comunidades donde es guía: misa por semana, fotos por revisar, catequesis y los alumnos con
-- varias faltas seguidas. Para no tener dos copias de la consulta, el cálculo pasa a
-- _resumen(comunidades), y resumen_admin y resumen_guia solo eligen qué comunidades entran.

-- ---------------------------------------------
-- Cálculo compartido
-- ---------------------------------------------

-- Lo del ciclo activo, solo de las comunidades pedidas (null si no hay ciclo activo).
-- Es interna: quien la llama ya decidió qué comunidades puede ver.
create function public._resumen(p_comunidades bigint[], p_faltas_seguidas int)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ciclo public.ciclos;
  v_ahora timestamptz := public.momento_actual();
  v_minimo int := greatest(coalesce(p_faltas_seguidas, 3), 1);
  v_reciente int;
  v_hasta int;
  v_cerrada int;
begin
  select * into v_ciclo from public.ciclos c where c.activo limit 1;
  if not found then
    return null;
  end if;

  v_reciente := coalesce(public.semana_reciente(), 0);

  -- Hasta la semana más nueva con registros (los envíos del sábado en la noche ya son de la
  -- semana siguiente), pero nunca después del último domingo del ciclo: semana_reciente()
  -- sigue avanzando en vacaciones
  select least(
    greatest(v_reciente, coalesce(max(a.semana_numero), 0)),
    public.semana_de_domingo(
      v_ciclo.fecha_inicio,
      v_ciclo.fecha_fin - extract(dow from v_ciclo.fecha_fin)::int
    )
  )
  into v_hasta
  from public.asistencias a
  where a.ciclo_id = v_ciclo.id
    and a.actividad = 'misa';

  -- Última semana cuyo reenvío ya venció (el jueves se cierra sola)
  select coalesce(max(s), 0)
  into v_cerrada
  from generate_series(1, v_hasta) s
  where v_ahora > public._fin_de_reenvio(v_ciclo.fecha_inicio, s);

  return jsonb_build_object(
    'semana_reciente', v_reciente,

    'semanas', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'semana', s,
            'domingo', public.primer_domingo(v_ciclo.fecha_inicio) + (s - 1) * 7,
            'cerrada', s <= v_cerrada
          )
          order by s
        ),
        '[]'::jsonb
      )
      from generate_series(1, v_hasta) s
    ),

    'comunidades', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'nombre', c.nombre,
            'programa', c.programa,
            'activos', (
              select count(*) from public.alumnos al where al.comunidad_id = c.id and al.activo
            ),
            'guias', (
              select count(*)
              from public.staff_comunidades sc
              join public.staff st on st.id = sc.staff_id
              where sc.comunidad_id = c.id
                and sc.funcion = 'guia'
                and st.activo
            ),
            -- Igual que la cola de revisión: todas las fotos pendientes de la comunidad
            'por_revisar', p.cantidad,
            'esperando_desde', p.desde,
            'catequesis', (
              select jsonb_build_object(
                'asistio', count(*) filter (where ac.estado in ('presente', 'tardanza')),
                'faltas', count(*) filter (where ac.estado = 'falta')
              )
              from public.asistencias_catequesis ac
              join public.sesiones_catequesis se on se.id = ac.sesion_id
              join public.alumnos al on al.id = ac.alumno_id
              where se.comunidad_id = c.id
                and al.activo
            ),
            'misa', (
              select coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'semana', m.semana_numero,
                    'validado', m.validado,
                    'rechazado', m.rechazado,
                    'inasistencia', m.inasistencia,
                    'justificada', m.justificada,
                    'pendiente', m.pendiente
                  )
                  order by m.semana_numero
                ),
                '[]'::jsonb
              )
              from (
                select
                  a.semana_numero,
                  count(*) filter (where a.estado = 'validado') as validado,
                  count(*) filter (where a.estado = 'rechazado') as rechazado,
                  count(*) filter (where a.estado = 'inasistencia') as inasistencia,
                  count(*) filter (where a.estado = 'justificada') as justificada,
                  count(*) filter (where a.estado = 'pendiente') as pendiente
                from public.asistencias a
                join public.alumnos al on al.id = a.alumno_id
                where al.comunidad_id = c.id
                  and al.activo
                  and a.ciclo_id = v_ciclo.id
                  and a.actividad = 'misa'
                  and a.semana_numero <= v_hasta
                group by a.semana_numero
              ) m
            )
          )
          order by c.nombre, c.programa
        ),
        '[]'::jsonb
      )
      from public.comunidades c
      cross join lateral (
        select count(*) as cantidad, min(a.actualizado_en) as desde
        from public.asistencias a
        join public.alumnos al on al.id = a.alumno_id
        where al.comunidad_id = c.id
          and a.ciclo_id = v_ciclo.id
          and a.actividad = 'misa'
          and a.estado = 'pendiente'
      ) p
      where c.ciclo_id = v_ciclo.id
        and c.activa
        and c.id = any(p_comunidades)
    ),

    -- Faltas seguidas: semanas cerradas con falta (o foto rechazada) después de la última
    -- semana cerrada en que mandó foto. Las justificadas y las semanas sin registro no
    -- suman ni cortan la racha.
    'alejandose', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'alumno_id', r.alumno_id,
            'nombre', r.nombre,
            'comunidad_id', r.comunidad_id,
            'comunidad', r.comunidad,
            'faltas_seguidas', r.faltas
          )
          order by r.faltas desc, r.comunidad, r.nombre
        ),
        '[]'::jsonb
      )
      from (
        select
          al.id as alumno_id,
          al.nombre_completo as nombre,
          c.id as comunidad_id,
          c.nombre as comunidad,
          count(*) filter (
            where a.estado in ('inasistencia', 'rechazado')
              and a.semana_numero > coalesce(ultima.semana, 0)
          ) as faltas
        from public.alumnos al
        join public.comunidades c on c.id = al.comunidad_id
        join public.asistencias a
          on a.alumno_id = al.id
          and a.ciclo_id = v_ciclo.id
          and a.actividad = 'misa'
          and a.semana_numero <= v_cerrada
        left join lateral (
          select max(b.semana_numero) as semana
          from public.asistencias b
          where b.alumno_id = al.id
            and b.ciclo_id = v_ciclo.id
            and b.actividad = 'misa'
            and b.estado in ('validado', 'pendiente')
            and b.semana_numero <= v_cerrada
        ) ultima on true
        where al.activo
          and c.activa
          and c.ciclo_id = v_ciclo.id
          and c.id = any(p_comunidades)
        group by al.id, al.nombre_completo, c.id, c.nombre, ultima.semana
      ) r
      where r.faltas >= v_minimo
    )
  );
end;
$$;

-- ---------------------------------------------
-- Resumen del administrador: todas las comunidades activas del ciclo
-- ---------------------------------------------

create or replace function public.resumen_admin(p_faltas_seguidas int default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_comunidades bigint[];
  v_resumen jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver el resumen.' using errcode = '42501';
  end if;

  select coalesce(array_agg(c.id), '{}')
  into v_comunidades
  from public.comunidades c
  join public.ciclos ci on ci.id = c.ciclo_id and ci.activo;

  v_resumen := public._resumen(v_comunidades, p_faltas_seguidas);
  if v_resumen is null then
    return null;
  end if;

  return v_resumen || jsonb_build_object(
    'iglesias_sin_horario', (
      select count(*)
      from public.iglesias i
      where i.activa
        and not exists (select 1 from public.horarios_misa h where h.iglesia_id = i.id)
    )
  );
end;
$$;

-- ---------------------------------------------
-- Resumen del guía: solo donde es guía
-- ---------------------------------------------
-- Donde solo es catequista no entra: lo de misa y las fotos son del guía (como es_staff_de).

create function public.resumen_guia(p_faltas_seguidas int default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_staff_id bigint := public.staff_actual_id();
  v_comunidades bigint[];
  v_resumen jsonb;
begin
  if v_staff_id is null then
    raise exception 'Solo el equipo de la pastoral puede ver el resumen.' using errcode = '42501';
  end if;

  select coalesce(array_agg(sc.comunidad_id), '{}')
  into v_comunidades
  from public.staff_comunidades sc
  join public.comunidades c on c.id = sc.comunidad_id
  join public.ciclos ci on ci.id = c.ciclo_id and ci.activo
  where sc.staff_id = v_staff_id
    and sc.funcion = 'guia';

  v_resumen := public._resumen(v_comunidades, p_faltas_seguidas);
  if v_resumen is null then
    return null;
  end if;

  -- Las iglesias las completa el administrador: al guía no se le muestran
  return v_resumen || jsonb_build_object('iglesias_sin_horario', 0);
end;
$$;

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------
-- Las funciones nuevas nacen ejecutables por todos: se quita y se concede solo lo necesario.
-- (resumen_admin conserva los suyos: create or replace no los cambia.)

revoke execute on function public._resumen(bigint[], int) from public, anon, authenticated;
revoke execute on function public.resumen_guia(int) from public, anon, authenticated;
grant execute on function public.resumen_guia(int) to authenticated;
