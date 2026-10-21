-- Administración: importar alumnos, regenerar códigos, activar ciclos y copiar comunidades.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select set_config('test.san_pablo', (select id::text from public.comunidades where nombre = 'San Pablo'), true);
select set_config('test.codigo_ana', (select codigo from public.alumnos where codigo = 'TEST22'), true);
-- Alumno de otra comunidad: el guía no lo ve por RLS, por eso se guarda antes
select set_config('test.diego', (select id::text from public.alumnos where nombre_completo = 'Diego Prueba Cuatro'), true);

-- ---------------------------------------------
-- Admin
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is(
  public.importar_alumnos(
    current_setting('test.san_pablo')::bigint,
    array['  Nuevo   Alumno ', 'nuevo alumno', 'Ana Prueba Uno', '', 'Otra Persona']
  ),
  '{"agregados": 2, "repetidos": 2}'::jsonb,
  'importa 2 alumnos: ignora vacíos y repetidos (en la lista y ya registrados)'
);
select is(
  (select count(*) from public.alumnos where nombre_completo = 'Nuevo Alumno'),
  1::bigint,
  'limpia los espacios de más'
);
select matches(
  (select codigo from public.alumnos where nombre_completo = 'Otra Persona'),
  '^[A-HJKMNP-Z2-9]{6}$',
  'los importados reciben su código'
);

-- Ciclo 2027 para el año siguiente
insert into public.ciclos (nombre, anio, fecha_inicio, fecha_fin)
values ('Ciclo 2027', 2027, '2027-03-07', '2027-12-12');

select is(
  public.copiar_comunidades(
    (select id from public.ciclos where anio = 2026),
    (select id from public.ciclos where anio = 2027)
  ),
  4,
  'copia las 4 comunidades al ciclo nuevo'
);
select is(
  (select count(*) from public.staff_comunidades sc
     join public.comunidades c on c.id = sc.comunidad_id
     join public.ciclos ci on ci.id = c.ciclo_id
     join public.staff s on s.id = sc.staff_id
   where ci.anio = 2027 and s.email = 'guia.uno@ejemplo.com'),
  2::bigint,
  'y mantiene a cada guía en sus comunidades'
);
select is(
  public.copiar_comunidades(
    (select id from public.ciclos where anio = 2026),
    (select id from public.ciclos where anio = 2027)
  ),
  0,
  'copiar otra vez no duplica nada'
);

select lives_ok(
  $$select public.activar_ciclo((select id from public.ciclos where anio = 2027))$$,
  'activa el ciclo nuevo'
);
select is(
  (select array_agg(anio) from public.ciclos where activo),
  array[2027],
  'y desactiva el anterior (solo uno activo)'
);
reset role;

-- ---------------------------------------------
-- Guía Uno
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select isnt(
  public.regenerar_codigo((select id from public.alumnos where codigo = current_setting('test.codigo_ana'))),
  current_setting('test.codigo_ana'),
  'el guía puede dar un código nuevo a un alumno de su comunidad'
);
select throws_ok(
  format('select public.regenerar_codigo(%s)', current_setting('test.diego')),
  'P0002', null,
  'pero no a uno de otra comunidad'
);
select throws_ok(
  format('select public.importar_alumnos(%s, array[%L])', current_setting('test.san_pablo'), 'Intruso'),
  '42501', null,
  'un guía no puede importar alumnos'
);
select throws_ok(
  $$select public.activar_ciclo((select id from public.ciclos where anio = 2026))$$,
  '42501', null,
  'ni activar ciclos'
);
reset role;

select ok(
  (select codigo from public.alumnos where nombre_completo = 'Ana Prueba Uno') <> current_setting('test.codigo_ana'),
  'el código viejo deja de servir'
);
select ok(
  not has_function_privilege('anon', 'public.regenerar_codigo(bigint)', 'execute'),
  'un alumno no puede regenerar códigos'
);

select * from finish();
rollback;
