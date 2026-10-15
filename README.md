# Asistencia Misa Pastoral

PWA para registrar la asistencia semanal a misa de los alumnos de catequesis (Confirmación y Primera Comunión). Cada alumno sube una foto como prueba durante el fin de semana y los guías y administradores la validan o rechazan desde un panel de revisión.

## Cómo funciona

- **Alumnos** (`/alumno`): eligen su comunidad, ingresan el PIN de 4 dígitos, eligen su nombre y suben la foto. El formulario abre el sábado a las 19:00 y cierra el lunes a las 23:59. El administrador puede abrirlo o cerrarlo manualmente.
- **Guías** (`/login` → `/dashboard`): revisan las fotos pendientes de su comunidad. Deslizar a la derecha valida y a la izquierda rechaza indicando el motivo.
- **Administradores**: además de revisar, configuran el ciclo, crean comunidades y alumnos, cierran la semana (marcando inasistencias) y descargan el reporte en CSV.

## Tecnologías

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase (base de datos y login) · Cloudinary (fotos)

## Puesta en marcha

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y completa los datos de Supabase y Cloudinary.

3. Inicia el servidor de desarrollo y abre http://localhost:3000:

   ```bash
   npm run dev
   ```

## Comandos

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | Revisa el código con ESLint |
