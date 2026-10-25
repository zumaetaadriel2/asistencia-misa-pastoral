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

Si cambias dependencias en Windows, comprueba que el lockfile sirva en Linux antes de subir (npm en Windows a veces omite dependencias opcionales de Linux y la CI falla en `npm ci` con "Missing: … from lock file"):

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$PWD":/app -w /app node:24 npm ci --ignore-scripts --dry-run
```

Si falla, regenera el lockfile dentro del contenedor con `npm install --package-lock-only --ignore-scripts` (en una copia de `package.json` y `package-lock.json`) y súbelo.

Variables de entorno de Next: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (ver `.env.example`). Para desarrollo con Supabase local van en `.env.development.local`, que tiene prioridad sobre `.env.local` en `npm run dev`. `lib/supabase/client.ts` lanza un error al importarse si faltan, así que `npm run build` también las necesita. Los secretos de R2 nunca van en Next: viven en las Edge Functions (`supabase/functions/.env.example`).

Para probar en el navegador con datos del seed: códigos de alumno `TEST22`…`TEST29`, `TESTA2`…`TESTD2`; staff `admin@ejemplo.com`, `guia.uno@ejemplo.com` (San Pablo y San José) y `guia.dos@ejemplo.com` (Santa Rosa y Santa María), `catequista.uno@ejemplo.com` (solo pasa lista en San Pablo) y `mixto@ejemplo.com` (guía en Santa Rosa y catequista en San José) con cualquier contraseña de 6+ caracteres (el primer login crea la cuenta; requiere `NEXT_PUBLIC_LOGIN_CON_CORREO=true` en `.env.development.local`). Las fotos del seed no existen en R2 (se ven rotas); para fotos reales, súbelas por `/alumno`. Fuera del horario (sáb 19:00 → lun 23:59) se puede abrir el formulario a mano con `update public.ciclos set abierto_manual = true where activo` y volverlo a `null` al terminar.

## Flujo de ramas

- `main`: solo versiones listas para producción, por Pull Request desde `develop`.
- `develop`: integración; recibe cada fase o tarea por Pull Request.
- `feature/<nombre>`: se crea desde `develop` (`git switch -c feature/administracion develop`). Nunca commitear directo en `main` ni en `develop`.
- En GitHub los PR se unen con **"Create a merge commit"** (no squash ni rebase), para que los commits se conserven y el siguiente PR muestre solo lo nuevo. La CI (`.github/workflows/ci.yml`) corre en cada PR y en los push a `main` y `develop`.

## Estado del rediseño

Plan aprobado en fases 0–7. Hechas: base nueva (0–1), fotos en R2 (2), pantalla del alumno (3), revisión del staff (4), administración (5) y publicación (6, v1.0.0 en `asistencia-misa-pastoral-mariana.vercel.app`; falta el subdominio). La v1.1.0 de UI/UX (identidad visual, alumno, revisión y administración) se publica con `npx supabase db push` antes de unir `develop` → `main`, por la migración `20261024000001_semanas_con_fecha.sql`. La 7 (asistencia a catequesis: base, lista del staff, y vista del alumno y reportes) sale como v1.2.0 con `npx supabase db push` antes de unir `develop` → `main`, por la migración `20261025000001_catequesis.sql`. En curso, la 8 (misas cerca de mí, plan en 3 PR: base, Administración → Misas y la página pública `/misas`; sale como v1.4.0 con `npx supabase db push`, por la migración `20261027000001_misas.sql`). `lib/supabase/client.ts` está tipado con `Database`: tras cambiar el esquema hay que correr `npm run db:types` o `tsc` marcará las consultas.

## Arquitectura

### Base de datos (`supabase/migrations/`)

- El alumno (rol `anon`) no tiene acceso a ninguna tabla: solo a las RPC `estado_formulario` e `identificar_alumno`. Los envíos de foto pasan por `preparar_envio`/`confirmar_envio`, que solo puede ejecutar `service_role` (Edge Functions). `identificar_alumno` y `preparar_envio` bloquean 15 minutos tras 30 códigos equivocados desde una IP o 3.000 en total (`_limite_intentos_superado`, tabla `intentos_codigo`): un salón en el WiFi del colegio comparte IP, así que no conviene bajar el límite por IP. La IP sale de los headers (`_ip_cliente`); en las fotos la pasa la Edge Function.
- El staff se identifica por el email del JWT (login con Google) contra `public.staff`; `es_admin()`, `es_staff_de()` y `es_staff_de_alumno()` alimentan las políticas RLS. La función de cada persona va **por comunidad** (`staff_comunidades.funcion`: `guia` o `catequista`), así que alguien puede ser guía en una comunidad y catequista en otra; `staff.rol` solo distingue al admin (global). `es_staff_de()` es "admin o **guía** de esa comunidad": todo lo de misa, fotos y códigos queda cerrado al catequista. Para pasar lista se usa `puede_pasar_lista()` (admin, guía o catequista). `mi_perfil_staff` devuelve `es_guia`/`es_catequista` para el menú. El hook `hook_antes_de_crear_usuario` impide crear cuentas a correos que no estén en `staff`. `asistencias` y `envios_foto` solo se modifican por RPC (`revisar_asistencia`, `justificar_falta`, `reasignar_asistencia`, `cerrar_semana`).
- Horario en hora de Lima: envío sáb 19:00 → lun 23:59, reenvío de rechazadas hasta mié 23:59, cierre automático (pg_cron) el jueves 00:05. La semana se calcula por el domingo de referencia (`domingo_de_referencia`): la misa del sábado cuenta para el domingo siguiente, y de jueves a sábado `estado_formulario().semana` ya es la semana que viene. El frontend no calcula horarios: solo formatea (`lib/utils/timeHelpers.ts`).
- `public.momento_actual()` permite simular la hora en tests con `set_config('app.ahora', ...)`.
- `asistencias.estado` ∈ `pendiente | validado | rechazado | inasistencia | justificada`, una fila por (`alumno_id`, `actividad`, `semana_numero`). Cada foto subida queda en `envios_foto` (las rechazadas no se borran) con su huella y fecha EXIF.
- Catequesis (`20261025000001_catequesis.sql`): va por **sesión con fecha** (la clase del sábado, eventos del domingo), no por semana, en `sesiones_catequesis` y `asistencias_catequesis` (`presente | tardanza | falta | justificada`; lo no marcado queda "sin marcar", sin faltas automáticas). Se lee con RLS (`puede_pasar_lista`) y se escribe solo por RPC: `crear_sesion_catequesis`, `crear_evento_catequesis` (solo admin, varias comunidades), `editar_sesion_catequesis`, `borrar_sesion_catequesis`, `marcar_catequesis` (`p_estado null` borra la marca), `marcar_todos_presentes`; y se consulta con `sesiones_de_comunidad`, `lista_de_sesion` (sin códigos) y `resumen_catequesis`. `identificar_alumno` devuelve también `catequesis`. El enum `actividad` tiene `'catequesis'` desde el esquema inicial, pero no se usa: `asistencias` es solo de misa.
- Misas cerca de mí (`20261027000001_misas.sql`): `iglesias` (uno de los 12 distritos de la provincia de Trujillo y una ubicación que debe caer en la provincia, lo que atrapa latitud y longitud invertidas) y `horarios_misa` (solo el sábado desde las 17:00 y el domingo; `dia` como `isodow`). No dependen del ciclo. Cualquiera las lee con `iglesias_con_misas()` (para `/misas`, sin código; la ubicación del alumno nunca llega a la base). Solo el admin escribe: `guardar_iglesia` e `importar_iglesias` (todo o nada) crean o actualizan la iglesia, reemplazan sus misas y la marcan revisada hoy; `activa` y el borrado van directo por RLS. El seed trae iglesias ficticias.
- Al cambiar el esquema: nueva migración en `supabase/migrations/`, `npm run db:reset`, `npm run db:test` y `npm run db:types`. El repo es público: el seed solo lleva datos ficticios.

### Fotos

- Cloudflare R2 privado, nunca público ni borrado. Edge Functions (Deno, `supabase/functions/`, fuera de ESLint y tsconfig) con `@supabase/server`: `subir-foto` (auth `publishable`; acciones `preparar` → URL PUT firmada 5 min, y `confirmar` → HEAD en R2 + RPC) y `ver-fotos` (auth `user`; RLS decide qué URLs GET firmadas devuelve). `@supabase/server` no acepta las claves legacy (anon JWT): el frontend usa la clave publishable. El CORS lo maneja `_shared/cors.ts` con `ORIGENES_PERMITIDOS`; en local el gateway de Supabase responde `*` igual, así que la restricción solo se nota en producción.
- En el navegador (`lib/fotos/`): `procesarFoto` lee la fecha EXIF antes de comprimir, calcula la huella dHash (`huella.ts`, bigint con signo de 64 bits como la columna `huella`) y comprime a **JPEG** de 720 px (Safari no genera WebP desde canvas). `enviarFoto` hace preparar → PUT → confirmar.

### Alumno (`/alumno`)

`app/alumno/page.tsx` orquesta: sin código recordado muestra `IngresoCodigo` (pide el código personal y confirma "¿Eres Ana P.?" antes de recordarlo); con código muestra `PanelAlumno` (semana actual con `EnvioFoto` si `accion` es `enviar`/`reenviar`, o el estado/cuenta regresiva; `TuCatequesis` con las últimas sesiones de `catequesis`, que es opcional en el tipo por si la base no tiene la migración; y el historial de misa). El código se recuerda en `localStorage` mediante `useCodigoGuardado` (`useSyncExternalStore`; `undefined` mientras hidrata, así no hay parpadeo ni error de hidratación). Los textos de error salen de `lib/alumno/mensajes.ts`.

### Staff

Las páginas del staff usan `MarcoStaff` (`components/dashboard/marco-staff.tsx`): valida la sesión con `useSesionStaff` (`lib/staff/sesion.ts`; sin sesión manda a `/login`), muestra el encabezado y el menú (Revisión · Catequesis · Mi comunidad/Asistencia · Administración solo para admins; quien solo es catequista no tiene menú; fijo abajo en el celular y arriba desde `md`, por eso el `main` lleva relleno inferior con `env(safe-area-inset-bottom)`) y entrega el `perfil` a la página como render prop. `requiere` (`"guia"` por defecto, `"lista"` en Catequesis) decide quién entra según `es_guia`/`es_catequista`: al que solo es catequista lo manda a `/dashboard/catequesis` sin montar la página, así no pide fotos. `soloAdmin` bloquea la página a los guías.

- **Login** (`/login`): en producción solo se entra con Google. El botón oficial (`BotonGoogle`, `components/login/boton-google.tsx`, con Google Identity Services) devuelve un ID token que se canjea con `signInWithIdToken` y un nonce (`lib/staff/google.ts`); así la ventana de Google muestra el nombre de la app y no el dominio de Supabase. Necesita `NEXT_PUBLIC_GOOGLE_CLIENT_ID` y el origen de la página en "Authorized JavaScript origins" del cliente OAuth. Si falta el Client ID o el script no carga en 8 s, queda la redirección de siempre (`signInWithOAuth`: vuelve a `/login`, que pasa a `/dashboard` si hay sesión o muestra el error del hook), que además se ofrece como "Entrar de otra forma". En local, Auth acepta tokens de Google si el `.env` de la raíz tiene `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` (ver `supabase/config.toml`) y tu Gmail está en `staff`. Con `NEXT_PUBLIC_LOGIN_CON_CORREO=true` (solo local) aparece un formulario de correo que, si la cuenta no existe, la crea. Seguro extra: el hook rechaza proveedores distintos de Google salvo que `ajustes.permitir_login_correo` esté activo, y solo el seed lo activa (`db push` no corre el seed).
- **Revisión** (`/dashboard`, `PanelRevision`): `mi_perfil_staff` (rol y `semana_reciente`, la de la última misa), `cola_revision` (pendientes con el domingo de esa semana, la foto anterior del alumno y la parecida) y `resumen_semana` (estado de cada alumno, para `armarResumenWhatsApp`). Las RPC de lectura del staff son `security invoker`, así que RLS limita a sus comunidades. Las URLs de las fotos se piden a `ver-fotos` con caché de 4 min (`lib/staff/fotos.ts`). Las fotos se muestran con `<img>` y no con `next/image` a propósito: así no pasan por el optimizador de Vercel.
- `TarjetaRevision`: swipe derecha valida, izquierda abre `ModalRechazo` (el motivo lo ve el alumno). Tocar la foto (sin arrastrar) o la lupa abre `VisorFoto` (pantalla completa sobre `<dialog>`, zoom). En PC (`lg`) los botones y lo que llega por la prop `lateral` (fotos para comparar, cambiar alumno) van a la derecha de la tarjeta, y hay atajos de teclado (`lib/staff/atajos.ts`: → o V valida, ← o R rechaza, Z deshace; no actúan escribiendo ni con un modal abierto). El consejo de la primera vez se recuerda con `useConsejoVisto` (`lib/staff/consejo.ts`). "Deshacer" se ofrece 8 s en la UI; la base lo permite 2 min al mismo revisor. "Cambiar alumno" (`ModalReasignar`) pasa una foto pendiente a otro alumno de la comunidad. Los avisos (`lib/staff/avisos.ts`) marcan fotos parecidas y fotos tomadas antes del sábado de esa semana.
- **Mi comunidad** (`/dashboard/comunidad`, `components/comunidad/`): matriz alumno × semana (la más reciente primero) con el porcentaje de `resumirAlumno` (`lib/staff/estadisticas.ts`: no cuenta justificadas ni pendientes); tocar una celda abre "justificar falta"; "nuevo código" usa la RPC `regenerar_codigo`; "Imprimir códigos" usa `window.print()` con las tarjetas de `CodigosImprimibles` (solo visibles con `print:`) y "Descargar Excel" el CSV de la comunidad.
- **Catequesis** (`/dashboard/catequesis`, `components/catequesis/`, `lib/staff/catequesis.ts`): comunidades con `obtenerComunidadesVisibles` (donde pasa lista; `obtenerMisComunidades` da solo las de guía, para Mi comunidad). Pestaña "Pasar lista": sesiones con sus conteos, "Nueva sesión" (fecha de hoy con `hoyEnLima`) y, para el admin, "Nuevo evento para varias comunidades". `PasarLista` guarda cada toque al instante en una cola por alumno (la última marca gana), con "Reintentar" si falla; tocar la marca elegida la borra y la J pide el motivo (`ModalMotivo`). Pestaña "Resumen": matriz alumno × sesión con `resumirCatequesis` (la tardanza cuenta como asistencia) y el CSV de `armarCsvCatequesis`. Cómo se ve cada marca: `ESTADOS_CATEQUESIS` en `lib/ui/estados.ts`.
- **Administración** (`/dashboard/admin`, `components/admin/`): pestañas Ciclo (fechas, formulario automático/abierto/cerrado, crear ciclo, `copiar_comunidades` y `activar_ciclo`), Comunidades, Staff (Gmail, rol, y por comunidad "Guía en" / "Catequista en" con `asignarComunidad`; pasar de catequista a guía pide confirmación), Alumnos (pegar desde Excel con `parsearNombres` y la RPC `importar_alumnos`, que descarta repetidos) y Reportes (CSV de misa del ciclo con `armarCsvAsistencia`, CSV de catequesis del ciclo en formato largo con `datosCatequesisCiclo` + `armarCsvCatequesisCiclo`, y cierre manual de semana). Las escrituras simples van directo a las tablas (RLS solo deja al admin); los errores se traducen con `mensajeDe` (`lib/staff/errores.ts`). Las listas largas usan `obtenerTodasLasFilas` (`lib/supabase/paginacion.ts`, Supabase corta en 1000 filas). Las acciones que no se deshacen solas (activar ciclo, dar de baja, desactivar, código nuevo, cerrar semana, hacer administrador) piden confirmación con `useConfirmar`; la matriz, Alumnos y Staff se filtran con `Buscador` + `coincide` (`lib/staff/busqueda.ts`, sin importar mayúsculas ni tildes).

### Convenciones de React

En los `useEffect` no llames funciones que hagan `setState` de forma síncrona (la regla `react-hooks/set-state-in-effect` lo marca como error): separa la consulta (devuelve datos) de la aplicación al estado y haz `consultar().then(aplicar)` dentro del efecto, como en `app/alumno/page.tsx`. En timers, el `setState` va dentro del callback (ver `formulario-cerrado.tsx`).

### PWA

`public/manifest.json` y un `public/sw.js` escrito a mano que solo guarda los archivos de la app (`/_next/static/`, íconos, manifest): nunca fotos, datos ni llamadas a Supabase o R2. Lo registra `components/service-worker-registrar.tsx` solo en producción (en `next dev` lo desregistra). `next.config.ts` añade los headers de `/sw.js`. Si cambias lo que se cachea (o el manifest, que se sirve desde la caché), sube `CACHE_NAME`: la activación borra las cachés viejas.

La app instalada abre en `/` (`app/page.tsx`), que decide en el navegador porque la sesión del staff vive en localStorage: con sesión va a `/dashboard` y sin ella a `/alumno`. Como la app instalada no tiene barra de direcciones, el staff llega a `/login` por el enlace "¿Eres guía, catequista o administrador?" de `IngresoCodigo` o, en Android, por el atajo "Panel del staff" del manifest (`shortcuts`).

Íconos y logo: `node scripts/generar-iconos.mjs` genera `app/icon.png`, `app/apple-icon.png`, `public/icons/*` y `marca/web/*.webp` desde `marca/` (usa `marca/logo-completo.png` y `marca/logo-ovalo.png` si existen; si no, recorta el óvalo de `marca/logo-original.jpg`). También genera `marca/web/logo-completo-oscuro.webp` para el tema oscuro, pintando de blanco solo las letras de `logo-completo.png` (el óvalo queda igual; si cambias ese archivo, vuelve a medir `OVALO_EN_COMPLETO`). Al cambiar el logo, vuelve a correrlo y sube `CACHE_NAME`. En la UI el logo va con `LogoCompleto` (cambia de versión según el tema) y `LogoOvalo` (`components/ui/logo.tsx`).

### Estilos

Tailwind v4 sin `tailwind.config`. Tema automático claro/oscuro con los colores del logo de la Pastoral Mariana: las variables de `app/globals.css` cambian con `prefers-color-scheme` y se usan como clases con nombre (`bg-fondo`, `bg-superficie`, `bg-superficie-2`, `border-borde`, `text-texto`, `text-texto-suave`, `text-texto-tenue`, `text-marca`, `bg-marca-solido`, `text-exito`/`error`/`aviso`/`info`, `bg-*-solido` para botones y tintes como `bg-error/10`). **No uses colores fijos** (`white/*`, `rose-*`, `neutral-*`…): solo quedan `text-white` sobre botones sólidos y sobre las fotos, y los `neutral` de impresión. `lib/ui/contraste.test.ts` comprueba que cada texto tenga contraste ≥ 4.5:1 en los dos temas. Clases propias: `tarjeta` (`@utility`), `animate-fade-in`, `animate-fade-in-scale`, `delay-100`…`delay-400` (como `animation-delay`); las animaciones se apagan con `prefers-reduced-motion`. Está pensada para móvil.

Piezas compartidas en `components/ui/`: `base.tsx` (`Boton` con `variante`/`tamano` y mínimo 44 px, `claseInput`, `Campo`, `Tarjeta`, `Mensaje`, `Cargando`), `modal.tsx` (`Modal` sobre `<dialog>`: Escape, foco atrapado, `data-autofocus`) y `confirmar.tsx` (`useConfirmar`, en lugar de `window.confirm`). Cómo se muestra cada estado de una semana: `lib/ui/estados.ts`.

Alias de imports: `@/*` apunta a la raíz del repo.
