-- =============================================
-- v1.15.0: entrar con Pastoral Digital ID
-- =============================================
-- El staff ahora puede entrar con Google o con su cuenta de Pastoral Digital ID (proveedor OIDC
-- configurado en Supabase como `custom:pastoral-digital-id`). La regla de fondo no cambia: solo se
-- crea la cuenta si el correo está registrado y activo en `staff`, y los permisos se siguen
-- decidiendo en cada consulta por ese correo (es_admin, es_staff_de…).
--
-- Si la persona ya entró antes con Google, Supabase vincula la nueva identidad a la misma cuenta
-- (mismo correo verificado) y este hook ni siquiera se llama.

create or replace function public.hook_antes_de_crear_usuario(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_proveedor text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', '');
begin
  if v_proveedor not in ('google', 'custom:pastoral-digital-id')
    and not (select a.permitir_login_correo from public.ajustes a where a.id = 1) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Solo se puede entrar con Google o con Pastoral Digital ID.'
      )
    );
  end if;

  if exists (
    select 1
    from public.staff s
    where lower(s.email) = lower(coalesce(event -> 'user' ->> 'email', ''))
      and s.activo
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Tu correo no está registrado como staff de la pastoral. Pide al administrador que lo agregue.'
    )
  );
end;
$$;
