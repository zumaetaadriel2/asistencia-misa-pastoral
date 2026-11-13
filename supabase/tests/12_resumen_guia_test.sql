-- Resumen del guía (resumen_guia): lo mismo que resumen_admin, solo de las comunidades donde es guía.
-- Seed: guia.uno es guía en San Pablo y San José; guia.dos en Santa Rosa y Santa María;
-- mixto es guía en Santa Rosa y catequista en San José; catequista.uno solo pasa lista.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Hora fija: viernes 13 de noviembre, con la semana 37 (domingo 8) ya cerrada
select set_config('app.ahora', '2026-11-13 10:00:00-05', true);

-- Un alumno de San José con 3 faltas seguidas después de su última foto (semana 33), para ver a
-- quién le aparece
insert into public.asistencias (ciclo_id, alumno_id, semana_numero, estado)
select c.ciclo_id, a.id, s, 'inasistencia'
from public.alumnos a
join public.comunidades c on c.id = a.comunidad_id
cross join generate_series(34, 36) s
where a.codigo = 'TEST28';

create function pg_temp.resumen_de(p_email text) returns jsonb language plpgsql as $$
declare
  v jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('email', p_email, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v := public.resumen_guia();
  reset role;
  return v;
end;
$$;

create function pg_temp.nombres(p_resumen jsonb) returns text[] language sql as $$
  select coalesce(array_agg(c ->> 'nombre' order by c ->> 'nombre'), '{}')
  from jsonb_array_elements(p_resumen -> 'comunidades') c;
$$;

select is(pg_temp.nombres(pg_temp.resumen_de('guia.uno@ejemplo.com')), array['San José', 'San Pablo'], 'el guía ve solo sus comunidades');
select is(pg_temp.nombres(pg_temp.resumen_de('guia.dos@ejemplo.com')), array['Santa María', 'Santa Rosa'], 'el otro guía, las suyas');
select is(pg_temp.nombres(pg_temp.resumen_de('mixto@ejemplo.com')), array['Santa Rosa'], 'donde solo es catequista no entra');
select is(pg_temp.nombres(pg_temp.resumen_de('catequista.uno@ejemplo.com')), '{}'::text[], 'quien solo es catequista no ve ninguna');

select is(
  (select array_agg(a ->> 'nombre') from jsonb_array_elements(pg_temp.resumen_de('guia.uno@ejemplo.com') -> 'alejandose') a),
  array[(select nombre_completo from public.alumnos where codigo = 'TEST28')],
  'el guía de San José ve al alumno que se está alejando'
);
select is(
  jsonb_array_length(pg_temp.resumen_de('guia.dos@ejemplo.com') -> 'alejandose'), 0,
  'el guía de otras comunidades no lo ve'
);
select is((pg_temp.resumen_de('guia.uno@ejemplo.com') ->> 'iglesias_sin_horario')::int, 0, 'al guía no se le muestran las iglesias');
select ok(jsonb_array_length(pg_temp.resumen_de('guia.uno@ejemplo.com') -> 'semanas') > 0, 'trae las semanas del ciclo');

-- El administrador sigue viendo todas las comunidades activas y las iglesias sin horario
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select set_config('test.admin', public.resumen_admin()::text, true);
reset role;
select is(
  jsonb_array_length(current_setting('test.admin')::jsonb -> 'comunidades'),
  (select count(*)::int from public.comunidades c join public.ciclos ci on ci.id = c.ciclo_id and ci.activo where c.activa),
  'el administrador ve todas las comunidades activas'
);
select is(
  (current_setting('test.admin')::jsonb ->> 'iglesias_sin_horario')::int,
  (select count(*)::int from public.iglesias i where i.activa and not exists (select 1 from public.horarios_misa h where h.iglesia_id = i.id)),
  'y las iglesias sin horario'
);

-- Permisos
select set_config('request.jwt.claims', '{"email": "no.es.staff@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok('select public.resumen_guia()', '42501', null, 'alguien que no es del equipo no puede verlo');
reset role;
select ok(
  not has_function_privilege('anon', 'public.resumen_guia(int)', 'execute')
    and not has_function_privilege('authenticated', 'public._resumen(bigint[], int)', 'execute'),
  'un alumno no puede verlo y nadie llama al cálculo interno directo'
);

select * from finish();
rollback;
