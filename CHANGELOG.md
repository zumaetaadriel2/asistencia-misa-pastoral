# Changelog

Todos los cambios importantes de Mi Misa PS (Asistencia Misa Pastoral) se anotan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto usa
[versionado semántico](https://semver.org/lang/es/).

## [1.13.0] - 2026-11-11

### Añadido

- Subida de la foto a prueba de mala señal:
  - cada paso se vuelve a intentar solo y lo ya hecho no se repite;
  - sin señal, la app espera y la envía sola cuando vuelve la conexión;
  - la foto queda guardada en el celular hasta enviarla. Si se cierra la app, al abrirla se ofrece «Tienes una foto sin enviar».

### Cambiado

- La ayuda y la política de privacidad explican que la foto sin enviar queda guardada en el celular y cuándo se borra.

### Corregido

- Si la confirmación de la foto llegaba pero se perdía la respuesta, al reintentar ya no sale «ya tienes registro»: cuenta como enviada.

## [1.12.0] - 2026-11-11

### Añadido

- Aviso push al alumno cuando rechazan su foto, para que mande otra a tiempo. Llega unos minutos después del rechazo (pasado el tiempo de «Deshacer»), solo si todavía puede reenviarla (hasta el miércoles a las 11:59 p. m.) y si activó los avisos. Dice que entre a ver el motivo, sin el motivo.

### Cambiado

- «Recordatorios», la ayuda y la política de privacidad mencionan el aviso de foto rechazada.

## [1.11.0] - 2026-11-09

### Cambiado

- La pantalla del alumno cabe en un solo vistazo: la semana y la foto van arriba, y «Tus semanas», «Tu catequesis» y «Recordatorios» quedan como filas de una línea que se abren con un toque.
- «Tu progreso» pasa a una línea junto al saludo. El detalle está dentro de «Tus semanas».
- Los consejos para la foto se reducen a una línea, «Que se vea tu rostro dentro de la iglesia», y el resto va en «Ver más».
- «Tus semanas» muestra las 6 más recientes, con «Ver todas».
- «Empieza tu racha este domingo» pasa a «Empieza tu racha esta semana».

### Corregido

- En iPhone con la app instalada, el contenido ya no pasa por debajo de la hora al hacer scroll.

## [1.10.0] - 2026-11-09

### Añadido

- Avisos push para el alumno, que él mismo activa en «Recordatorios»: el sábado a las 7 p. m., cuando abre el envío, y el domingo a las 8 a. m. y el lunes a las 6 p. m. solo si todavía no envió su foto. En iPhone funcionan con la app instalada.
- Aviso push para el guía, que se activa con la campana del encabezado: el lunes a las 8 p. m., si tiene fotos por revisar.
- Función `enviar-avisos`, que manda los avisos a las horas programadas.

### Cambiado

- La política de privacidad explica qué se guarda al activar los avisos y qué recuerda el celular.

### Seguridad

- Solo se aceptan direcciones de los servicios de avisos reales (Google, Apple, Mozilla y Microsoft).
- Al cambiar de alumno o cerrar sesión, se quitan los avisos de ese celular.

## [1.9.0] - 2026-11-08

### Añadido

- Consejos para la foto antes de subirla. Que se vea el rostro del alumno dentro de la iglesia y que sea de esa misa. Aparecen abiertos hasta la primera foto y después quedan plegados.
- «Tu progreso» en la pantalla del alumno: domingos seguidos y porcentaje del ciclo, con las mismas reglas que ve su guía.
- «Agregar al calendario»: un recordatorio cada sábado a las 7 p. m. (`/recordatorio-misa.ics`).
- Página de ayuda (`/ayuda`) con una guía rápida para alumnos y otra para guías. Se puede imprimir o guardar como PDF, una hoja cada una.
- Enlace «Ayuda» en los pies de página y en el encabezado del staff.

### Corregido

- La fecha de cierre ya no termina con doble punto («p. m..»).

### Cambiado

- «Tus semanas» ya no muestra su propio conteo: ahora lo da «Tu progreso», con el mismo cálculo que ve el guía.

## [1.8.0] - 2026-11-03

### Añadido

- Pestaña **Resumen** en Administración, la primera, con cómo va la pastoral de un vistazo:
  - asistencia a misa de la última semana cerrada y comparación con la anterior;
  - cuántos ya enviaron foto en la semana en curso;
  - fotos por revisar y desde cuándo esperan;
  - catequesis del ciclo;
  - tabla por comunidad, con enlace a su asistencia;
  - alumnos con 3 o más faltas seguidas, comunidades sin guía e iglesias sin horario;
  - tendencia de asistencia semana a semana.
- Consulta `resumen_admin` en la base, solo para administradores.
- "Ver asistencia" abre directamente la comunidad elegida (`/dashboard/comunidad?comunidad=ID`).
- Este `CHANGELOG.md`.

### Cambiado

- El administrador entra al Resumen al iniciar sesión. Los guías siguen entrando a Revisión y los catequistas a Catequesis.
- Las pestañas de Administración quedan en este orden: Resumen y Reportes primero, y lo de inicio de año (Ciclo, Comunidades, Staff, Alumnos y Misas) después.
- Con el formulario forzado en «Cerrado», el cierre automático de los jueves ya no marca faltas.

## [1.7.1] - 2026-10-28

### Seguridad

- Next.js y `eslint-config-next` actualizados de 16.2.10 a 16.4.3, que corrige avisos críticos de seguridad de Next.

## [1.7.0] - 2026-10-28

### Añadido

- Plantilla de iglesias en Excel (.xlsx), con:
  - columnas Sábado y Domingo;
  - lista desplegable de distritos;
  - hoja «Cómo llenar».
- Botón «Subir Excel» para importar iglesias. Pegar filas sigue funcionando.

### Cambiado

- Todos los reportes («Descargar Excel») salen como .xlsx de verdad, en vez de CSV.

## [1.6.0] - 2026-10-27

### Añadido

- Página pública de política de privacidad (`/privacidad`).
- Página «Cómo instalar» (`/instalar`), con los pasos de Android y iPhone y el botón de instalar.
- Las tarjetas impresas de códigos explican cómo instalar la app.

## [1.5.0] - 2026-10-27

### Cambiado

- La app instalada se llama «Mi Misa PS» y tiene un ícono propio, para no confundirla con Pastoral Digital.
- Accesos más ordenados a «Misas cerca»: un botón en la pantalla del código y un enlace dentro de la semana.

### Corregido

- El alumno puede volver a poner su código si entró por error al login del staff.
- El código del alumno funciona aunque en ese celular haya un guía o admin con sesión iniciada.

## [1.4.0] - 2026-10-27

### Añadido

- Página pública «Misas cerca de mí» (`/misas`): iglesias de la provincia de Trujillo con sus misas del fin de semana, ordenadas por distancia o filtradas por distrito.
- Pestaña Misas en Administración para cargar iglesias desde Excel y editarlas.

## [1.3.1] - 2026-10-25

### Corregido

- Límite de códigos equivocados más flexible para salones que comparten el WiFi del colegio: 30 por conexión y 3.000 en total.

## [1.3.0] - 2026-10-24

### Añadido

- Botón oficial de «Iniciar sesión con Google»: la ventana muestra el nombre de la app y no el dominio de Supabase.

## [1.2.0] - 2026-10-23

### Añadido

- Asistencia a catequesis:
  - sesiones con fecha;
  - pantalla para pasar lista;
  - resumen por comunidad;
  - reporte del ciclo.
- Función por comunidad: una persona puede ser guía en una comunidad y catequista en otra.
- El alumno ve su asistencia a catequesis.

## [1.1.1] - 2026-10-21

### Añadido

- El staff puede llegar al panel desde la app instalada.

## [1.1.0] - 2026-10-21

### Añadido

- Identidad visual de la Pastoral Mariana con tema claro y oscuro automático.
- Revisión:
  - visor de fotos;
  - atajos de teclado;
  - diseño para PC;
  - menú inferior en el celular.
- Búsqueda por nombre en asistencia, alumnos y staff.

### Cambiado

- Pantallas del alumno más claras, con los pasos para subir la foto y las fechas de cada semana.

## [1.0.0] - 2026-10-21

### Añadido

- Primera versión publicada:
  - el alumno entra con su código personal y sube la foto de la misa;
  - las fotos se guardan en Cloudflare R2, privadas;
  - revisión del staff tipo «Tinder», con avisos de fotos parecidas;
  - matriz de asistencia por comunidad, con justificaciones y códigos imprimibles;
  - Administración: ciclo, comunidades, staff, alumnos y reportes;
  - cierre automático de semanas y respaldo semanal cifrado.

[1.13.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.7.1...v1.8.0
[1.7.1]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/zumaetaadriel2/asistencia-misa-pastoral/releases/tag/v1.0.0
