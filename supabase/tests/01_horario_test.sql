-- Horario del formulario y número de semana (ciclo del seed: 2026-03-01 a 2026-12-13).
-- El fin de semana 17–19 de octubre de 2026 es la semana 34.
begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

-- ---------------------------------------------
-- Funciones de fecha
-- ---------------------------------------------
select is(public.primer_domingo('2026-03-01'), '2026-03-01'::date, 'primer domingo: si ya es domingo, ese mismo día');
select is(public.primer_domingo('2026-03-03'), '2026-03-08'::date, 'primer domingo: martes -> domingo siguiente');
select is(public.domingo_de_referencia('2026-10-17'), '2026-10-18'::date, 'sábado cuenta para el domingo siguiente');
select is(public.domingo_de_referencia('2026-10-21'), '2026-10-18'::date, 'miércoles pertenece al domingo anterior');
select is(public.domingo_de_referencia('2026-10-22'), '2026-10-25'::date, 'jueves ya mira al domingo siguiente');
select is(public.semana_de_domingo('2026-03-01', '2026-10-18'), 34, 'el 18 de octubre es la semana 34');
select is(
  public._fin_de_reenvio('2026-03-01', 34),
  '2026-10-21 23:59:59-05'::timestamptz,
  'el reenvío de la semana 34 vence el miércoles 21 a las 23:59:59'
);

-- ---------------------------------------------
-- Ventana automática
-- ---------------------------------------------
select set_config('app.ahora', '2026-10-17 18:59:00-05', true);
select is((select abierto from public.estado_formulario()), false, 'sábado 18:59: cerrado');
select is(
  (select proxima_apertura from public.estado_formulario()),
  '2026-10-17 19:00:00-05'::timestamptz,
  'sábado 18:59: abre hoy a las 19:00'
);

select set_config('app.ahora', '2026-10-17 19:00:00-05', true);
select is((select abierto from public.estado_formulario()), true, 'sábado 19:00: abierto');
select is((select semana from public.estado_formulario()), 34, 'sábado en la noche ya es la semana 34');
select is(
  (select cierre_envio from public.estado_formulario()),
  '2026-10-19 23:59:59-05'::timestamptz,
  'cierra el lunes 23:59:59'
);

select set_config('app.ahora', '2026-10-18 10:00:00-05', true);
select is((select abierto from public.estado_formulario()), true, 'domingo: abierto');

select set_config('app.ahora', '2026-10-19 23:59:30-05', true);
select is((select abierto from public.estado_formulario()), true, 'lunes 23:59: abierto');
select is((select semana from public.estado_formulario()), 34, 'lunes sigue siendo la semana 34');

select set_config('app.ahora', '2026-10-20 00:00:00-05', true);
select is((select abierto from public.estado_formulario()), false, 'martes 00:00: cerrado para envíos nuevos');
select is((select reenvio_abierto from public.estado_formulario()), true, 'martes: abierto para reenviar rechazadas');

select set_config('app.ahora', '2026-10-21 23:59:59-05', true);
select is((select reenvio_abierto from public.estado_formulario()), true, 'miércoles 23:59:59: todavía se puede reenviar');

select set_config('app.ahora', '2026-10-22 00:00:00-05', true);
select is((select reenvio_abierto from public.estado_formulario()), false, 'jueves 00:00: reenvío cerrado');
select is((select semana from public.estado_formulario()), 35, 'jueves ya muestra la semana siguiente');
select is(
  (select proxima_apertura from public.estado_formulario()),
  '2026-10-24 19:00:00-05'::timestamptz,
  'jueves: abre el sábado 24 a las 19:00'
);

-- ---------------------------------------------
-- Apertura y cierre manual
-- ---------------------------------------------
update public.ciclos set abierto_manual = true where activo;
select is((select abierto from public.estado_formulario()), true, 'manual abierto: abierto aunque sea jueves');
select is((select cierre_envio from public.estado_formulario()), null, 'manual: sin hora de cierre');

select set_config('app.ahora', '2026-10-18 10:00:00-05', true);
update public.ciclos set abierto_manual = false where activo;
select is((select abierto from public.estado_formulario()), false, 'manual cerrado: cerrado aunque sea domingo');
select is((select proxima_apertura from public.estado_formulario()), null, 'manual cerrado: sin próxima apertura');
update public.ciclos set abierto_manual = null where activo;

-- ---------------------------------------------
-- Fuera del ciclo
-- ---------------------------------------------
select set_config('app.ahora', '2026-02-20 12:00:00-05', true);
select is((select en_curso from public.estado_formulario()), false, 'antes del inicio: ciclo no en curso');
select is(
  (select proxima_apertura from public.estado_formulario()),
  '2026-02-28 19:00:00-05'::timestamptz,
  'antes del inicio: abre el sábado anterior al primer domingo'
);

select set_config('app.ahora', '2026-12-20 10:00:00-05', true);
select is((select abierto from public.estado_formulario()), false, 'después del fin: cerrado');
select is((select proxima_apertura from public.estado_formulario()), null, 'después del fin: no vuelve a abrir');

select * from finish();
rollback;
