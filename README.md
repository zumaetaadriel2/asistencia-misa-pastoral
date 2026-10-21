# Asistencia Misa Pastoral

PWA para registrar la asistencia semanal a misa de los alumnos de catequesis (Confirmación y Primera Comunión) de una pastoral escolar. Cada alumno envía una foto desde su celular el fin de semana; los guías la validan o rechazan desde un panel de revisión, y los administradores gestionan ciclos, comunidades, staff y reportes.

Las fotos son de menores de edad: se guardan en un almacenamiento privado, solo se ven con enlaces temporales y cada guía ve únicamente las de sus comunidades.

## Cómo funciona

- **Alumnos** (`/alumno`): entran con un código personal de 6 caracteres (el celular lo recuerda), ven el estado de sus semanas y envían su foto del sábado 7:00 p. m. al lunes 11:59 p. m. Si se la rechazan, pueden reenviarla hasta el miércoles.
- **Guías** (`/dashboard`, con su cuenta de Google): revisan las fotos de sus comunidades deslizando a la derecha (validar) o a la izquierda (rechazar con motivo), con avisos de fotos parecidas o tomadas antes del fin de semana. En "Mi comunidad" ven la asistencia semana a semana, justifican faltas, dan códigos nuevos e imprimen los códigos.
- **Administradores**: además configuran el ciclo, las comunidades, el staff y los alumnos (pegando la lista desde Excel) y descargan reportes.
- Cada jueves a las 00:05 la semana anterior se cierra sola y quien no envió foto queda con falta.

## Arquitectura

| Pieza | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, desplegado en Vercel |
| Base de datos y login | Supabase: Postgres con RLS, funciones RPC, pg_cron y Auth con Google |
| Fotos | Cloudflare R2 privado, con URLs firmadas que generan dos Edge Functions de Supabase |
| Calidad | Vitest, tests pgTAP de la base y CI en GitHub Actions |
| Operación | GitHub Actions: latido diario (evita la pausa del plan gratuito) y respaldo semanal cifrado en R2 |

Toda la lógica sensible (horario, semanas, permisos, límite de intentos con códigos) vive en la base de datos (`supabase/migrations/`), cubierta por tests en `supabase/tests/`.

## Desarrollo local

Requisitos: Node 24 y Docker Desktop.

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Levanta Supabase local (migraciones + datos ficticios del seed):

   ```bash
   npm run db:start
   ```

3. Crea `.env.development.local` con la URL `http://127.0.0.1:54321`, la clave *publishable* que muestra el comando anterior y `NEXT_PUBLIC_LOGIN_CON_CORREO=true` (ver `.env.example`).

4. Para probar fotos, copia `supabase/functions/.env.example` a `supabase/functions/.env` con un token de R2 de desarrollo y levanta las funciones:

   ```bash
   npm run functions:serve
   ```

5. Inicia la app en http://localhost:3000:

   ```bash
   npm run dev
   ```

Datos de prueba: códigos `TEST22`…`TEST29` y `TESTA2`…`TESTD2`; staff `admin@ejemplo.com`, `guia.uno@ejemplo.com` y `guia.dos@ejemplo.com` con cualquier contraseña de 6 o más caracteres.

| Comando | Para qué sirve |
|---|---|
| `npm run lint` · `npx tsc --noEmit` · `npm test` | ESLint, tipos y tests de Vitest |
| `npm run db:test` | Tests pgTAP de la base |
| `npm run db:reset` | Reaplica migraciones y seed |
| `npm run db:types` | Regenera los tipos de TypeScript desde la base |
| `npm run build` | Build de producción |

## Flujo de trabajo

`main` (producción) ← `develop` (integración) ← `feature/<nombre>`. Cada cambio entra por Pull Request con la CI en verde y se une con *merge commit*.

## Despliegue

Todas las cuentas van a nombre de la pastoral salvo GitHub y Vercel.

1. **Supabase**: crear el proyecto (región São Paulo), vincularlo y aplicar las migraciones:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```

2. **Edge Functions**: crear `supabase/functions/.env.production` (ignorado por git) con el token de R2 `asistencia-produccion`, `R2_BUCKET=asistencia-fotos` y `ORIGENES_PERMITIDOS` con el dominio de producción, y luego:

   ```bash
   npx supabase secrets set --env-file supabase/functions/.env.production
   npx supabase functions deploy subir-foto
   npx supabase functions deploy ver-fotos
   ```

3. **Auth** (panel de Supabase): proveedor Google con el cliente OAuth de Google Cloud, correo y contraseña desactivado, hook *Before User Created* → `public.hook_antes_de_crear_usuario`, y la URL de producción en *Site URL* y *Redirect URLs* (`…/login`).
4. **Primer administrador** (SQL Editor): `insert into public.staff (email, nombre, rol) values ('correo@gmail.com', 'Nombre', 'admin');`. El resto del staff se agrega desde la app.
5. **R2**: política CORS del bucket `asistencia-fotos` que permita `PUT` desde el dominio de producción.
6. **Vercel**: importar el repositorio (rama de producción `main`) con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, y agregar el subdominio (registros TXT y CNAME en el DNS del dominio).
7. **Secretos de GitHub Actions**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_URL` (cadena del *Session pooler*), `R2_ACCOUNT_ID`, `R2_RESPALDOS_ACCESS_KEY_ID`, `R2_RESPALDOS_SECRET_ACCESS_KEY` y `RESPALDO_CLAVE`.

### Restaurar un respaldo

Descarga el archivo de `asistencia-respaldos`, descífralo con la clave guardada por la pastoral y cárgalo en un proyecto vacío:

```bash
gpg --decrypt AAAA-MM-DD.tar.gz.gpg > respaldo.tar.gz
tar xzf respaldo.tar.gz
psql "<cadena-de-conexión>" -f esquema.sql
psql "<cadena-de-conexión>" -f datos.sql
```
