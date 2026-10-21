-- Permisos: anon sin tablas, guías limitados a sus comunidades, admin con todo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- ---------------------------------------------
-- Permisos de ejecución
-- ---------------------------------------------
select ok(has_function_privilege('anon', 'public.estado_formulario()', 'execute'), 'anon puede consultar el horario');
select ok(has_function_privilege('anon', 'public.identificar_alumno(text)', 'execute'), 'anon puede identificarse con su código');
select ok(not has_function_privilege('anon', 'public.preparar_envio(text,text,bigint,timestamptz)', 'execute'), 'anon no puede preparar envíos directamente');
select ok(not has_function_privilege('authenticated', 'public.confirmar_envio(bigint,text,int)', 'execute'), 'el staff no puede confirmar envíos');
select ok(has_function_privilege('service_role', 'public.preparar_envio(text,text,bigint,timestamptz)', 'execute'), 'service_role (Edge Functions) puede preparar envíos');
select ok(not has_function_privilege('anon', 'public.revisar_asistencia(bigint,text,text)', 'execute'), 'anon no puede revisar');
select ok(not has_function_privilege('authenticated', 'public._cerrar_semana(bigint,int)', 'execute'), 'nadie llama funciones internas');
select ok(has_function_privilege('supabase_auth_admin', 'public.hook_antes_de_crear_usuario(jsonb)', 'execute'), 'Auth puede usar el hook');

-- ---------------------------------------------
-- Hook de registro
-- ---------------------------------------------
select is(
  public.hook_antes_de_crear_usuario('{"user": {"email": "Guia.Uno@ejemplo.com"}}'),
  '{}'::jsonb,
  'un correo registrado puede crear cuenta (sin importar mayúsculas)'
);
select is(
  public.hook_antes_de_crear_usuario('{"user": {"email": "intruso@ejemplo.com"}}') -> 'error' ->> 'http_code',
  '403',
  'un correo no registrado es rechazado'
);

-- ---------------------------------------------
-- anon
-- ---------------------------------------------
set local role anon;
select throws_ok('select count(*) from public.alumnos', '42501', null, 'anon no puede leer alumnos');
select throws_ok('select count(*) from public.asistencias', '42501', null, 'anon no puede leer asistencias');
reset role;

-- ---------------------------------------------
-- Guía Uno: San Pablo y San José
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.alumnos), 6::bigint, 'el guía ve solo los alumnos de sus 2 comunidades');
select is((select count(*) from public.asistencias), 2::bigint, 'el guía ve solo las asistencias de sus comunidades');
select throws_ok(
  $$insert into public.alumnos (comunidad_id, nombre_completo) select id, 'Intruso' from public.comunidades limit 1$$,
  '42501', null, 'el guía no puede crear alumnos'
);
select throws_ok(
  $$update public.asistencias set estado = 'validado'$$,
  '42501', null, 'el guía no puede modificar asistencias directamente'
);
reset role;

-- ---------------------------------------------
-- Correo autenticado que no es staff
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "intruso@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.alumnos), 0::bigint, 'un usuario que no es staff no ve nada');
reset role;

-- ---------------------------------------------
-- Admin
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.alumnos), 12::bigint, 'el admin ve todos los alumnos');
select lives_ok(
  $$insert into public.alumnos (comunidad_id, nombre_completo) select id, 'Alumno Nuevo' from public.comunidades where nombre = 'San Pablo'$$,
  'el admin puede crear alumnos'
);
select matches(
  (select codigo from public.alumnos where nombre_completo = 'Alumno Nuevo'),
  '^[A-HJKMNP-Z2-9]{6}$',
  'el código se genera solo, con 6 caracteres sin 0/O/1/I/L'
);
reset role;

select * from finish();
rollback;
