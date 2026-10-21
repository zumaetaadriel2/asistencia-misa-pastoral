-- =============================================
-- Row Level Security
-- =============================================
-- anon (alumnos sin login): sin acceso a ninguna tabla; solo funciones RPC.
-- authenticated (staff con Google): el guía ve lo de sus comunidades, el admin todo.
-- asistencias y envios_foto solo se modifican mediante funciones RPC.

alter table public.ciclos enable row level security;
alter table public.comunidades enable row level security;
alter table public.alumnos enable row level security;
alter table public.staff enable row level security;
alter table public.staff_comunidades enable row level security;
alter table public.asistencias enable row level security;
alter table public.envios_foto enable row level security;
alter table public.intentos_codigo enable row level security;
alter table public.latido enable row level security;

revoke all on all tables in schema public from anon;
revoke insert, update, delete on public.asistencias, public.envios_foto from authenticated;
revoke all on public.intentos_codigo, public.latido from authenticated;

-- ---------------------------------------------
-- ciclos
-- ---------------------------------------------
create policy "staff ve los ciclos"
  on public.ciclos for select to authenticated
  using (public.es_staff());

create policy "admin gestiona los ciclos"
  on public.ciclos for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------
-- comunidades
-- ---------------------------------------------
create policy "staff ve sus comunidades"
  on public.comunidades for select to authenticated
  using (public.es_staff_de(id));

create policy "admin gestiona las comunidades"
  on public.comunidades for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------
-- alumnos
-- ---------------------------------------------
create policy "staff ve los alumnos de sus comunidades"
  on public.alumnos for select to authenticated
  using (public.es_staff_de(comunidad_id));

create policy "admin gestiona los alumnos"
  on public.alumnos for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------
-- staff y staff_comunidades
-- ---------------------------------------------
create policy "staff ve su propia ficha"
  on public.staff for select to authenticated
  using (id = public.staff_actual_id());

create policy "admin gestiona el staff"
  on public.staff for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "staff ve sus asignaciones"
  on public.staff_comunidades for select to authenticated
  using (staff_id = public.staff_actual_id());

create policy "admin gestiona las asignaciones"
  on public.staff_comunidades for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- ---------------------------------------------
-- asistencias y envios_foto (solo lectura; se escriben por RPC)
-- ---------------------------------------------
create policy "staff ve las asistencias de sus comunidades"
  on public.asistencias for select to authenticated
  using (public.es_staff_de_alumno(alumno_id));

create policy "staff ve los envíos de sus comunidades"
  on public.envios_foto for select to authenticated
  using (public.es_staff_de_alumno(alumno_id));
