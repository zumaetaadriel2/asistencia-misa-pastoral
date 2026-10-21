# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

PWA para registrar la asistencia semanal a misa de los alumnos de la pastoral de catequesis de un colegio (Confirmación y Primera Comunión). El alumno sube una foto como prueba y los guías/administradores la validan o rechazan desde un panel de revisión tipo "Tinder". Las fotos son de menores: nunca deben quedar públicas. Todo el dominio (rutas, componentes, tablas, variables, comentarios y textos de UI) está en español: mantener esa convención.

Stack: Next.js 16 (App Router) + React 19, TypeScript estricto, Tailwind CSS v4, Supabase (Postgres + Auth + Edge Functions + pg_cron) y Cloudflare R2 para las fotos.

## Comandos

```bash
npm run dev                          # servidor de desarrollo en http://localhost:3000
npm run build                        # build de producción (incluye chequeo de tipos)
npm run lint                         # ESLint 9 (flat config: next core-web-vitals + typescript)
npx eslint app/dashboard/page.tsx    # lint de un solo archivo
npx tsc --noEmit                     # solo chequeo de tipos
npm test                             # Vitest (archivos *.test.ts)
npx vitest run ruta/al/archivo.test.ts  # un solo test

# Supabase local (requiere Docker Desktop)
npm run db:start                     # levanta Postgres, Auth y API en http://127.0.0.1:54321
npm run db:reset                     # reaplica migraciones + supabase/seed.sql
npm run db:test                      # tests pgTAP de supabase/tests/
npx supabase test db supabase/tests/03_alumno_test.sql  # un solo archivo de tests
npm run db:types                     # regenera lib/supabase/database.types.ts
npm run functions:serve              # Edge Functions locales con supabase/functions/.env (claves R2 del token "asistencia-dev")
```

Variables de entorno de Next: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ver `.env.example`). Para desarrollo con Supabase local van en `.env.development.local`, que tiene prioridad sobre `.env.local` en `npm run dev`. `lib/supabase/client.ts` lanza un error al importarse si faltan, así que `npm run build` también las necesita. Los secretos de R2 nunca van en Next: viven en las Edge Functions (`supabase/functions/.env.example`).

Para probar en el navegador con datos del seed: códigos de alumno `TEST22`…`TEST29`, `TESTA2`…`TESTD2`. Fuera del horario (sáb 19:00 → lun 23:59) se puede abrir el formulario a mano con `update public.ciclos set abierto_manual = true where activo` y volverlo a `null` al terminar.

## Estado del rediseño

Plan aprobado en fases 0–7. Hechas: base nueva (0–1), fotos en R2 (2) y pantalla del alumno (3). **El panel del staff (`/login`, `/dashboard`, `components/dashboard/`) todavía consulta el esquema viejo** (`configuracion_ciclo`, `usuarios_staff`, `foto_url`, `obtenerTodasLasFilas` en `panel-admin.tsx`) y no funciona contra la base nueva hasta las fases 4 (revisión) y 5 (administración). Por eso `lib/supabase/client.ts` aún no usa el tipo `Database`: tiparlo rompería la compilación del panel viejo; hacerlo al terminar la fase 5.

## Arquitectura

### Base de datos (`supabase/migrations/`)

- El alumno (rol `anon`) no tiene acceso a ninguna tabla: solo a las RPC `estado_formulario` e `identificar_alumno`. Los envíos de foto pasan por `preparar_envio`/`confirmar_envio`, que solo puede ejecutar `service_role` (Edge Functions).
- El staff se identifica por el email del JWT (login con Google) contra `public.staff`; `es_admin()`, `es_staff_de()` y `es_staff_de_alumno()` alimentan las políticas RLS. Un guía puede tener comunidades de ambos programas (`staff_comunidades`). El hook `hook_antes_de_crear_usuario` impide crear cuentas a correos que no estén en `staff`. `asistencias` y `envios_foto` solo se modifican por RPC (`revisar_asistencia`, `justificar_falta`, `reasignar_asistencia`, `cerrar_semana`).
- Horario en hora de Lima: envío sáb 19:00 → lun 23:59, reenvío de rechazadas hasta mié 23:59, cierre automático (pg_cron) el jueves 00:05. La semana se calcula por el domingo de referencia (`domingo_de_referencia`): la misa del sábado cuenta para el domingo siguiente, y de jueves a sábado `estado_formulario().semana` ya es la semana que viene. El frontend no calcula horarios: solo formatea (`lib/utils/timeHelpers.ts`).
- `public.momento_actual()` permite simular la hora en tests con `set_config('app.ahora', ...)`.
- `asistencias.estado` ∈ `pendiente | validado | rechazado | inasistencia | justificada`, una fila por (`alumno_id`, `actividad`, `semana_numero`). Cada foto subida queda en `envios_foto` (las rechazadas no se borran) con su huella y fecha EXIF.
- Al cambiar el esquema: nueva migración en `supabase/migrations/`, `npm run db:reset`, `npm run db:test` y `npm run db:types`. El repo es público: el seed solo lleva datos ficticios.

### Fotos

- Cloudflare R2 privado, nunca público ni borrado. Edge Functions (Deno, `supabase/functions/`, fuera de ESLint y tsconfig) con `@supabase/server`: `subir-foto` (auth `publishable`; acciones `preparar` → URL PUT firmada 5 min, y `confirmar` → HEAD en R2 + RPC) y `ver-fotos` (auth `user`; RLS decide qué URLs GET firmadas devuelve). `@supabase/server` no acepta las claves legacy (anon JWT): el frontend usa la clave publishable. El CORS lo maneja `_shared/cors.ts` con `ORIGENES_PERMITIDOS`; en local el gateway de Supabase responde `*` igual, así que la restricción solo se nota en producción.
- En el navegador (`lib/fotos/`): `procesarFoto` lee la fecha EXIF antes de comprimir, calcula la huella dHash (`huella.ts`, bigint con signo de 64 bits como la columna `huella`) y comprime a **JPEG** de 720 px (Safari no genera WebP desde canvas). `enviarFoto` hace preparar → PUT → confirmar.

### Alumno (`/`, que redirige a `/alumno`)

`app/alumno/page.tsx` orquesta: sin código recordado muestra `IngresoCodigo` (pide el código personal y confirma "¿Eres Ana P.?" antes de recordarlo); con código muestra `PanelAlumno` (semana actual con `EnvioFoto` si `accion` es `enviar`/`reenviar`, o el estado/cuenta regresiva, más el historial). El código se recuerda en `localStorage` mediante `useCodigoGuardado` (`useSyncExternalStore`; `undefined` mientras hidrata, así no hay parpadeo ni error de hidratación). Los textos de error salen de `lib/alumno/mensajes.ts`.

### Staff (pendiente de reescribir en fases 4–5)

- `/login` → `/dashboard`; hoy con email/contraseña y `usuarios_staff` (esquema viejo).
- **Revisión**: `TarjetaRevision` muestra el pendiente más antiguo; swipe a la derecha valida (durante `TIEMPO_DESHACER_MS` se puede deshacer), a la izquierda abre `ModalRechazo` y luego llama a `notificarRechazo` (`lib/services/notificaciones.ts`, un mock). Se reutilizarán en la fase 4.
- **Panel admin** (`components/dashboard/panel-admin.tsx`): se reemplazará por secciones en la fase 5; su armado del CSV y `obtenerTodasLasFilas` (`lib/supabase/paginacion.ts`, Supabase corta en 1000 filas) se reutilizan.

### Convenciones de React

En los `useEffect` no llames funciones que hagan `setState` de forma síncrona (la regla `react-hooks/set-state-in-effect` lo marca como error): separa la consulta (devuelve datos) de la aplicación al estado y haz `consultar().then(aplicar)` dentro del efecto, como en `app/alumno/page.tsx`. En timers, el `setState` va dentro del callback (ver `formulario-cerrado.tsx`).

### PWA

`public/manifest.json` y un `public/sw.js` escrito a mano (network-first, ignora las peticiones a `supabase.co`), registrado por `components/service-worker-registrar.tsx` en el layout raíz; `next.config.ts` añade los headers de `/sw.js`. Si cambias lo que se cachea, sube `CACHE_NAME` en `sw.js`. Pendiente (fase 6): que no cachee fotos ni datos.

### Estilos

Tailwind v4 sin `tailwind.config`: los tokens (`primary-*`, `surface-*`) y las clases propias (`glass-card`, `animate-fade-in`, `animate-fade-in-scale`, `delay-100`…`delay-400` como `animation-delay`) están en `app/globals.css`. La UI es solo modo oscuro y está pensada para móvil.

Alias de imports: `@/*` apunta a la raíz del repo.
