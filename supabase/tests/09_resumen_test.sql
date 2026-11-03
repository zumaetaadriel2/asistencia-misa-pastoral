-- Resumen del administrador (resumen_admin) y cierre automático con el formulario «Cerrado».
-- Seed: ciclo desde el 2026-03-01 (semana 1) hasta el 2026-12-13 (semana 42); pendientes de la
-- semana 33 para TEST22 (San Pablo), TEST25 (Santa Rosa) y TEST28 (San José); catequesis de San
-- Pablo con 3 asistencias y 1 falta; Cristo Rey es la única iglesia activa sin misas.
-- Hora simulada: jueves 29 de octubre (la semana 35, del domingo 25, ya está cerrada).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select set_config('app.ahora', '2026-10-29 10:00:00-05', true);

-- Elena (Santa Rosa): asistió la 30 y luego falta, justificada, falta y rechazada -> 3 seguidas
-- Fabio (Santa Rosa): faltas en la 31 y 32, asistió la 33, faltas en la 34 y 35 -> 2 seguidas
-- Hugo (San José): faltas en la 33, 34 y 35, y una foto del sábado para la 36 (aún abierta)
insert into public.asistencias (ciclo_id, alumno_id, semana_numero, estado)
select al_c.ciclo_id, al.id, v.semana, v.estado::public.estado_asistencia
from (values
  ('TEST26', 30, 'validado'),
  ('TEST26', 31, 'inasistencia'),
  ('TEST26', 32, 'justificada'),
  ('TEST26', 33, 'inasistencia'),
  ('TEST26', 34, 'rechazado'),
  ('TEST27', 31, 'inasistencia'),
  ('TEST27', 32, 'inasistencia'),
  ('TEST27', 33, 'validado'),
  ('TEST27', 34, 'inasistencia'),
  ('TEST27', 35, 'inasistencia'),
  ('TEST29', 33, 'inasistencia'),
  ('TEST29', 34, 'inasistencia'),
  ('TEST29', 35, 'inasistencia'),
  ('TEST29', 36, 'pendiente')
) as v(codigo, semana, estado)
join public.alumnos al on al.codigo = v.codigo
join public.comunidades al_c on al_c.id = al.comunidad_id;

-- Santa María se queda sin guía
delete from public.staff_comunidades sc
using public.comunidades c, public.staff s
where sc.comunidad_id = c.id and sc.staff_id = s.id
  and c.nombre = 'Santa María' and s.email = 'guia.dos@ejemplo.com';

-- ---------------------------------------------
-- Permisos
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok('select public.resumen_admin()', '42501', null, 'un guía no puede ver el resumen');
reset role;

select ok(not has_function_privilege('anon', 'public.resumen_admin(int)', 'execute'), 'un alumno no puede ver el resumen');

-- ---------------------------------------------
-- Admin
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select set_config('test.r', public.resumen_admin()::text, true);
select set_config('test.r2', public.resumen_admin(2)::text, true);
reset role;

select is((current_setting('test.r')::jsonb ->> 'semana_reciente')::int, 35, 'la semana reciente es la del último domingo');
select is(jsonb_array_length(current_setting('test.r')::jsonb -> 'semanas'), 36, 'incluye la semana de las fotos del sábado en la noche');
select is(
  (current_setting('test.r')::jsonb -> 'semanas' -> 34 ->> 'cerrada')::boolean, true,
  'la semana 35 ya está cerrada (venció su reenvío)'
);
select is(
  (current_setting('test.r')::jsonb -> 'semanas' -> 35 ->> 'cerrada')::boolean, false,
  'la semana 36 sigue abierta'
);
select is(jsonb_array_length(current_setting('test.r')::jsonb -> 'comunidades'), 4, 'trae las comunidades activas');

select is(
  (select (x ->> 'por_revisar')::int from jsonb_array_elements(current_setting('test.r')::jsonb -> 'comunidades') x where x ->> 'nombre' = 'San José'),
  2,
  'cuenta las fotos por revisar de la comunidad'
);
select is(
  (
    select m
    from jsonb_array_elements(current_setting('test.r')::jsonb -> 'comunidades') x,
      jsonb_array_elements(x -> 'misa') m
    where x ->> 'nombre' = 'Santa Rosa' and (m ->> 'semana')::int = 34
  ),
  '{"semana": 34, "validado": 0, "rechazado": 1, "inasistencia": 1, "justificada": 0, "pendiente": 0}'::jsonb,
  'cuenta cada estado de misa por semana'
);
select is(
  (select x -> 'catequesis' from jsonb_array_elements(current_setting('test.r')::jsonb -> 'comunidades') x where x ->> 'nombre' = 'San Pablo'),
  '{"asistio": 3, "faltas": 1}'::jsonb,
  'la catequesis cuenta la tardanza como asistencia'
);
select is(
  (select (x ->> 'guias')::int from jsonb_array_elements(current_setting('test.r')::jsonb -> 'comunidades') x where x ->> 'nombre' = 'Santa María'),
  0,
  'avisa de la comunidad sin guía'
);
select is(
  (select (x ->> 'guias')::int from jsonb_array_elements(current_setting('test.r')::jsonb -> 'comunidades') x where x ->> 'nombre' = 'San Pablo'),
  1,
  'el catequista no cuenta como guía'
);

select is(
  (select array_agg(x ->> 'nombre' order by n) from jsonb_array_elements(current_setting('test.r')::jsonb -> 'alejandose') with ordinality t(x, n)),
  array['Hugo Prueba Ocho', 'Elena Prueba Cinco'],
  '3 faltas seguidas: la justificada no corta la racha y el validado sí'
);
select is(jsonb_array_length(current_setting('test.r2')::jsonb -> 'alejandose'), 3, 'con 2 faltas seguidas también sale Fabio');
select is((current_setting('test.r')::jsonb ->> 'iglesias_sin_horario')::int, 1, 'cuenta las iglesias activas sin misas');

-- En vacaciones semana_reciente() sigue avanzando, pero las semanas no pasan del ciclo
select set_config('app.ahora', '2027-01-20 10:00:00-05', true);
set local role authenticated;
select set_config('test.r3', public.resumen_admin()::text, true);
reset role;
select is(jsonb_array_length(current_setting('test.r3')::jsonb -> 'semanas'), 42, 'las semanas terminan en el último domingo del ciclo');

-- ---------------------------------------------
-- Cierre automático (jueves 5 de noviembre, cierra la semana 36)
-- ---------------------------------------------
select set_config('app.ahora', '2026-11-05 00:10:00-05', true);

update public.ciclos set abierto_manual = false where activo;
select is(public._cerrar_semana_vencida(), 0, 'con el formulario en «Cerrado» no marca faltas');

update public.ciclos set abierto_manual = null where activo;
select is(public._cerrar_semana_vencida(), 11, 'en automático marca falta a quien no envió foto');

-- Sin ciclo activo no hay resumen
update public.ciclos set activo = false;
set local role authenticated;
select is(public.resumen_admin(), null, 'sin ciclo activo devuelve null');
reset role;

select * from finish();
rollback;
