-- =============================================
-- Datos ficticios para desarrollo local (`npx supabase db reset`)
-- Nunca poner aquí nombres ni correos reales: el repositorio es público.
-- =============================================

-- Solo en local: el staff de prueba entra con correo y contraseña (en producción, solo Google)
update public.ajustes set permitir_login_correo = true where id = 1;

insert into public.ciclos (nombre, anio, fecha_inicio, fecha_fin, activo)
values ('Ciclo 2026', 2026, '2026-03-01', '2026-12-13', true);

insert into public.comunidades (ciclo_id, programa, nombre)
select c.id, v.programa::public.programa, v.nombre
from public.ciclos c
cross join (values
  ('confirmacion', 'San Pablo'),
  ('confirmacion', 'Santa Rosa'),
  ('primera_comunion', 'San José'),
  ('primera_comunion', 'Santa María')
) as v(programa, nombre)
where c.anio = 2026;

-- Códigos fijos para poder probar desde el navegador
insert into public.alumnos (comunidad_id, nombre_completo, codigo)
select co.id, v.nombre, v.codigo
from (values
  ('San Pablo', 'Ana Prueba Uno', 'TEST22'),
  ('San Pablo', 'Bruno Prueba Dos', 'TEST23'),
  ('San Pablo', 'Carla Prueba Tres', 'TEST24'),
  ('Santa Rosa', 'Diego Prueba Cuatro', 'TEST25'),
  ('Santa Rosa', 'Elena Prueba Cinco', 'TEST26'),
  ('Santa Rosa', 'Fabio Prueba Seis', 'TEST27'),
  ('San José', 'Gabi Prueba Siete', 'TEST28'),
  ('San José', 'Hugo Prueba Ocho', 'TEST29'),
  ('San José', 'Ines Prueba Nueve', 'TESTA2'),
  ('Santa María', 'Juan Prueba Diez', 'TESTB2'),
  ('Santa María', 'Karen Prueba Once', 'TESTC2'),
  ('Santa María', 'Mario Prueba Doce', 'TESTD2')
) as v(comunidad, nombre, codigo)
join public.comunidades co on co.nombre = v.comunidad;

insert into public.staff (email, nombre, rol)
values
  ('admin@ejemplo.com', 'Admin de Prueba', 'admin'),
  ('guia.uno@ejemplo.com', 'Guía Uno', 'guia'),
  ('guia.dos@ejemplo.com', 'Guía Dos', 'guia');

-- Guía Uno: San Pablo (Confirmación) y San José (Comunión); Guía Dos: las otras dos
insert into public.staff_comunidades (staff_id, comunidad_id)
select s.id, c.id
from (values
  ('guia.uno@ejemplo.com', 'San Pablo'),
  ('guia.uno@ejemplo.com', 'San José'),
  ('guia.dos@ejemplo.com', 'Santa Rosa'),
  ('guia.dos@ejemplo.com', 'Santa María')
) as v(email, comunidad)
join public.staff s on s.email = v.email
join public.comunidades c on c.nombre = v.comunidad;

-- Catequesis: la función va por comunidad. Catequista Uno solo pasa lista en San Pablo;
-- "Guía y Catequista" es guía en Santa Rosa (Confirmación) y catequista en San José (Comunión)
insert into public.staff (email, nombre, rol)
values
  ('catequista.uno@ejemplo.com', 'Catequista Uno', 'guia'),
  ('mixto@ejemplo.com', 'Guía y Catequista', 'guia');

insert into public.staff_comunidades (staff_id, comunidad_id, funcion)
select s.id, c.id, v.funcion::public.funcion_comunidad
from (values
  ('catequista.uno@ejemplo.com', 'San Pablo', 'catequista'),
  ('mixto@ejemplo.com', 'Santa Rosa', 'guia'),
  ('mixto@ejemplo.com', 'San José', 'catequista')
) as v(email, comunidad, funcion)
join public.staff s on s.email = v.email
join public.comunidades c on c.nombre = v.comunidad;

-- San Pablo: la clase del sábado 17 de octubre y un retiro el domingo 18
insert into public.sesiones_catequesis (comunidad_id, fecha, titulo, creada_por)
select c.id, v.fecha::date, v.titulo, s.id
from (values ('2026-10-17', 'Catequesis'), ('2026-10-18', 'Retiro')) as v(fecha, titulo)
join public.comunidades c on c.nombre = 'San Pablo'
join public.staff s on s.email = 'catequista.uno@ejemplo.com';

insert into public.asistencias_catequesis (sesion_id, alumno_id, estado, motivo, marcado_por)
select se.id, a.id, v.estado::public.estado_catequesis, v.motivo, s.id
from (values
  ('Catequesis', 'TEST22', 'presente', null),
  ('Catequesis', 'TEST23', 'tardanza', null),
  ('Catequesis', 'TEST24', 'justificada', 'Estuvo enfermo, avisó su familia.'),
  ('Retiro', 'TEST22', 'presente', null),
  ('Retiro', 'TEST23', 'falta', null)
) as v(titulo, codigo, estado, motivo)
join public.sesiones_catequesis se on se.titulo = v.titulo
join public.alumnos a on a.codigo = v.codigo
join public.staff s on s.email = 'catequista.uno@ejemplo.com';

-- Algunas fotos pendientes para ver la cola de revisión (las fotos no existen en R2)
with nuevos as (
  insert into public.envios_foto (ciclo_id, alumno_id, semana_numero, foto_key, huella, confirmado)
  select a_c.ciclo_id, a.id, 33, format('seed/%s-semana-33.jpg', a.codigo), v.huella, true
  from (values
    ('TEST22', 1234567890123::bigint),
    ('TEST25', 987654321098::bigint),
    ('TEST28', 555555555555::bigint)
  ) as v(codigo, huella)
  join public.alumnos a on a.codigo = v.codigo
  join public.comunidades a_c on a_c.id = a.comunidad_id
  returning id, ciclo_id, alumno_id, semana_numero
)
insert into public.asistencias (ciclo_id, alumno_id, semana_numero, estado, envio_actual_id)
select ciclo_id, alumno_id, semana_numero, 'pendiente', id
from nuevos;
