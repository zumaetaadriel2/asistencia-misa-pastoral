-- Catequesis: función por comunidad (guía o catequista), sesiones, marcas y lo que ve el alumno.
-- Seed: Catequista Uno (catequista en San Pablo), "Guía y Catequista" (guía en Santa Rosa,
-- catequista en San José), sesiones de San Pablo del sábado 17 y del domingo 18 de octubre.
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

-- Domingo 18 de octubre de 2026 (semana 34)
select set_config('app.ahora', '2026-10-18 10:00:00-05', true);

-- Ids que el catequista no puede leer (RLS): se guardan antes de cambiar de rol
select set_config('test.san_pablo', (select id::text from public.comunidades where nombre = 'San Pablo'), true);
select set_config('test.santa_rosa', (select id::text from public.comunidades where nombre = 'Santa Rosa'), true);
select set_config('test.san_jose', (select id::text from public.comunidades where nombre = 'San José'), true);
select set_config('test.ana', (select id::text from public.alumnos where codigo = 'TEST22'), true);
select set_config('test.bruno', (select id::text from public.alumnos where codigo = 'TEST23'), true);
select set_config('test.diego', (select id::text from public.alumnos where codigo = 'TEST25'), true);
select set_config('test.gabi', (select id::text from public.alumnos where codigo = 'TEST28'), true);
select set_config('test.asistencia_ana',
  (select a.id::text from public.asistencias a join public.alumnos al on al.id = a.alumno_id where al.codigo = 'TEST22'), true);
select set_config('test.sabado', (select id::text from public.sesiones_catequesis where titulo = 'Catequesis'), true);
select set_config('test.retiro', (select id::text from public.sesiones_catequesis where titulo = 'Retiro'), true);

-- ---------------------------------------------
-- Catequista Uno: solo pasa lista en San Pablo
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "catequista.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.comunidades), 1::bigint, 'el catequista ve solo su comunidad');
select is((select count(*) from public.alumnos), 0::bigint, 'no lee la tabla de alumnos (ni sus códigos)');
select is((select count(*) from public.asistencias), 0::bigint, 'no ve la asistencia a misa');
select is((select count(*) from public.envios_foto), 0::bigint, 'no ve las fotos');
select is((select count(*) from public.cola_revision()), 0::bigint, 'su cola de revisión está vacía');
select is((select count(*) from public.resumen_semana(33)), 0::bigint, 'no ve el resumen de misa');
select throws_ok(
  format('select public.revisar_asistencia(%s, ''validar'')', current_setting('test.asistencia_ana')),
  'P0002', null, 'no puede revisar fotos'
);
select throws_ok(
  format('select public.justificar_falta(%s, 30, ''Enfermo'')', current_setting('test.ana')),
  'P0002', null, 'no puede justificar faltas de misa'
);
select throws_ok(
  format('select public.regenerar_codigo(%s)', current_setting('test.ana')),
  'P0002', null, 'no puede dar códigos nuevos'
);
select throws_ok(
  format('select public.reasignar_asistencia(%s, %s)', current_setting('test.asistencia_ana'), current_setting('test.bruno')),
  'P0002', null, 'no puede reasignar fotos'
);
select is(
  (select es_guia::text || '/' || es_catequista::text from public.mi_perfil_staff()),
  'false/true',
  'su perfil dice que es catequista y no guía'
);
select is((select count(*) from public.sesiones_de_comunidad(current_setting('test.san_pablo')::bigint)), 2::bigint,
  've las 2 sesiones de su comunidad');
select is((select count(*) from public.lista_de_sesion(current_setting('test.sabado')::bigint)), 3::bigint,
  'la lista trae a los 3 alumnos activos de San Pablo');

-- Sesiones
select isnt(public.crear_sesion_catequesis(current_setting('test.san_pablo')::bigint, '2026-10-10', 'Catequesis'), null,
  'crea una sesión en su comunidad');
select is(
  public.crear_sesion_catequesis(current_setting('test.san_pablo')::bigint, '2026-10-10', '  catequesis '),
  (select id from public.sesiones_catequesis where fecha = '2026-10-10'),
  'si ya existe devuelve la misma, sin duplicarla por mayúsculas o espacios'
);
select throws_ok(
  format('select public.crear_sesion_catequesis(%s, ''2026-10-10'')', current_setting('test.santa_rosa')),
  'P0002', null, 'no crea sesiones en otras comunidades'
);
select throws_ok(
  format('select public.crear_sesion_catequesis(%s, ''2026-10-25'')', current_setting('test.san_pablo')),
  'No se puede pasar lista de una fecha futura.', 'no acepta fechas futuras'
);
select throws_ok(
  format('select public.crear_sesion_catequesis(%s, ''2026-02-01'')', current_setting('test.san_pablo')),
  'La fecha debe estar dentro del ciclo (2026-03-01 al 2026-12-13).', 'no acepta fechas fuera del ciclo'
);

-- Marcas: se pueden cambiar y borrar después de guardadas
select lives_ok(
  format('select public.marcar_catequesis(%s, %s, ''falta'')', current_setting('test.sabado'), current_setting('test.ana')),
  'cambia una marca ya guardada (presente → falta)'
);
select is(
  (select estado::text from public.asistencias_catequesis
   where sesion_id = current_setting('test.sabado')::bigint and alumno_id = current_setting('test.ana')::bigint),
  'falta', 'la marca quedó cambiada'
);
select is(
  (select marcado_por from public.asistencias_catequesis
   where sesion_id = current_setting('test.sabado')::bigint and alumno_id = current_setting('test.ana')::bigint),
  public.staff_actual_id(), 'queda registrado quién la editó'
);
select throws_ok(
  format('select public.marcar_catequesis(%s, %s, ''justificada'', ''  '')', current_setting('test.sabado'), current_setting('test.ana')),
  'Indica el motivo de la justificación.', 'la justificada exige motivo'
);
select lives_ok(
  format('select public.marcar_catequesis(%s, %s, ''tardanza'', ''no aplica'')', current_setting('test.retiro'), current_setting('test.bruno')),
  'marca una tardanza'
);
select is(
  (select coalesce(motivo, 'sin motivo') from public.asistencias_catequesis
   where sesion_id = current_setting('test.retiro')::bigint and alumno_id = current_setting('test.bruno')::bigint),
  'sin motivo', 'el motivo solo se guarda en las justificadas'
);
select lives_ok(
  format('select public.marcar_catequesis(%s, %s, null)', current_setting('test.sabado'), current_setting('test.bruno')),
  'borra una marca (volver a "sin marcar")'
);
select is(
  (select count(*) from public.asistencias_catequesis
   where sesion_id = current_setting('test.sabado')::bigint and alumno_id = current_setting('test.bruno')::bigint),
  0::bigint, 'la marca quedó borrada'
);
select throws_ok(
  format('select public.marcar_catequesis(%s, %s, ''presente'')', current_setting('test.sabado'), current_setting('test.diego')),
  'P0002', null, 'no marca a alumnos de otra comunidad'
);
select is(public.marcar_todos_presentes(current_setting('test.sabado')::bigint), 1,
  '"marcar todos presentes" solo marca a los que faltaban (no pisa las demás marcas)');
select lives_ok(
  format('select public.editar_sesion_catequesis(%s, ''2026-10-16'', ''Catequesis'')', current_setting('test.sabado')),
  'corrige la fecha de una sesión'
);
select throws_ok(
  format('select public.editar_sesion_catequesis(%s, ''2026-10-18'', ''retiro'')', current_setting('test.sabado')),
  'Ya hay una sesión con ese nombre en esa fecha.', 'no deja dos sesiones iguales el mismo día'
);
reset role;

-- ---------------------------------------------
-- Guía y Catequista: guía en Santa Rosa, catequista en San José
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "mixto@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.asistencias), 1::bigint, 've la misa solo de Santa Rosa, donde es guía');
select is((select count(*) from public.envios_foto), 1::bigint, 've las fotos solo de Santa Rosa');
select throws_ok(
  format('select public.justificar_falta(%s, 30, ''Enfermo'')', current_setting('test.gabi')),
  'P0002', null, 'no justifica misa en San José, donde es catequista'
);
select isnt(public.crear_sesion_catequesis(current_setting('test.san_jose')::bigint, '2026-10-17'), null,
  'pasa lista en San José, donde es catequista');
select isnt(public.crear_sesion_catequesis(current_setting('test.santa_rosa')::bigint, '2026-10-17'), null,
  'y en Santa Rosa, donde es guía');
select is(
  (select es_guia::text || '/' || es_catequista::text from public.mi_perfil_staff()),
  'true/true', 'su perfil dice que es guía y catequista'
);
reset role;

-- ---------------------------------------------
-- Guía Uno (guía en San Pablo y San José): también pasa lista
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select isnt(public.crear_sesion_catequesis(current_setting('test.san_jose')::bigint, '2026-10-17', 'Catequesis'), null,
  'el guía también pasa lista');
select throws_ok(
  format('select public.borrar_sesion_catequesis(%s)', current_setting('test.retiro')),
  '42501', null, 'solo quien creó la sesión o un admin puede borrarla'
);
select throws_ok(
  format('select public.crear_evento_catequesis(array[%s, %s], ''2026-10-11'', ''Retiro general'')',
    current_setting('test.san_pablo'), current_setting('test.san_jose')),
  '42501', null, 'solo el admin crea eventos para varias comunidades'
);
reset role;

-- ---------------------------------------------
-- Admin: eventos para varias comunidades
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is(
  public.crear_evento_catequesis(
    array[current_setting('test.san_pablo')::bigint, current_setting('test.santa_rosa')::bigint, current_setting('test.san_jose')::bigint],
    '2026-10-11', 'Retiro general'),
  3, 'el admin crea un evento para 3 comunidades a la vez'
);
select is(
  public.crear_evento_catequesis(array[current_setting('test.san_pablo')::bigint], '2026-10-11', 'retiro general'),
  0, 'repetirlo no duplica las sesiones'
);
select lives_ok(
  format('select public.borrar_sesion_catequesis(%s)', current_setting('test.retiro')),
  'el admin puede borrar cualquier sesión'
);

-- Al copiar las comunidades al ciclo siguiente, cada persona mantiene su función
insert into public.ciclos (nombre, anio, fecha_inicio, fecha_fin) values ('Ciclo 2027', 2027, '2027-03-07', '2027-12-12');
select public.copiar_comunidades(
  (select id from public.ciclos where anio = 2026),
  (select id from public.ciclos where anio = 2027)
);
select is(
  (select sc.funcion::text from public.staff_comunidades sc
     join public.comunidades c on c.id = sc.comunidad_id
     join public.ciclos ci on ci.id = c.ciclo_id
     join public.staff s on s.id = sc.staff_id
   where ci.anio = 2027 and s.email = 'catequista.uno@ejemplo.com'),
  'catequista', 'el catequista sigue siendo catequista (no pasa a guía) en el ciclo nuevo'
);
reset role;

-- ---------------------------------------------
-- Anónimo (alumno)
-- ---------------------------------------------
set local role anon;

select throws_ok('select count(*) from public.sesiones_catequesis', '42501', null, 'anon no lee las sesiones');
select throws_ok('select public.marcar_todos_presentes(1)', '42501', null, 'anon no puede pasar lista');
-- San Pablo ahora: Catequesis (16 oct), Retiro general (11 oct) y Catequesis (10 oct); el Retiro del 18 se borró
select is(jsonb_array_length(public.identificar_alumno('TEST22') -> 'catequesis'), 3,
  'el alumno ve las sesiones de catequesis de su comunidad');
select is(public.identificar_alumno('TEST22') -> 'catequesis' -> 0 ->> 'estado', 'falta',
  'la más reciente primero, con su marca');
select is(public.identificar_alumno('TEST22') -> 'catequesis' -> 1 ->> 'estado', 'sin_marcar',
  'las sesiones sin marca salen como "sin marcar"');
reset role;

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
    where p.proname in (
      'puede_pasar_lista', 'puede_pasar_lista_sesion', '_titulo_sesion', '_validar_fecha_sesion',
      'crear_sesion_catequesis', 'crear_evento_catequesis', 'editar_sesion_catequesis', 'borrar_sesion_catequesis',
      'sesiones_de_comunidad', 'lista_de_sesion', 'marcar_catequesis', 'marcar_todos_presentes', 'resumen_catequesis',
      'mi_perfil_staff'
    )
      and has_function_privilege('anon', p.oid, 'execute')
  ),
  'anon no puede ejecutar ninguna función de catequesis'
);

select * from finish();
rollback;
