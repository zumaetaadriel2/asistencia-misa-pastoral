-- Límite de códigos equivocados: por IP sí, a todos solo con el freno de emergencia; y la alerta del admin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- 3.000 intentos de muchas IP (lo que antes bloqueaba a todos)
insert into public.intentos_codigo (ip)
select '198.51.100.' || (g % 200) from generate_series(1, 3000) g;

select is(public._limite_intentos_superado('203.0.113.50'), false, 'con 3.000 intentos de otras IP, un alumno nuevo no queda bloqueado');

insert into public.intentos_codigo (ip) select '203.0.113.60' from generate_series(1, 30);
select is(public._limite_intentos_superado('203.0.113.60'), true, 'una IP con 30 códigos equivocados sí queda bloqueada');

-- La alerta: solo el administrador
select ok(not has_function_privilege('anon', 'public.alerta_intentos()', 'execute'), 'un alumno no puede ver la alerta');

select set_config('request.jwt.claims', '{"email": "guia.uno@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select throws_ok($$select public.alerta_intentos()$$, '42501', null, 'un guía tampoco');
reset role;

select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is((public.alerta_intentos() ->> 'ultima_hora')::int, 3030, 'cuenta los intentos de la última hora');
select is((public.alerta_intentos() ->> 'ips')::int, 201, 'y desde cuántas IP');
select is((public.alerta_intentos() ->> 'bloqueo_global')::boolean, false, 'sin el freno de emergencia activo');
reset role;

-- El freno de emergencia: 20.000 en 15 minutos
insert into public.intentos_codigo (ip)
select '192.0.2.' || (g % 250) from generate_series(1, 17000) g;
select is(public._limite_intentos_superado('203.0.113.50'), true, 'con 20.000 intentos en 15 minutos se bloquea a todos');

select set_config('request.jwt.claims', '{"email": "admin@ejemplo.com", "role": "authenticated"}', true);
set local role authenticated;
select is((public.alerta_intentos() ->> 'bloqueo_global')::boolean, true, 'y la alerta lo dice');
reset role;

select * from finish();
rollback;
