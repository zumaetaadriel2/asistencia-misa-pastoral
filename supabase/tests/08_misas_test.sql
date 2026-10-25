-- Misas cerca de mí: lectura pública, escritura solo del admin, importación y validaciones.
-- Seed: San Miguel (Trujillo) y San Juan (El Porvenir) con misas; Santa Ana inactiva;
-- Cristo Rey sin misas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

-- Domingo 25 de octubre de 2026
select set_config('app.ahora', '2026-10-25 10:00:00-05', true);
select set_config('test.san_juan', (select id::text from public.iglesias where nombre = 'Parroquia de Prueba San Juan'), true);

-- ---------------------------------------------
-- Página pública (anon)
-- ---------------------------------------------
set local role anon;

select is(jsonb_array_length(public.iglesias_con_misas()), 2, 'se ven solo las iglesias activas que tienen misas');
select is(public.iglesias_con_misas() -> 0 ->> 'nombre', 'Parroquia de Prueba San Juan', 'ordenadas por nombre');
select is(
  (select e -> 'misas' from jsonb_array_elements(public.iglesias_con_misas()) e
   where e ->> 'nombre' = 'Parroquia de Prueba San Miguel'),
  '[{"dia": 6, "hora": "19:00"}, {"dia": 7, "hora": "08:00"}, {"dia": 7, "hora": "11:00"}, {"dia": 7, "hora": "19:00"}]'::jsonb,
  'cada iglesia trae sus misas del sábado y del domingo en orden'
);
select is(
  (select (e ->> 'latitud')::numeric from jsonb_array_elements(public.iglesias_con_misas()) e
   where e ->> 'nombre' = 'Parroquia de Prueba San Miguel'),
  -8.111600,
  'con su ubicación para calcular la distancia en el celular'
);
select throws_ok('select count(*) from public.iglesias', '42501', null, 'anon no lee la tabla de iglesias');
select throws_ok('select count(*) from public.horarios_misa', '42501', null, 'ni la de misas');
select throws_ok(
  $$select public.guardar_iglesia(null, '{"nombre": "Intrusa"}'::jsonb)$$,
  '42501', null, 'anon no puede guardar iglesias'
);
select throws_ok(
  $$select public.importar_iglesias('[{"nombre": "Intrusa"}]'::jsonb)$$,
  '42501', null, 'ni importarlas'
);
reset role;

select ok(
  not has_function_privilege('anon', 'public._guardar_iglesia(bigint, jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public._guardar_iglesia(bigint, jsonb)', 'execute'),
  'la función interna no se puede llamar desde la app'
);

-- ---------------------------------------------
-- Un guía no edita iglesias
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.iglesias), 0::bigint, 'el guía no ve la tabla de iglesias');
select throws_ok(
  format($$select public.guardar_iglesia(%s, '{"nombre": "Cambio"}'::jsonb)$$, current_setting('test.san_juan')),
  '42501', 'Solo un administrador puede editar las iglesias.', 'ni la edita por RPC'
);
select is(jsonb_array_length(public.iglesias_con_misas()), 2, 'pero ve la página pública como cualquiera');
-- RLS: no falla, pero no cambia ninguna fila
update public.iglesias set activa = false;
reset role;
select is((select count(*) from public.iglesias where activa), 3::bigint, 'el guía no puede desactivar iglesias directo');

-- ---------------------------------------------
-- Admin: importar, editar y validar
-- ---------------------------------------------
select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;

select is((select count(*) from public.iglesias), 4::bigint, 'el admin ve todas, también la inactiva y la sin misas');

select is(
  public.importar_iglesias($$[
    {"nombre": "Parroquia de Prueba Nueva", "distrito": "Moche", "direccion": "Calle Falsa 1",
     "latitud": -8.170000, "longitud": -79.010000, "misas": [{"dia": 7, "hora": "09:00"}]},
    {"nombre": "parroquia de prueba  san miguel", "distrito": "Trujillo", "direccion": "Jr. Ficticio 123",
     "latitud": -8.111600, "longitud": -79.028700, "misas": [{"dia": 7, "hora": "12:00"}]}
  ]$$::jsonb),
  '{"creadas": 1, "actualizadas": 1}'::jsonb,
  'importa una iglesia nueva y actualiza otra que ya existía (sin importar mayúsculas ni espacios)'
);
select is((select count(*) from public.iglesias), 5::bigint, 'la existente no se duplica');
select is(
  (select array_agg(to_char(h.hora, 'HH24:MI')) from public.horarios_misa h
   join public.iglesias i on i.id = h.iglesia_id where lower(i.nombre) = 'parroquia de prueba san miguel'),
  array['12:00'],
  'sus misas se reemplazan por las del Excel'
);
select is(
  (select verificado_en from public.iglesias where lower(nombre) = 'parroquia de prueba san miguel'),
  '2026-10-25'::date,
  'y queda revisada hoy'
);
select is(jsonb_array_length(public.iglesias_con_misas()), 3, 'la nueva ya sale en la página pública');

select is(
  public.guardar_iglesia(
    current_setting('test.san_juan')::bigint,
    $${"nombre": "Parroquia de Prueba San Juan", "distrito": "El Porvenir", "direccion": "Av. Imaginaria 456",
       "latitud": -8.077500, "longitud": -79.000800, "telefono": "044 111111",
       "misas": [{"dia": 6, "hora": "17:00"}, {"dia": 7, "hora": "07:00"}]}$$::jsonb
  ),
  current_setting('test.san_juan')::bigint,
  'guardar_iglesia edita por id y devuelve el mismo id'
);
select is(
  (select count(*) from public.horarios_misa where iglesia_id = current_setting('test.san_juan')::bigint),
  2::bigint,
  'la misa del sábado a las 17:00 ya cuenta'
);

select throws_like(
  format($$select public.guardar_iglesia(%s, '{"nombre": "Parroquia de Prueba San Juan", "distrito": "El Porvenir",
    "latitud": -79.0008, "longitud": -8.0775, "misas": []}'::jsonb)$$, current_setting('test.san_juan')),
  '%no está en la provincia de Trujillo%',
  'rechaza la ubicación con latitud y longitud al revés'
);
select throws_like(
  format($$select public.guardar_iglesia(%s, '{"nombre": "Parroquia de Prueba San Juan", "distrito": "El Porvenir",
    "latitud": -8.0775, "longitud": -79.0008, "misas": [{"dia": 6, "hora": "10:00"}]}'::jsonb)$$,
    current_setting('test.san_juan')),
  '%antes de las 17:00 no son dominicales%',
  'rechaza las misas del sábado antes de las 17:00'
);
select throws_like(
  format($$select public.guardar_iglesia(%s, '{"nombre": "Parroquia de Prueba San Juan", "distrito": "El Porvenir",
    "latitud": -8.0775, "longitud": -79.0008, "misas": [{"dia": 3, "hora": "19:00"}]}'::jsonb)$$,
    current_setting('test.san_juan')),
  '%solo se cargan misas de sábado y domingo%',
  'rechaza las misas entre semana'
);
select throws_like(
  $$select public.guardar_iglesia(null, '{"nombre": "Otra", "distrito": "Lima", "latitud": -8.1, "longitud": -79.0}'::jsonb)$$,
  '%no es de la provincia de Trujillo%',
  'rechaza un distrito que no es de la provincia'
);
select throws_like(
  format($$select public.guardar_iglesia(%s, '{"nombre": "Parroquia de Prueba Nueva", "distrito": "Moche",
    "latitud": -8.1, "longitud": -79.0, "misas": []}'::jsonb)$$, current_setting('test.san_juan')),
  'Ya hay otra iglesia%',
  'no deja dos iglesias con el mismo nombre en el mismo distrito'
);
select throws_ok(
  $$select public.importar_iglesias('[]'::jsonb)$$,
  'P0001', 'No hay iglesias para importar.', 'una importación vacía avisa'
);
select throws_like(
  $$select public.importar_iglesias('[
    {"nombre": "Capilla Que No Debe Quedar", "distrito": "Huanchaco", "latitud": -8.08, "longitud": -79.12, "misas": []},
    {"nombre": "Mala", "distrito": "Huanchaco", "latitud": -79.12, "longitud": -8.08, "misas": []}
  ]'::jsonb)$$,
  '%«Mala»%',
  'si una fila falla, el mensaje dice cuál'
);
select is(
  (select count(*) from public.iglesias where nombre = 'Capilla Que No Debe Quedar'),
  0::bigint,
  'y no se importa ninguna'
);

update public.iglesias set activa = false where id = current_setting('test.san_juan')::bigint;
select is(
  (select activa from public.iglesias where id = current_setting('test.san_juan')::bigint),
  false,
  'el admin desactiva directo'
);
select is(jsonb_array_length(public.iglesias_con_misas()), 2, 'y la desactivada deja de salir en la página pública');
reset role;

select * from finish();
rollback;
