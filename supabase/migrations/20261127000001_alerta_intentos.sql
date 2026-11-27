-- =============================================
-- v2.1.0: los códigos equivocados ya no bloquean a todos los alumnos
-- =============================================
-- Antes, 3.000 códigos equivocados en 15 minutos (sumando todas las IP) bloqueaban a todos
-- los alumnos: alguien podía provocarlo a propósito un domingo y nadie subía su foto.
--
-- Ahora:
-- - El límite por IP sigue igual (30 en 15 minutos): es el que frena adivinar códigos.
-- - El total solo bloquea a todos con 20.000 en 15 minutos, como freno de emergencia.
-- - El administrador ve una alerta en su Resumen cuando hay muchos intentos (alerta_intentos).
--
-- Con 887 millones de códigos posibles y unos 300 alumnos, adivinar uno cuesta millones de
-- intentos aunque se usen muchas IP; y con uno acertado solo se sube una foto que el guía revisa.

create or replace function public._limite_intentos_superado(p_ip text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (select count(*) from public.intentos_codigo i
      where i.ip = p_ip and i.creado_en > now() - interval '15 minutes') >= 30
    or
    (select count(*) from public.intentos_codigo i
      where i.creado_en > now() - interval '15 minutes') >= 20000;
$$;

revoke execute on function public._limite_intentos_superado(text) from public, anon, authenticated;

-- ---------------------------------------------
-- Alerta para el administrador
-- ---------------------------------------------
-- Cuántos códigos equivocados hubo en la última hora, desde cuántas IP, y si el freno de
-- emergencia está bloqueando a todos ahora mismo. No depende del ciclo: un ataque puede llegar
-- aunque no haya ciclo activo. Las IP no salen de la base.
create function public.alerta_intentos()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede ver la alerta.' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'ultima_hora', count(*),
      'ips', count(distinct i.ip),
      'bloqueo_global', count(*) filter (where i.creado_en > now() - interval '15 minutes') >= 20000
    )
    from public.intentos_codigo i
    where i.creado_en > now() - interval '1 hour'
  );
end;
$$;

revoke execute on function public.alerta_intentos() from public, anon;
grant execute on function public.alerta_intentos() to authenticated;
