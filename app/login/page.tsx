"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

/**
 * Solo para desarrollo local: el staff ficticio del seed entra con correo y contraseña.
 * En producción esta variable no existe y, además, el hook de Auth rechaza
 * cualquier proveedor que no sea Google.
 */
const LOGIN_CON_CORREO = process.env.NEXT_PUBLIC_LOGIN_CON_CORREO === "true";

/** Error que Supabase devuelve en la URL cuando el login con Google falla */
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

  // Al volver de Google la sesión llega en la URL: si ya hay sesión, pasar al panel
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setError(errorDeLaUrl());
    });
  }, [router]);

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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Panel de Revisión</h1>
          <p className="text-sm text-white/40 mt-1">Asistencia Misa Pastoral</p>
        </div>

        <div className="glass-card p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in-scale">
              <p className="text-sm text-rose-300 text-center">{error}</p>
            </div>
          )}

          <button
            onClick={entrarConGoogle}
            disabled={cargando}
            className="w-full py-3 rounded-xl bg-white hover:bg-white/90 disabled:opacity-40 text-neutral-900 text-sm font-semibold
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

          {LOGIN_CON_CORREO && (
            <form onSubmit={entrarConCorreo} className="mt-6 pt-6 border-t border-white/10 space-y-3">
              <p className="text-xs text-amber-300/80">Solo en desarrollo local: staff de prueba del seed.</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="guia.uno@ejemplo.com"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Contraseña (mín. 6)"
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20"
              />
              <button
                type="submit"
                disabled={cargando}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-30 text-white text-sm font-semibold"
              >
                Entrar con correo
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          Solo guías y administradores registrados por la pastoral
        </p>
      </div>
    </main>
  );
}
