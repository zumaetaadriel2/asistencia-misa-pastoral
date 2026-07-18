"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : authError.message
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-sm w-full animate-fade-in">
        {/* Logo / título */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-600/20 border border-primary-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Panel de Revisión</h1>
          <p className="text-sm text-white/40 mt-1">
            Asistencia Misa Pastoral
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="glass-card p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in-scale">
              <p className="text-sm text-rose-300 text-center">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/60 mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                           placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/50
                           focus:border-primary-500/50 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/60 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                           placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/50
                           focus:border-primary-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-6 w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-30
                       disabled:cursor-not-allowed text-white text-sm font-semibold transition-all
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Ingresando…
              </>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/20">
          Solo personal autorizado (Guías y Administradores)
        </p>
      </div>
    </main>
  );
}
