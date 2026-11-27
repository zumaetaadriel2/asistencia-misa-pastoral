"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { MENSAJES_LOGIN, mensajeDeErrorLogin, PROVEEDOR_PASTORAL_DIGITAL } from "@/lib/staff/pastoral-digital";
import { EnlacesPie } from "@/components/pwa/enlaces-pie";
import { LogoCompleto, LogoOvalo } from "@/components/ui/logo";

/**
 * Solo para desarrollo local: el staff ficticio del seed entra con correo y contraseña.
 * En producción esta variable no existe y, además, el hook de Auth rechaza
 * cualquier proveedor que no sea Pastoral Digital ID.
 */
const LOGIN_CON_CORREO = process.env.NEXT_PUBLIC_LOGIN_CON_CORREO === "true";

/** Error con el que vuelve el login de Pastoral Digital ID (p. ej. el hook), como uno de nuestros mensajes */
function errorDeLaUrl(): string {
  return mensajeDeErrorLogin(
    new URLSearchParams(`${window.location.search.slice(1)}&${window.location.hash.slice(1)}`)
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Al volver de Pastoral Digital ID la sesión llega en la URL: si ya hay sesión, pasar al panel
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard/inicio");
      else setError(errorDeLaUrl());
    });
  }, [router]);

  /** Pastoral Digital ID: redirección de Supabase al proveedor OIDC y vuelta a /login */
  const entrarConPastoralDigital = async () => {
    setCargando(true);
    setError("");
    const { error: errorAuth } = await supabase.auth.signInWithOAuth({
      provider: PROVEEDOR_PASTORAL_DIGITAL,
      options: { redirectTo: `${window.location.origin}/login` },
    });
    if (errorAuth) {
      setError(MENSAJES_LOGIN.fallo);
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
    router.push("/dashboard/inicio");
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
            <div role="alert" className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 animate-fade-in-scale">
              <p className="text-sm text-error text-center">{error}</p>
            </div>
          )}

          <button
            onClick={entrarConPastoralDigital}
            disabled={cargando}
            className="w-full min-h-12 py-3 rounded-xl bg-marca-solido hover:bg-marca-solido/85 disabled:opacity-40 text-white text-sm font-semibold
                       transition-all flex items-center justify-center gap-3"
          >
            <LogoOvalo className="h-7" />
            {cargando ? "Abriendo Pastoral Digital ID…" : "Entrar con Pastoral Digital ID"}
          </button>
          <p className="mt-3 text-xs text-center text-texto-tenue">
            Usa tu cuenta de la app de catequistas. Si es tu primera vez, el administrador tiene que darte de alta antes.
          </p>

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
                className="w-full py-2.5 rounded-xl bg-superficie-2 hover:bg-superficie border border-borde disabled:opacity-30 text-texto text-sm font-semibold"
              >
                Entrar con correo
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-texto-tenue">
          Solo guías, catequistas y administradores dados de alta por la pastoral
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
