-- Panel del staff: perfil, cola de revisión, resumen semanal y login solo con Google.
-- Seed: pendientes de la semana 33 para TEST22 (San Pablo), TEST25 (Santa Rosa) y TEST28 (San José).
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Foto anterior (semana 32) de TEST22, y su foto de la semana 33 marcada como parecida a esa
insert into public.envios_foto (ciclo_id, alumno_id, semana_numero, foto_key, huella, confirmado)
select c.ciclo_id, a.id, 32, 'seed/TEST22-semana-32.jpg', 1234567890120, true
from public.alumnos a join public.comunidades c on c.id = a.comunidad_id
where a.codigo = 'TEST22';

update public.envios_foto
set similar_a_envio_id = (select id from public.envios_foto where foto_key = 'seed/TEST22-semana-32.jpg'),
    distancia_similar = 3
where foto_key = 'seed/TEST22-semana-33.jpg';

-- ---------------------------------------------
-- Semana de la última misa
-- ---------------------------------------------
select set_config('app.ahora', '2026-10-17 20:00:00-05', true);
select is(public.semana_reciente(), 33, 'sábado: la última misa fue la del domingo anterior (semana 33)');
select set_config('app.ahora', '2026-10-18 10:00:00-05', true);
select is(public.semana_reciente(), 34, 'domingo: la semana 34');
select set_config('app.ahora', '2026-10-20 10:00:00-05', true);
select is(public.semana_reciente(), 34, 'martes: sigue siendo la semana 34');

-- ---------------------------------------------
-- Guía Uno: San Pablo y San José
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is((select nombre from public.mi_perfil_staff()), 'Guía Uno', 'el perfil devuelve su nombre');
select is((select rol::text from public.mi_perfil_staff()), 'guia', 'y su rol');
select is((select semana_reciente from public.mi_perfil_staff()), 34, 'y la semana de la última misa');

select is((select count(*) from public.cola_revision()), 2::bigint, 'la cola solo trae las fotos de sus comunidades');
select is(
  (select array_agg(alumno order by alumno) from public.cola_revision()),
  array['Ana Prueba Uno', 'Gabi Prueba Siete'],
  'Ana (San Pablo) y Gabi (San José)'
);
select is(
  (select anterior_semana from public.cola_revision() where alumno = 'Ana Prueba Uno'),
  32,
  'trae la foto anterior del alumno para comparar'
);
select is(
  (select similar_alumno || ' · semana ' || similar_semana || ' · ' || distancia_similar || ' bits'
     from public.cola_revision() where alumno = 'Ana Prueba Uno'),
  'Ana Prueba Uno · semana 32 · 3 bits',
  'y avisa a qué foto se parece'
);
select is(
  (select domingo from public.cola_revision() where alumno = 'Ana Prueba Uno'),
  '2026-10-11'::date,
  'incluye el domingo de la semana 33'
);
select is(
  (select anterior_envio_id from public.cola_revision() where alumno = 'Gabi Prueba Siete'),
  null,
  'sin foto anterior, el campo queda vacío'
);

select is((select count(*) from public.resumen_semana(33)), 6::bigint, 'el resumen incluye a los 6 alumnos de sus comunidades');
select is(
  (select estado from public.resumen_semana(33) where alumno = 'Ana Prueba Uno'),
  'pendiente',
  'con su estado en la semana'
);
select is(
  (select estado from public.resumen_semana(33) where alumno = 'Bruno Prueba Dos'),
  'sin_registro',
  'y "sin_registro" para quien no envió nada'
);
reset role;

-- ---------------------------------------------
-- Otros usuarios
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "intruso@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.mi_perfil_staff()), 0::bigint, 'quien no es staff no tiene perfil');
select is((select count(*) from public.cola_revision()), 0::bigint, 'ni ve fotos pendientes');
reset role;

select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.cola_revision()), 3::bigint, 'el admin ve todas las fotos pendientes');
reset role;

select ok(not has_function_privilege('anon', 'public.cola_revision()', 'execute'), 'un alumno no puede ver la cola');

-- ---------------------------------------------
-- Login: en producción solo con Google
-- ---------------------------------------------
select is(
  public.hook_antes_de_crear_usuario('{"user": {"email": "guia.uno@ejemplo.com", "app_metadata": {"provider": "email"}}}'),
  '{}'::jsonb,
  'en local (seed) se permite entrar con correo'
);

update public.ajustes set permitir_login_correo = false;
select is(
  public.hook_antes_de_crear_usuario('{"user": {"email": "guia.uno@ejemplo.com", "app_metadata": {"provider": "email"}}}')
    -> 'error' ->> 'message',
  'Solo se puede entrar con una cuenta de Google.',
  'en producción se rechaza el correo y contraseña, aunque el correo sea de staff'
);
select is(
  public.hook_antes_de_crear_usuario('{"user": {"email": "guia.uno@ejemplo.com", "app_metadata": {"provider": "google"}}}'),
  '{}'::jsonb,
  'con Google y correo registrado sí entra'
);

select * from finish();
rollback;
