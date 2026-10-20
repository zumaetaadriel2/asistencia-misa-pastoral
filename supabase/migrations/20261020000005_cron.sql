-- =============================================
-- Tareas programadas (pg_cron, hora UTC; Lima = UTC-5 todo el año)
-- =============================================

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;

-- Jueves 00:05 en Lima: cerrar la semana cuyo reenvío venció el miércoles
select cron.schedule(
  'cerrar-semana-misa',
  '5 5 * * 4',
  $$select public._cerrar_semana_vencida()$$
);

-- Todos los días: borrar intentos de código de más de un día
select cron.schedule(
  'limpiar-intentos-codigo',
  '0 9 * * *',
  $$delete from public.intentos_codigo where creado_en < now() - interval '1 day'$$
);
