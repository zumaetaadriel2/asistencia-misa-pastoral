-- Aviso de foto rechazada (avisos_para_enviar('rechazo') y la tarea cada 15 minutos).
-- Seed: pendientes de la semana 33 (domingo 11 de octubre) para TEST22, TEST25 y TEST28.
-- Hora simulada: lunes 12 de octubre, con el reenvío abierto hasta el miércoles.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select set_config('app.ahora', '2026-10-12 10:00:00-05', true);

-- TEST22: rechazada hace 5 minutos (ya no se puede deshacer). TEST25: rechazada recién.
-- TEST28: rechazada hace 5 minutos, pero sin avisos activados.
update public.asistencias a
set estado = 'rechazado', motivo = 'No se ve el rostro', revisado_en = now() - interval '5 minutes'
from public.alumnos al
where al.id = a.alumno_id and al.codigo in ('TEST22', 'TEST28') and a.semana_numero = 33;

update public.asistencias a
set estado = 'rechazado', motivo = 'Foto borrosa', revisado_en = now()
from public.alumnos al
where al.id = a.alumno_id and al.codigo = 'TEST25' and a.semana_numero = 33;

insert into public.suscripciones_push (endpoint, p256dh, auth, alumno_id)
select 'https://fcm.googleapis.com/fcm/send/' || al.codigo, repeat('B', 87), repeat('a', 22), al.id
from public.alumnos al
where al.codigo in ('TEST22', 'TEST25');

select is(
  (select count(*)::int from public._rechazos_por_avisar()),
  2,
  'quedan por avisar los rechazos firmes de esta semana (TEST22 y TEST28; TEST25 aún se puede deshacer)'
);

select is(
  (select array_agg(endpoint order by endpoint) from public.avisos_para_enviar('rechazo')),
  array['https://fcm.googleapis.com/fcm/send/TEST22'],
  'el aviso le llega a quien tiene avisos activados y un rechazo firme'
);
select is(
  (select count(*)::int from public.avisos_para_enviar('rechazo')),
  0,
  'la misma foto no se avisa dos veces'
);
select is(
  (select count(*)::int from public.rechazos_avisados),
  1,
  'el rechazo de quien no tiene avisos no se marca: si los activa esta semana, todavía le llega'
);

-- Pasados los 2 minutos se avisa, con un texto genérico: el motivo que escribió el guía no viaja
update public.asistencias a
set revisado_en = now() - interval '5 minutes'
from public.alumnos al
where al.id = a.alumno_id and al.codigo = 'TEST25' and a.semana_numero = 33;
select is(
  (select cuerpo from public.avisos_para_enviar('rechazo') where endpoint like '%TEST25'),
  'Tu foto de esta semana fue rechazada. Entra para ver el motivo y enviar otra hasta el miércoles a las 11:59 p. m.',
  'pasados los 2 minutos también se avisa, sin el motivo del guía'
);

-- TEST22 manda otra foto y también se la rechazan: es otra foto y se vuelve a avisar
with nueva as (
  insert into public.envios_foto (ciclo_id, alumno_id, semana_numero, foto_key, confirmado)
  select a.ciclo_id, a.alumno_id, 33, 'prueba/TEST22-segunda.jpg', true
  from public.asistencias a join public.alumnos al on al.id = a.alumno_id
  where al.codigo = 'TEST22' and a.semana_numero = 33
  returning id, alumno_id
)
update public.asistencias a
set envio_actual_id = nueva.id, estado = 'rechazado', revisado_en = now() - interval '5 minutes'
from nueva
where a.alumno_id = nueva.alumno_id and a.semana_numero = 33;
select is(
  (select count(*)::int from public.avisos_para_enviar('rechazo') where endpoint like '%TEST22'),
  1,
  'si rechazan la nueva foto, se avisa otra vez'
);

-- Fuera del reenvío ya no se avisa. TEST28 activa los avisos y su rechazo sigue sin avisar
insert into public.suscripciones_push (endpoint, p256dh, auth, alumno_id)
select 'https://fcm.googleapis.com/fcm/send/TEST28', repeat('B', 87), repeat('a', 22), id
from public.alumnos where codigo = 'TEST28';

-- El jueves la semana del formulario ya es otra
select set_config('app.ahora', '2026-10-15 10:00:00-05', true);
select is((select count(*)::int from public._rechazos_por_avisar()), 0, 'el jueves ya no se puede reenviar: no se avisa');

-- Con el formulario forzado en «Cerrado» tampoco se puede reenviar
select set_config('app.ahora', '2026-10-12 10:00:00-05', true);
update public.ciclos set abierto_manual = false where activo;
select is((select count(*)::int from public._rechazos_por_avisar()), 0, 'con el formulario en «Cerrado» tampoco');
update public.ciclos set abierto_manual = null where activo;
select is((select count(*)::int from public._rechazos_por_avisar()), 1, 'en automático sí (TEST28, que activó los avisos)');

-- ---------------------------------------------
-- Permisos y tarea programada
-- ---------------------------------------------
set local role anon;
select throws_ok('select count(*) from public.rechazos_avisados', '42501', null, 'un alumno no puede leer los rechazos avisados');
select throws_ok('select public._avisar_rechazos()', '42501', null, 'ni disparar los avisos');
reset role;

select is((select schedule from cron.job where jobname = 'avisos-rechazo'), '*/15 * * * *', 'la tarea corre cada 15 minutos');
select lives_ok('select public._avisar_rechazos()', 'con un rechazo por avisar y sin los secretos de Vault, no falla');
select is((select count(*)::int from net.http_request_queue), 0, 'y no hace ninguna llamada');

select * from finish();
rollback;
