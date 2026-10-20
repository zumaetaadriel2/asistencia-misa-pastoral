-- Revisión del staff: validar, rechazar, deshacer, justificar, reasignar y cerrar semana.
-- Seed: pendientes de la semana 33 para TEST22 (San Pablo), TEST25 (Santa Rosa) y TEST28 (San José).
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Ids guardados antes de cambiar de rol (algunos el guía no los puede ver por RLS)
select set_config('test.ajena', (
  select a.id::text from public.asistencias a join public.alumnos al on al.id = a.alumno_id
  where al.codigo = 'TEST25' and a.semana_numero = 33
), true);
select set_config('test.alumno_ajeno', (select id::text from public.alumnos where codigo = 'TEST25'), true);

select set_config('test.propia', (
  select a.id::text from public.asistencias a join public.alumnos al on al.id = a.alumno_id
  where al.codigo = 'TEST22' and a.semana_numero = 33
), true);

-- ---------------------------------------------
-- Guía Uno
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is(public.revisar_asistencia(current_setting('test.propia')::bigint, 'validar'), 'validado'::public.estado_asistencia, 'valida una foto pendiente');
select throws_ok(
  $$select public.revisar_asistencia(current_setting('test.propia')::bigint, 'validar')$$,
  'Solo se puede validar una asistencia pendiente.',
  'no valida dos veces'
);
select is(public.revisar_asistencia(current_setting('test.propia')::bigint, 'deshacer'), 'pendiente'::public.estado_asistencia, 'deshace su validación reciente');
select throws_ok(
  $$select public.revisar_asistencia(current_setting('test.propia')::bigint, 'rechazar', '   ')$$,
  'Indica el motivo del rechazo.',
  'rechazar exige un motivo'
);
select is(public.revisar_asistencia(current_setting('test.propia')::bigint, 'rechazar', 'Foto borrosa'), 'rechazado'::public.estado_asistencia, 'rechaza con motivo');
select throws_ok(
  format('select public.revisar_asistencia(%s, %L)', current_setting('test.ajena'), 'validar'),
  'P0002', null,
  'no puede revisar fotos de otra comunidad'
);

-- Reasignar la foto de TEST28 a TEST29 (misma comunidad)
select lives_ok(
  $$select public.reasignar_asistencia(
      (select a.id from public.asistencias a join public.alumnos al on al.id = a.alumno_id
        where al.codigo = 'TEST28' and a.semana_numero = 33),
      (select id from public.alumnos where codigo = 'TEST29'))$$,
  'reasigna una foto enviada con el código equivocado'
);
select is(
  (select al.codigo from public.asistencias a join public.alumnos al on al.id = a.alumno_id
    where a.semana_numero = 33 and al.comunidad_id = (select comunidad_id from public.alumnos where codigo = 'TEST29')),
  'TEST29',
  'la asistencia pasa al alumno correcto'
);
select is(
  (select al.codigo from public.envios_foto e join public.alumnos al on al.id = e.alumno_id
    where e.foto_key = 'seed/TEST28-semana-33.webp'),
  'TEST29',
  'la foto también pasa al alumno correcto'
);
select throws_ok(
  format(
    $$select public.reasignar_asistencia(
        (select a.id from public.asistencias a join public.alumnos al on al.id = a.alumno_id
          where al.codigo = 'TEST29' and a.semana_numero = 33), %s)$$,
    current_setting('test.alumno_ajeno')
  ),
  'P0002', null,
  'no puede reasignar a un alumno de otra comunidad'
);

-- Justificar
select is(
  public.revisar_asistencia(
    (select a.id from public.asistencias a join public.alumnos al on al.id = a.alumno_id
      where al.codigo = 'TEST29' and a.semana_numero = 33),
    'validar'),
  'validado'::public.estado_asistencia,
  'valida la foto reasignada'
);
select throws_ok(
  $$select public.justificar_falta((select id from public.alumnos where codigo = 'TEST29'), 33, 'Viaje')$$,
  'La semana 33 ya está validada; no hace falta justificarla.',
  'no justifica una semana ya validada'
);
select lives_ok(
  $$select public.justificar_falta((select id from public.alumnos where codigo = 'TEST22'), 33, 'Enfermedad')$$,
  'justifica una semana rechazada'
);
select lives_ok(
  $$select public.justificar_falta((select id from public.alumnos where codigo = 'TEST23'), 30, 'Viaje familiar')$$,
  'justifica una semana sin registro'
);
select throws_ok(
  $$select public.justificar_falta((select id from public.alumnos where codigo = 'TEST24'), 30, '')$$,
  'Indica el motivo de la justificación.',
  'justificar exige un motivo'
);
select throws_ok('select public.cerrar_semana(33)', '42501', null, 'un guía no puede cerrar semanas');
reset role;

-- Deshacer después de 2 minutos ya no se permite
update public.asistencias a set revisado_en = now() - interval '3 minutes'
from public.alumnos al
where al.id = a.alumno_id and al.codigo = 'TEST29' and a.semana_numero = 33;

select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$select public.revisar_asistencia(
      (select a.id from public.asistencias a join public.alumnos al on al.id = a.alumno_id
        where al.codigo = 'TEST29' and a.semana_numero = 33),
      'deshacer')$$,
  'Ya no se puede deshacer esta revisión.',
  'pasados 2 minutos no se puede deshacer'
);
reset role;

-- ---------------------------------------------
-- Admin: cierre manual (martes 20 de octubre)
-- ---------------------------------------------
select set_config('app.ahora', '2026-10-20 10:00:00-05', true);
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  'select public.cerrar_semana(34)',
  'La semana 34 todavía recibe fotos; se puede cerrar desde el jueves.',
  'no cierra una semana que aún recibe reenvíos'
);
-- Semana 33: tienen registro TEST22 (justificada), TEST25 (pendiente) y TEST29 (validado)
select is(public.cerrar_semana(33), 9, 'cierra la semana 33 marcando a los 9 alumnos sin registro');
reset role;

-- ---------------------------------------------
-- Guía Dos revisa su propia comunidad
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.dos@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is(
  public.revisar_asistencia(current_setting('test.ajena')::bigint, 'validar'),
  'validado'::public.estado_asistencia,
  'el otro guía sí puede validar la foto de su comunidad'
);
reset role;

select * from finish();
rollback;
