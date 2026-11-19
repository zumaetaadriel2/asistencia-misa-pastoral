-- =============================================
-- v2.0.0: solo Pastoral Digital ID y alta controlada del staff
-- =============================================
-- 1. Ya no se entra con Google: el único proveedor es Pastoral Digital ID
--    (`custom:pastoral-digital-id`). El correo y contraseña sigue solo para el seed local.
-- 2. No hay autoaprovisionamiento: el administrador da de alta a cada persona antes de que entre,
--    eligiéndola de la lista de catequistas de Pastoral Digital (API interna). El alta la hace la
--    Edge Function `catequistas-pastoral`, que comprueba que la persona esté en esa lista, con
--    `dar_de_alta_staff` (solo service_role). El administrador ya no puede insertar staff ni
--    cambiar su correo directamente: solo su rol, si está activo y sus comunidades.
--
-- No se borra nada: las cuentas que se crearon con Google las limpia el administrador a mano.

-- ---------------------------------------------
-- Vínculo con Pastoral Digital
-- ---------------------------------------------

-- ID del usuario en Pastoral Digital (el `userId` de su API). Null en el staff de antes.
alter table public.staff add column pastoral_id text;
create unique index staff_pastoral_id_unico on public.staff (pastoral_id) where pastoral_id is not null;

comment on column public.staff.email is 'Correo de su cuenta de Pastoral Digital ID: con él entra a la app';

-- ---------------------------------------------
-- Permisos sobre staff: el alta solo por la Edge Function
-- ---------------------------------------------

drop policy "admin gestiona el staff" on public.staff;

create policy "admin ve el staff"
  on public.staff for select to authenticated
  using (public.es_admin());

create policy "admin actualiza el staff"
  on public.staff for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Sin insertar ni borrar, y al actualizar solo el rol y si está activo
revoke insert, update, delete on public.staff from authenticated;
grant update (rol, activo) on public.staff to authenticated;

-- ---------------------------------------------
-- Alta desde Pastoral Digital
-- ---------------------------------------------

-- La llama `catequistas-pastoral` después de comprobar que quien la pide es administrador y que la
-- persona está en la lista de catequistas válidos. Si su correo ya estaba en staff sin vínculo
-- (staff de antes), lo vincula en vez de crear otro, sin cambiarle el rol.
create function public.dar_de_alta_staff(
  p_pastoral_id text,
  p_email text,
  p_nombre text,
  p_rol public.rol_staff
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_existente public.staff;
  v_id bigint;
begin
  if coalesce(trim(p_pastoral_id), '') = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or v_nombre = '' then
    return jsonb_build_object('ok', false, 'error', 'datos_invalidos');
  end if;

  if exists (select 1 from public.staff s where s.pastoral_id = p_pastoral_id) then
    return jsonb_build_object('ok', false, 'error', 'ya_registrado');
  end if;

  select * into v_existente from public.staff s where lower(s.email) = v_email;
  if found then
    if v_existente.pastoral_id is not null then
      return jsonb_build_object('ok', false, 'error', 'ya_registrado');
    end if;
    update public.staff
    set pastoral_id = p_pastoral_id, nombre = v_nombre
    where id = v_existente.id;
    return jsonb_build_object('ok', true, 'staff_id', v_existente.id, 'vinculado', true);
  end if;

  insert into public.staff (email, nombre, rol, pastoral_id)
  values (v_email, v_nombre, coalesce(p_rol, 'guia'), p_pastoral_id)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'staff_id', v_id, 'vinculado', false);
end;
$$;

revoke execute on function public.dar_de_alta_staff(text, text, text, public.rol_staff) from public, anon, authenticated;
grant execute on function public.dar_de_alta_staff(text, text, text, public.rol_staff) to service_role;

-- ---------------------------------------------
-- Login: solo Pastoral Digital ID
-- ---------------------------------------------

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
  if v_proveedor <> 'custom:pastoral-digital-id'
    and not (select a.permitir_login_correo from public.ajustes a where a.id = 1) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Solo se puede entrar con Pastoral Digital ID.'
      )
    );
  end if;

  -- Sin autoaprovisionamiento: el administrador tiene que haberla dado de alta antes
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
      'message', 'Todavía no tienes acceso. Pide al administrador de la pastoral que te dé de alta.'
    )
  );
end;
$$;
