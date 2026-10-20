-- =============================================
-- Esquema inicial: ciclos, comunidades, alumnos, staff y asistencias
-- =============================================

create type public.programa as enum ('confirmacion', 'primera_comunion');
create type public.actividad as enum ('misa', 'catequesis');
create type public.estado_asistencia as enum (
  'pendiente',
  'validado',
  'rechazado',
  'inasistencia',
  'justificada'
);
create type public.rol_staff as enum ('admin', 'guia');

-- ---------------------------------------------
-- Código personal del alumno: 6 caracteres sin 0/O/1/I/L para que no se confundan
-- ---------------------------------------------
create function public.generar_codigo_alumno()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  v_codigo text;
begin
  loop
    -- gen_random_uuid usa un generador criptográfico; tomamos 6 de sus bytes aleatorios
    bytes := uuid_send(gen_random_uuid());
    v_codigo := '';
    for i in 0..5 loop
      v_codigo := v_codigo || substr(alfabeto, (get_byte(bytes, i) % length(alfabeto)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.alumnos a where a.codigo = v_codigo);
  end loop;
  return v_codigo;
end;
$$;

-- ---------------------------------------------
-- Tablas
-- ---------------------------------------------

create table public.ciclos (
  id bigint generated always as identity primary key,
  nombre text not null,
  anio int not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  activo boolean not null default false,
  -- true/false fuerza el formulario abierto/cerrado; null = horario automático
  abierto_manual boolean,
  creado_en timestamptz not null default now(),
  constraint ciclos_fechas_validas check (fecha_fin > fecha_inicio)
);

-- Solo puede haber un ciclo activo
create unique index ciclos_un_solo_activo on public.ciclos (activo) where activo;

create table public.comunidades (
  id bigint generated always as identity primary key,
  ciclo_id bigint not null references public.ciclos on delete cascade,
  programa public.programa not null,
  nombre text not null,
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (ciclo_id, programa, nombre)
);

create table public.alumnos (
  id bigint generated always as identity primary key,
  comunidad_id bigint not null references public.comunidades on delete cascade,
  nombre_completo text not null,
  codigo text not null unique default public.generar_codigo_alumno(),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  constraint alumnos_codigo_formato check (codigo ~ '^[A-HJKMNP-Z2-9]{6}$')
);

create table public.staff (
  id bigint generated always as identity primary key,
  -- Gmail con el que entra a la app (login con Google)
  email text not null,
  nombre text not null,
  rol public.rol_staff not null default 'guia',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create unique index staff_email_unico on public.staff (lower(email));

-- Un guía puede llevar comunidades de Confirmación y de Primera Comunión
create table public.staff_comunidades (
  staff_id bigint not null references public.staff on delete cascade,
  comunidad_id bigint not null references public.comunidades on delete cascade,
  primary key (staff_id, comunidad_id)
);

create table public.asistencias (
  id bigint generated always as identity primary key,
  ciclo_id bigint not null references public.ciclos on delete cascade,
  alumno_id bigint not null references public.alumnos on delete cascade,
  actividad public.actividad not null default 'misa',
  semana_numero int not null check (semana_numero >= 1),
  estado public.estado_asistencia not null,
  envio_actual_id bigint,
  -- Motivo del rechazo o de la justificación
  motivo text,
  revisado_por bigint references public.staff on delete set null,
  revisado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (alumno_id, actividad, semana_numero)
);

-- Cada foto subida, incluidas las rechazadas: no se borran
create table public.envios_foto (
  id bigint generated always as identity primary key,
  ciclo_id bigint not null references public.ciclos on delete cascade,
  alumno_id bigint not null references public.alumnos on delete cascade,
  actividad public.actividad not null default 'misa',
  semana_numero int not null check (semana_numero >= 1),
  -- Ruta del objeto en el bucket privado de R2
  foto_key text not null unique,
  -- Huella perceptual (dHash de 64 bits) calculada en el navegador
  huella bigint,
  -- Fecha en que la cámara tomó la foto (EXIF), si la tenía
  fecha_exif timestamptz,
  tamano_bytes int,
  confirmado boolean not null default false,
  similar_a_envio_id bigint references public.envios_foto on delete set null,
  distancia_similar int,
  enviado_en timestamptz not null default now()
);

alter table public.asistencias
  add constraint asistencias_envio_actual_fk
  foreign key (envio_actual_id) references public.envios_foto on delete set null;

-- Intentos fallidos de código, para limitar a quien prueba códigos al azar
create table public.intentos_codigo (
  id bigint generated always as identity primary key,
  ip text not null,
  creado_en timestamptz not null default now()
);

-- Una sola fila que se actualiza a diario para que el proyecto gratuito no se pause
create table public.latido (
  id int primary key default 1 check (id = 1),
  ultima_vez timestamptz not null default now()
);

insert into public.latido default values;

-- ---------------------------------------------
-- Índices
-- ---------------------------------------------

create index comunidades_ciclo_idx on public.comunidades (ciclo_id);
create index alumnos_comunidad_idx on public.alumnos (comunidad_id);
create index staff_comunidades_comunidad_idx on public.staff_comunidades (comunidad_id);
create index asistencias_ciclo_semana_idx on public.asistencias (ciclo_id, semana_numero);
create index asistencias_pendientes_idx on public.asistencias (creado_en) where estado = 'pendiente';
create index envios_foto_alumno_idx on public.envios_foto (alumno_id, semana_numero);
create index envios_foto_ciclo_idx on public.envios_foto (ciclo_id) where confirmado;
create index intentos_codigo_ip_idx on public.intentos_codigo (ip, creado_en);
create index intentos_codigo_fecha_idx on public.intentos_codigo (creado_en);

-- ---------------------------------------------
-- actualizado_en automático
-- ---------------------------------------------

create function public.tocar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger asistencias_actualizado_en
  before update on public.asistencias
  for each row execute function public.tocar_actualizado_en();
