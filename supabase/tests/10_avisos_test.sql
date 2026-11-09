-- Avisos push: registrar y quitar suscripciones, y a quién le toca cada aviso.
-- Seed: pendientes de la semana 33 (domingo 11 de octubre) para TEST22 (San Pablo), TEST25
-- (Santa Rosa) y TEST28 (San José). Hora simulada: ese domingo a las 8 a. m., con el envío abierto.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

select set_config('app.ahora', '2026-10-11 08:00:00-05', true);

-- Direcciones y claves ficticias
create temporary table direcciones (quien text primary key, suscripcion jsonb);
insert into direcciones
select v.quien, jsonb_build_object(
  'endpoint', 'https://fcm.googleapis.com/fcm/send/' || v.quien,
  'keys', jsonb_build_object('p256dh', repeat('B', 87), 'auth', repeat('a', 22))
)
from (values ('ana'), ('bruno'), ('otra'), ('guia1'), ('guia2'), ('catequista'), ('admin')) v(quien);
grant select on direcciones to anon, authenticated;

create function pg_temp.suscripcion(p_endpoint text) returns jsonb language sql as $$
  select jsonb_build_object('endpoint', p_endpoint, 'keys', jsonb_build_object('p256dh', repeat('B', 87), 'auth', repeat('a', 22)));
$$;

-- ---------------------------------------------
-- Alumno
-- ---------------------------------------------
set local role anon;

select is(
  public.registrar_aviso_alumno('TEST22', (select suscripcion from direcciones where quien = 'ana')) ->> 'ok',
  'true',
  'el alumno activa los avisos con su código'
);
select is(
  public.registrar_aviso_alumno('TEST23', (select suscripcion from direcciones where quien = 'bruno')) ->> 'ok',
  'true',
  'otro alumno también'
);
select is(
  public.registrar_aviso_alumno('MAL000', (select suscripcion from direcciones where quien = 'otra')) ->> 'error',
  'codigo_invalido',
  'con un código equivocado no se guarda'
);

select throws_ok(
  format('select public.registrar_aviso_alumno(%L, %L::jsonb)', 'TEST22', pg_temp.suscripcion('https://sitio-cualquiera.com/x')),
  '22023', null, 'no acepta direcciones que no sean de un servicio de avisos'
);
select throws_ok(
  format('select public.registrar_aviso_alumno(%L, %L::jsonb)', 'TEST22', pg_temp.suscripcion('https://fcm.googleapis.com.sitio-falso.com/x')),
  '22023', null, 'ni un dominio que solo se le parece'
);
select throws_ok(
  format('select public.registrar_aviso_alumno(%L, %L::jsonb)', 'TEST22', pg_temp.suscripcion('http://fcm.googleapis.com/x')),
  '22023', null, 'ni sin https'
);
select throws_ok(
  format('select public.registrar_aviso_alumno(%L, %L::jsonb)', 'TEST22', '{"endpoint": "https://fcm.googleapis.com/x"}'),
  '22023', null, 'ni una suscripción sin claves'
);

select lives_ok(
  format('select public.registrar_aviso_alumno(%L, %L::jsonb)', 'TEST24', pg_temp.suscripcion('https://web.push.apple.com/abc')),
  'acepta la dirección de Apple'
);
select lives_ok(
  format('select public.registrar_aviso_alumno(%L, %L::jsonb)', 'TEST24', pg_temp.suscripcion('https://wns2-par02p.notify.windows.com/w/?token=abc')),
  'y la de Microsoft'
);

select throws_ok('select count(*) from public.suscripciones_push', '42501', null, 'un alumno no puede leer las suscripciones');
select throws_ok($$select * from public.avisos_para_enviar('apertura')$$, '42501', null, 'ni pedir a quién avisar');
select throws_ok('select public.quitar_suscripciones(array[1::bigint])', '42501', null, 'ni borrar por id');
reset role;

select is((select count(*) from public.intentos_codigo)::int, 1, 'el código equivocado cuenta como intento fallido');

-- ---------------------------------------------
-- Staff
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.registrar_aviso_staff((select suscripcion from direcciones where quien = 'guia1'))$$, 'el guía activa los avisos');
select throws_ok($$select * from public.avisos_para_enviar('revision')$$, '42501', null, 'un guía no puede pedir a quién avisar');
reset role;

select set_config('request.jwt.claims', '{"email": "guia.dos@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.registrar_aviso_staff((select suscripcion from direcciones where quien = 'guia2'))$$, 'el otro guía también');
reset role;

select set_config('request.jwt.claims', '{"email": "catequista.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.registrar_aviso_staff((select suscripcion from direcciones where quien = 'catequista'))$$, 'el catequista puede activarlos');
reset role;

select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select lives_ok($$select public.registrar_aviso_staff((select suscripcion from direcciones where quien = 'admin'))$$, 'el admin también');
reset role;

select set_config('request.jwt.claims', '{"email": "no.es.staff@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.registrar_aviso_staff((select suscripcion from direcciones where quien = 'otra'))$$, '42501', null, 'quien no es staff no puede');
reset role;

-- ---------------------------------------------
-- A quién le toca cada aviso
-- ---------------------------------------------
-- Ana (TEST22) ya envió su foto de la semana 33; Bruno (TEST23) no
select is(
  (select array_agg(endpoint order by endpoint) from public.avisos_para_enviar('recordatorio') where endpoint like '%/fcm/send/%'),
  array['https://fcm.googleapis.com/fcm/send/bruno'],
  'el recordatorio solo le llega a quien no envió su foto'
);
select is(
  (select array_agg(endpoint order by endpoint) from public.avisos_para_enviar('apertura') where endpoint like '%/fcm/send/%'),
  array['https://fcm.googleapis.com/fcm/send/ana', 'https://fcm.googleapis.com/fcm/send/bruno'],
  'la apertura les llega a todos los alumnos'
);
select is(
  (select cuerpo from public.avisos_para_enviar('cierre') where endpoint like '%/bruno'),
  'Te falta tu foto de esta semana: el envío cierra hoy a las 11:59 p. m.',
  'el texto no lleva datos del alumno'
);

select is(
  (select cuerpo from public.avisos_para_enviar('revision') where endpoint like '%/guia1'),
  'Tienes 2 fotos por revisar en San José, San Pablo.',
  'el guía recibe el total de sus comunidades'
);
select is(
  (select cuerpo from public.avisos_para_enviar('revision') where endpoint like '%/guia2'),
  'Tienes 1 foto por revisar en Santa Rosa.',
  'en singular si es una sola'
);
select is(
  (select cuerpo from public.avisos_para_enviar('revision') where endpoint like '%/admin'),
  'Hay 3 fotos por revisar en todas las comunidades.',
  'el admin recibe el total general'
);
select is(
  (select count(*)::int from public.avisos_para_enviar('revision') where endpoint like '%/catequista'),
  0,
  'el catequista no recibe avisos de fotos'
);

-- Formulario cerrado: martes, con el envío ya terminado
select set_config('app.ahora', '2026-10-13 18:00:00-05', true);
select is((select count(*)::int from public.avisos_para_enviar('cierre')), 0, 'fuera del horario no se avisa a los alumnos');

-- Formulario forzado en «Cerrado»: domingo, pero nadie puede enviar
select set_config('app.ahora', '2026-10-11 08:00:00-05', true);
update public.ciclos set abierto_manual = false where activo;
select is((select count(*)::int from public.avisos_para_enviar('apertura')), 0, 'con el formulario en «Cerrado» tampoco');
update public.ciclos set abierto_manual = null where activo;

-- ---------------------------------------------
-- Quitar y envío programado
-- ---------------------------------------------
set local role anon;
select public.quitar_aviso('https://fcm.googleapis.com/fcm/send/bruno');
reset role;
select is(
  (select count(*)::int from public.suscripciones_push where endpoint like '%/bruno'),
  0,
  'el alumno puede quitar sus avisos'
);

-- El mismo celular pasa a ser de quien activa los avisos ahora
set local role anon;
select public.registrar_aviso_alumno('TEST23', (select suscripcion from direcciones where quien = 'ana'));
reset role;
select is(
  (select a.codigo from public.suscripciones_push s join public.alumnos a on a.id = s.alumno_id where s.endpoint like '%/ana'),
  'TEST23',
  'el celular cambia de dueño en vez de repetirse'
);

-- Como máximo 5 celulares por persona: quedan los más nuevos
set local role anon;
select public.registrar_aviso_alumno('TEST26', pg_temp.suscripcion('https://fcm.googleapis.com/fcm/send/celular-' || n)) from generate_series(1, 7) n;
reset role;
select is(
  (select array_agg(replace(s.endpoint, 'https://fcm.googleapis.com/fcm/send/', '') order by s.id)
   from public.suscripciones_push s join public.alumnos a on a.id = s.alumno_id where a.codigo = 'TEST26'),
  array['celular-3', 'celular-4', 'celular-5', 'celular-6', 'celular-7'],
  'como máximo 5 celulares por alumno'
);

select is((select count(*)::int from cron.job where jobname like 'avisos-%'), 4, 'están programados los cuatro avisos');
select lives_ok($$select public._pedir_avisos('apertura')$$, 'sin los secretos de Vault no falla');
select is((select count(*)::int from net.http_request_queue), 0, 'y no hace ninguna llamada');

select * from finish();
rollback;
