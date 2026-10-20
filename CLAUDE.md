# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

PWA para registrar la asistencia semanal a misa de los alumnos de una pastoral. El alumno sube una foto como prueba y los guías/administradores la validan o rechazan desde un panel de revisión tipo "Tinder". Todo el dominio (rutas, componentes, tablas, variables, comentarios y textos de UI) está en español: mantener esa convención.

Stack: Next.js 16 (App Router) + React 19, TypeScript estricto, Tailwind CSS v4, Supabase (Postgres + Auth) y Cloudinary para las fotos.

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
```

Variables de entorno: copiar `.env.example` a `.env.local` (URL y anon key de Supabase; cloud name y upload preset *unsigned* de Cloudinary). `lib/supabase/client.ts` lanza un error al importarse si faltan las de Supabase.

## Rediseño en curso

Se está rehaciendo la base desde cero según el plan aprobado (fases 0–7). La nueva base ya existe en `supabase/` (migraciones, RLS, RPC, pg_cron, seed ficticio y tests pgTAP), pero **el frontend todavía usa el esquema viejo** descrito más abajo (`configuracion_ciclo`, `usuarios_staff`, Cloudinary) hasta las fases 3–5.

Claves de la base nueva (`supabase/migrations/`):
- El alumno (rol `anon`) no tiene acceso a ninguna tabla: solo a las RPC `estado_formulario` e `identificar_alumno`. Los envíos de foto pasan por `preparar_envio`/`confirmar_envio`, que solo puede ejecutar `service_role` (Edge Functions).
- El staff se identifica por el email del JWT (login con Google) contra `public.staff`; `es_admin()`, `es_staff_de()` y `es_staff_de_alumno()` alimentan las políticas RLS. El hook `hook_antes_de_crear_usuario` impide crear cuentas a correos que no estén en `staff`.
- Horario en hora de Lima: envío sáb 19:00 → lun 23:59, reenvío de rechazadas hasta mié 23:59, cierre automático (pg_cron) el jueves 00:05. La semana se calcula por el domingo de referencia (`domingo_de_referencia`): la misa del sábado cuenta para el domingo siguiente.
- `public.momento_actual()` permite simular la hora en tests con `set_config('app.ahora', ...)`.
- Al cambiar el esquema: nueva migración en `supabase/migrations/`, `npm run db:reset`, `npm run db:test` y `npm run db:types`. El repo es público: el seed solo lleva datos ficticios.

## Arquitectura

### Todo ocurre en el cliente

Todas las páginas con datos son Client Components (`"use client"`) que consultan Supabase directamente desde el navegador con el singleton `supabase` de `lib/supabase/client.ts` (anon key). No hay Route Handlers, Server Actions ni middleware/proxy; `lib/supabase/server.ts` existe pero aún no se usa. Consecuencia: **la seguridad depende por completo de las políticas RLS de Supabase**. La protección de `/dashboard`, la separación de roles y la validación del PIN de comunidad son solo comprobaciones en el cliente.

El esquema de la base de datos no está versionado en el repo; se infiere de las consultas:

| Tabla | Columnas relevantes |
|---|---|
| `configuracion_ciclo` | `nombre_ciclo`, `fecha_inicio`, `activo`, `abierto_manual` (true / false / null) |
| `comunidades` | `nombre`, `pin` (4 dígitos), `activa` |
| `alumnos` | `nombre_completo`, `comunidad_id`, `activo` |
| `asistencias` | `alumno_id`, `semana_numero`, `estado`, `foto_url`, `foto_public_id`, `fecha_subida`, `motivo_rechazo`, `revisado_por` |
| `usuarios_staff` | `id` (= id del usuario en Supabase Auth), `nombre`, `rol` (`admin` \| `guia`), `comunidad_id` |

`asistencias.estado` ∈ `pendiente | validado | rechazado | inasistencia`. Se asume una sola fila por (`alumno_id`, `semana_numero`): el reenvío tras un rechazo **actualiza** la fila existente en vez de insertar otra.

Supabase devuelve como máximo 1000 filas por consulta y corta el resto sin avisar. Para listas que pueden crecer (reportes, cierre de semana) usa `obtenerTodasLasFilas` de `lib/supabase/paginacion.ts` con un `.order()` estable.

En los `useEffect` no llames funciones que hagan `setState` de forma síncrona (la regla `react-hooks/set-state-in-effect` lo marca como error): separa la consulta (devuelve datos) de la aplicación al estado y haz `consultar().then(aplicar)` dentro del efecto, como en `app/dashboard/page.tsx` y `panel-admin.tsx`.

### Semanas y ventana de registro

- El ciclo activo es la fila más reciente de `configuracion_ciclo` con `activo = true`.
- `semana_numero` es 1-indexado, contado desde `fecha_inicio` del ciclo, con semanas que empiezan en domingo (`calcularSemana`). El dashboard (`actualizarCiclo` en `app/dashboard/page.tsx`) reimplementa este cálculo en línea: si cambias uno, cambia el otro.
- El formulario está abierto del sábado 19:00 al lunes 23:59, en la hora local del dispositivo (`estaAbierto`). `abierto_manual` lo fuerza abierto o cerrado desde el panel admin; en ese caso `EstadoFormulario.proximoCambio` es `null` (no hay cuenta regresiva).

### Flujos

- **Alumno** (`/` redirige a `/alumno`): `components/alumno/formulario-asistencia.tsx` es un wizard comunidad → PIN → alumno → foto. La foto se comprime en el navegador a WebP de 800 px de ancho (`lib/cloudinary.ts`) y se sube directo a Cloudinary con el preset unsigned; después se guardan `foto_url`/`foto_public_id` en `asistencias` con estado `pendiente`.
- **Staff** (`/login` → `/dashboard`): login con email/contraseña de Supabase Auth; el rol se lee de `usuarios_staff`. Un `guia` solo ve los pendientes de su comunidad; un `admin` puede filtrar por comunidad y tiene además la pestaña "Administración y Reportes".
- **Revisión**: `TarjetaRevision` muestra el pendiente más antiguo; swipe a la derecha valida (durante `TIEMPO_DESHACER_MS` se puede deshacer y la asistencia vuelve a `pendiente`), a la izquierda abre `ModalRechazo` para pedir el motivo y luego llama a `notificarRechazo` (`lib/services/notificaciones.ts`, hoy un mock que solo hace `console.log`).
- **Panel admin** (`components/dashboard/panel-admin.tsx`): configurar el ciclo, crear comunidades y alumnos, "cerrar semana" (inserta en lote filas `inasistencia` para los alumnos activos sin registro en esa semana) y exportar un CSV de asistencias por alumno y semana.

### PWA

`public/manifest.json` y un `public/sw.js` escrito a mano (network-first, ignora las peticiones a `supabase.co`), registrado por `components/service-worker-registrar.tsx` en el layout raíz; `next.config.ts` añade los headers de `/sw.js`. Si cambias lo que se cachea, sube `CACHE_NAME` en `sw.js`.

### Estilos

Tailwind v4 sin `tailwind.config`: los tokens (`primary-*`, `surface-*`) y las clases propias (`glass-card`, `animate-fade-in`, `animate-fade-in-scale`, `delay-100`…`delay-400` como `animation-delay`) están en `app/globals.css`. La UI es solo modo oscuro y está pensada para móvil.

Alias de imports: `@/*` apunta a la raíz del repo.
