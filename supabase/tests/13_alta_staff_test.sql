-- Alta del staff desde Pastoral Digital (dar_de_alta_staff) y permisos sobre la tabla staff.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

-- Solo la Edge Function (service_role) da de alta
select ok(not has_function_privilege('authenticated', 'public.dar_de_alta_staff(text,text,text,public.rol_staff)', 'execute'), 'el staff no puede dar de alta directo');
select ok(not has_function_privilege('anon', 'public.dar_de_alta_staff(text,text,text,public.rol_staff)', 'execute'), 'un alumno tampoco');

select is(
  (public.dar_de_alta_staff('user_nuevo', ' Nueva.Guia@Ejemplo.com ', ' Nueva Guía ', 'guia') ->> 'ok')::boolean, true,
  'da de alta a una persona nueva'
);
select is(
  (select email || '|' || nombre || '|' || rol || '|' || pastoral_id from public.staff where pastoral_id = 'user_nuevo'),
  'nueva.guia@ejemplo.com|Nueva Guía|guia|user_nuevo',
  'guarda su correo en minúsculas, su nombre, su rol y su ID de Pastoral Digital'
);
select is(
  public.dar_de_alta_staff('user_nuevo', 'otro@ejemplo.com', 'Otro', 'guia') ->> 'error', 'ya_registrado',
  'la misma persona no se da de alta dos veces'
);
select is(
  public.dar_de_alta_staff('user_otro', 'nueva.guia@ejemplo.com', 'Otra', 'guia') ->> 'error', 'ya_registrado',
  'ni otro usuario con un correo ya vinculado'
);
select is(
  (public.dar_de_alta_staff('user_guia1', 'GUIA.UNO@ejemplo.com', 'Guía Uno de Pastoral', 'admin') ->> 'vinculado')::boolean, true,
  'el staff de antes con el mismo correo se vincula'
);
select is(
  (select rol::text || '|' || pastoral_id from public.staff where email = 'guia.uno@ejemplo.com'),
  'guia|user_guia1',
  'al vincular no le cambia el rol'
);
select is(
  public.dar_de_alta_staff('user_x', 'no-es-correo', 'X', 'guia') ->> 'error', 'datos_invalidos',
  'rechaza un correo inválido'
);

-- El administrador ya no inserta staff ni cambia correos; sí el rol y si está activo
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.staff (email, nombre) values ('cualquiera@ejemplo.com', 'Cualquiera')$$,
  '42501', null, 'el administrador no puede insertar staff a mano'
);
select throws_ok(
  $$update public.staff set email = 'cambiado@ejemplo.com' where email = 'guia.dos@ejemplo.com'$$,
  '42501', null, 'ni cambiar el correo de alguien'
);
select lives_ok(
  $$update public.staff set activo = false where email = 'guia.dos@ejemplo.com'$$,
  'sí puede desactivar a alguien'
);
reset role;
select is((select activo from public.staff where email = 'guia.dos@ejemplo.com'), false, 'y el cambio queda guardado');

select * from finish();
rollback;
