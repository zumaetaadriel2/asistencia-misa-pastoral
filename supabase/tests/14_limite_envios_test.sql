-- Tope de envíos de foto por alumno en 24 horas (preparar_envio).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Domingo 18 de octubre de 2026 (semana 34): el formulario está abierto
select set_config('app.ahora', '2026-10-18 10:00:00-05', true);

-- 20 envíos sin confirmar (como reintentos con mala señal)
select ok(
  (select bool_and((public.preparar_envio('TEST27', '198.51.100.20') ->> 'ok')::boolean) from generate_series(1, 20)),
  'deja preparar hasta 20 envíos en 24 horas'
);
select is(
  public.preparar_envio('TEST27', '198.51.100.20') ->> 'error', 'demasiados_envios',
  'el envío 21 se rechaza'
);
select is(
  (select count(*) from public.envios_foto e join public.alumnos a on a.id = e.alumno_id where a.codigo = 'TEST27'),
  20::bigint,
  'y no reserva otra subida'
);

-- Los envíos de hace más de un día no cuentan
update public.envios_foto e set enviado_en = now() - interval '25 hours'
from public.alumnos a where a.id = e.alumno_id and a.codigo = 'TEST27';
select is(
  (public.preparar_envio('TEST27', '198.51.100.20') ->> 'ok')::boolean, true,
  'al día siguiente puede volver a enviar'
);

select * from finish();
rollback;
