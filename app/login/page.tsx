"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { GOOGLE_CLIENT_ID, mensajeLoginGoogle } from "@/lib/staff/google";
import { BotonGoogle } from "@/components/login/boton-google";
import { EnlacesPie } from "@/components/pwa/enlaces-pie";
import { LogoCompleto } from "@/components/ui/logo";

/**
 * Solo para desarrollo local: el staff ficticio del seed entra con correo y contraseña.
 * En producción esta variable no existe y, además, el hook de Auth rechaza
 * cualquier proveedor que no sea Google.
 */
const LOGIN_CON_CORREO = process.env.NEXT_PUBLIC_LOGIN_CON_CORREO === "true";

/** Error que Supabase devuelve en la URL cuando el login con Google por redirección falla */
function errorDeLaUrl(): string {
  const parametros = new URLSearchParams(
    `${window.location.search.slice(1)}&${window.location.hash.slice(1)}`
  );
  return parametros.get("error_description")?.replace(/\+/g, " ") ?? "";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Sin Client ID o si el script de Google no carga, queda solo la redirección de Supabase
  const [soloRedireccion, setSoloRedireccion] = useState(!GOOGLE_CLIENT_ID);
  const [intento, setIntento] = useState(0);

  // Al volver de Google la sesión llega en la URL: si ya hay sesión, pasar al panel
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setError(errorDeLaUrl());
    });
  }, [router]);

  /** Botón de Google: canjea el ID token en Supabase (el hook decide si es staff) */
  const entrarConToken = async (token: string, nonce: string) => {
    setCargando(true);
    setError("");
    const { error: errorAuth } = await supabase.auth.signInWithIdToken({ provider: "google", token, nonce });
    if (errorAuth) {
      setError(mensajeLoginGoogle(errorAuth.message));
      setCargando(false);
      setIntento((n) => n + 1);
      return;
    }
    router.replace("/dashboard");
  };

  /** Respaldo: la redirección de Supabase (la ventana de Google muestra el dominio de Supabase) */
  const entrarConGoogle = async () => {
    setCargando(true);
    setError("");
    const { error: errorAuth } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (errorAuth) {
      setError(errorAuth.message);
      setCargando(false);
    }
  };

  const entrarConCorreo = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    let { error: errorAuth } = await supabase.auth.signInWithPassword({ email, password });
    // En local, la primera vez crea la cuenta (el hook solo deja pasar correos de staff)
    if (errorAuth?.message === "Invalid login credentials") {
      ({ error: errorAuth } = await supabase.auth.signUp({ email, password }));
    }

    if (errorAuth) {
      setError(errorAuth.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : errorAuth.message);
      setCargando(false);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-sm w-full animate-fade-in">
        <div className="text-center mb-10">
          <div className="mb-5 flex justify-center">
            <LogoCompleto className="h-24" />
          </div>
          <h1 className="text-xl font-bold text-texto">Panel de Revisión</h1>
          <p className="text-sm text-texto-tenue mt-1">Asistencia a misa · Pastoral Mariana</p>
        </div>

        <div className="tarjeta p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 animate-fade-in-scale">
              <p className="text-sm text-error text-center">{error}</p>
            </div>
          )}

          {soloRedireccion ? (
            <button
              onClick={entrarConGoogle}
              disabled={cargando}
              className="w-full py-3 rounded-xl bg-white hover:bg-neutral-100 border border-borde disabled:opacity-40 text-neutral-900 text-sm font-semibold
                         transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              Entrar con Google
            </button>
          ) : (
            <>
              <div aria-busy={cargando} className={cargando ? "pointer-events-none opacity-40" : ""}>
                <BotonGoogle
                  onToken={entrarConToken}
                  onNoDisponible={() => setSoloRedireccion(true)}
                  intento={intento}
                />
              </div>
              {cargando && (
                <p role="status" className="mt-3 text-sm text-center text-texto-suave">
                  Entrando…
                </p>
              )}
              {/* Por si la ventana de Google no abre (p. ej. en la app instalada de algún celular) */}
              <button
                onClick={entrarConGoogle}
                disabled={cargando}
                className="mt-3 w-full min-h-11 text-xs text-texto-tenue hover:text-texto-suave underline underline-offset-4 disabled:opacity-40"
              >
                ¿No se abre la ventana de Google? Entrar de otra forma
              </button>
            </>
          )}

          {LOGIN_CON_CORREO && (
            <form onSubmit={entrarConCorreo} className="mt-6 pt-6 border-t border-borde space-y-3">
              <p className="text-xs text-aviso">Solo en desarrollo local: staff de prueba del seed.</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="guia.uno@ejemplo.com"
                className="w-full px-4 py-2.5 rounded-xl bg-superficie-2 border border-borde text-texto text-sm placeholder:text-texto-tenue"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Contraseña (mín. 6)"
                className="w-full px-4 py-2.5 rounded-xl bg-superficie-2 border border-borde text-texto text-sm placeholder:text-texto-tenue"
              />
              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 rounded-xl bg-marca-solido hover:bg-marca-solido/85 disabled:opacity-30 text-white text-sm font-semibold"
              >
                Entrar con correo
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-texto-tenue">
          Solo guías, catequistas y administradores registrados por la pastoral
        </p>
        {/* La app instalada no tiene botón atrás: el alumno que llegó aquí por error vuelve por este enlace */}
        <p className="mt-2 text-center">
          <Link
            href="/alumno"
            className="inline-flex items-center min-h-11 px-2 text-sm text-texto-suave hover:text-texto underline underline-offset-4"
          >
            ¿Eres alumno? Volver a poner tu código
          </Link>
        </p>
        <EnlacesPie />
      </div>
    </main>
  );
}
