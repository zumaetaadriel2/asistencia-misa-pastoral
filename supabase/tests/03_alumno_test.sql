-- Flujo del alumno: código, envío, reenvío, fotos parecidas, cierre de semana y límite de intentos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Domingo 18 de octubre de 2026 (semana 34)
select set_config('app.ahora', '2026-10-18 10:00:00-05', true);
select set_config('request.headers', '{"x-forwarded-for": "203.0.113.5, 10.0.0.1"}', true);

-- ---------------------------------------------
-- Identificación con el código (como anon)
-- ---------------------------------------------
set local role anon;
select is(public.identificar_alumno(' test-22 ') ->> 'ok', 'true', 'acepta el código en minúsculas, con espacios y guiones');
select is(public.identificar_alumno('TEST22') -> 'alumno' ->> 'nombre_corto', 'Ana P.', 'muestra solo nombre e inicial');
select is(public.identificar_alumno('TEST22') ->> 'accion', 'enviar', 'puede enviar la foto de esta semana');
select is(jsonb_array_length(public.identificar_alumno('TEST22') -> 'semanas'), 34, 'devuelve sus 34 semanas');
select is(public.identificar_alumno('ZZZZZZ') ->> 'error', 'codigo_invalido', 'un código inexistente es rechazado');
reset role;

select is(
  (select count(*) from public.intentos_codigo where ip = '203.0.113.5'),
  1::bigint,
  'el intento fallido queda registrado con la IP del cliente'
);

-- ---------------------------------------------
-- Envío nuevo
-- ---------------------------------------------
select set_config('test.envio1', (public.preparar_envio('TEST23', '198.51.100.1', 42, null) ->> 'envio_id'), true);
select ok(current_setting('test.envio1') is not null, 'prepara el envío y devuelve su id');
select matches(
  (select foto_key from public.envios_foto where id = current_setting('test.envio1')::bigint),
  '^\d+/\d+/\d+/semana-34-[0-9a-f-]{36}\.webp$',
  'la ruta de la foto la decide el servidor'
);
select is(public.confirmar_envio(current_setting('test.envio1')::bigint, 50000) ->> 'ok', 'true', 'confirma el envío');
select is(
  (select a.estado::text from public.asistencias a join public.alumnos al on al.id = a.alumno_id
    where al.codigo = 'TEST23' and a.semana_numero = 34),
  'pendiente',
  'la asistencia queda pendiente de revisión'
);
select is(public.preparar_envio('TEST23', '198.51.100.1') ->> 'error', 'ya_registrada', 'no puede enviar dos veces la misma semana');
select is(public.confirmar_envio(current_setting('test.envio1')::bigint, 50000) ->> 'error', 'envio_ya_confirmado', 'un envío no se confirma dos veces');

-- ---------------------------------------------
-- Foto parecida (huella a 1 bit de distancia, misma comunidad)
-- ---------------------------------------------
select set_config('test.envio2', (public.preparar_envio('TEST24', '198.51.100.2', 43, null) ->> 'envio_id'), true);
select is(public.confirmar_envio(current_setting('test.envio2')::bigint, 50000) ->> 'similar', 'true', 'detecta que la foto se parece a otra');
select is(
  (select similar_a_envio_id from public.envios_foto where id = current_setting('test.envio2')::bigint),
  current_setting('test.envio1')::bigint,
  'apunta a la foto parecida'
);

-- ---------------------------------------------
-- Martes: cerrado para envíos nuevos, abierto para reenviar rechazadas
-- ---------------------------------------------
select set_config('app.ahora', '2026-10-20 10:00:00-05', true);
select is(public.preparar_envio('TEST26', '198.51.100.3') ->> 'error', 'formulario_cerrado', 'el martes no se aceptan envíos nuevos');

update public.asistencias a set estado = 'rechazado', motivo = 'Foto repetida'
from public.alumnos al
where al.id = a.alumno_id and al.codigo = 'TEST24' and a.semana_numero = 34;

set local role anon;
select is(public.identificar_alumno('TEST24') ->> 'accion', 'reenviar', 'el alumno rechazado ve la opción de reenviar');
reset role;

select set_config('test.envio3', (public.preparar_envio('TEST24', '198.51.100.2', 999, null) ->> 'envio_id'), true);
select is(public.confirmar_envio(current_setting('test.envio3')::bigint, 50000) ->> 'ok', 'true', 'el reenvío se acepta hasta el miércoles');
select is(
  (select a.estado::text || '|' || coalesce(a.motivo, 'sin motivo') from public.asistencias a
    join public.alumnos al on al.id = a.alumno_id
    where al.codigo = 'TEST24' and a.semana_numero = 34),
  'pendiente|sin motivo',
  'tras reenviar vuelve a pendiente y se limpia el motivo'
);
select is(
  (select count(*) from public.envios_foto e join public.alumnos al on al.id = e.alumno_id
    where al.codigo = 'TEST24' and e.semana_numero = 34),
  2::bigint,
  'la foto rechazada no se borra'
);

-- ---------------------------------------------
-- Jueves: cierre automático de la semana 34
-- ---------------------------------------------
select set_config('app.ahora', '2026-10-22 00:05:00-05', true);
select is(public._cerrar_semana_vencida(), 10, 'marca inasistencia a los 10 alumnos sin registro');
select is(
  (select a.estado::text from public.asistencias a join public.alumnos al on al.id = a.alumno_id
    where al.codigo = 'TEST23' and a.semana_numero = 34),
  'pendiente',
  'quien envió foto sigue pendiente aunque no la hayan revisado'
);
select is(public._cerrar_semana_vencida(), 0, 'cerrar dos veces no duplica nada');

select set_config('app.ahora', '2026-10-19 12:00:00-05', true);
select is(public.preparar_envio('TEST25', '198.51.100.4') ->> 'error', 'semana_cerrada', 'una semana cerrada ya no acepta fotos');

-- ---------------------------------------------
-- Límite de intentos por IP
-- ---------------------------------------------
insert into public.intentos_codigo (ip) select '192.0.2.9' from generate_series(1, 10);
select set_config('request.headers', '{"x-forwarded-for": "192.0.2.9"}', true);
set local role anon;
select is(public.identificar_alumno('TEST22') ->> 'error', 'demasiados_intentos', 'tras 10 intentos fallidos la IP queda bloqueada 15 minutos');
reset role;

select * from finish();
rollback;
