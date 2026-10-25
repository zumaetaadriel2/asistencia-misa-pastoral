-- =============================================
-- Límite de intentos con códigos equivocados más holgado
-- =============================================
-- Antes: 10 fallos por IP o 300 en total cada 15 minutos. Con 10 por IP, un salón que
-- escribe sus códigos a la vez en el WiFi del colegio (todos salen con la misma IP)
-- quedaba bloqueado con unos pocos errores de tipeo, incluso quien ya tenía bien su
-- código. Con 300 en total, un script sencillo podía bloquear a todos los alumnos.
--
-- Con 30 por IP, adivinar un código sigue siendo inviable (hay 887 millones de
-- combinaciones para unos 250 códigos); el total queda como freno ante un ataque masivo.

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
      where i.creado_en > now() - interval '15 minutes') >= 3000;
$$;

revoke execute on function public._limite_intentos_superado(text) from public, anon, authenticated;

-- El conteo total no tenía índice: durante un ataque la tabla crece y cada intento la recorría
create index intentos_codigo_creado_idx on public.intentos_codigo (creado_en);
