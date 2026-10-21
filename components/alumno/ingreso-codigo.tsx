"use client";

import { useState } from "react";
import { esCodigoValido, normalizarCodigo } from "@/lib/alumno/codigo";
import {
  identificarAlumno,
  NOMBRE_PROGRAMA,
  type AlumnoIdentificado,
} from "@/lib/alumno/identificar";
import { MENSAJES_ERROR } from "@/lib/alumno/mensajes";

interface Props {
  /** Mensaje a mostrar al llegar (p. ej. el código guardado ya no es válido) */
  aviso?: string;
  onConfirmado: (codigo: string, datos: AlumnoIdentificado) => void;
}

/**
 * Pide el código personal y, antes de recordarlo en el celular, confirma
 * "¿Eres Ana P.?" para atrapar códigos mal escritos que caen en otro alumno.
 */
export function IngresoCodigo({ aviso, onConfirmado }: Props) {
  const [texto, setTexto] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState("");
  const [candidato, setCandidato] = useState<{ codigo: string; datos: AlumnoIdentificado } | null>(null);

  const verificar = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = normalizarCodigo(texto);
    if (!esCodigoValido(codigo)) {
      setError("El código tiene 6 letras y números (sin 0, O, 1, I ni L).");
      return;
    }

    setVerificando(true);
    setError("");
    const resultado = await identificarAlumno(codigo);
    setVerificando(false);

    if (resultado.ok) setCandidato({ codigo, datos: resultado });
    else setError(MENSAJES_ERROR[resultado.error]);
  };

  // --- Confirmación de identidad ---
  if (candidato) {
    const { alumno } = candidato.datos;
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-fade-in-scale">
          <p className="text-sm text-white/50 mb-2">¿Eres tú?</p>
          <h1 className="text-2xl font-bold text-white mb-1">{alumno.nombre_corto}</h1>
          <p className="text-sm text-white/50 mb-8">
            {alumno.comunidad} · {NOMBRE_PROGRAMA[alumno.programa]}
          </p>
          <button
            onClick={() => onConfirmado(candidato.codigo, candidato.datos)}
            className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-all"
          >
            Sí, soy yo
          </button>
          <button
            onClick={() => {
              setCandidato(null);
              setTexto("");
            }}
            className="mt-3 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-all"
          >
            No, escribir otro código
          </button>
        </div>
      </main>
    );
  }

  // --- Ingreso del código ---
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-sm w-full animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Asistencia a Misa</h1>
          <p className="text-sm text-white/50">
            Escribe el código personal que te dio tu guía. Solo lo pedimos la primera vez.
          </p>
        </div>

        <form onSubmit={verificar} className="glass-card p-6">
          {(error || aviso) && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in-scale">
              <p className="text-sm text-rose-300 text-center">{error || aviso}</p>
            </div>
          )}

          <label htmlFor="codigo" className="block text-sm font-medium text-white/60 mb-1.5">
            Tu código
          </label>
          <input
            id="codigo"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value.toUpperCase())}
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="K7P2QM"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-2xl text-center
                       font-mono tracking-[0.3em] placeholder:text-white/15 focus:outline-none focus:ring-2
                       focus:ring-primary-500/50 focus:border-primary-500/50 transition-all"
          />

          <button
            type="submit"
            disabled={verificando || normalizarCodigo(texto).length < 6}
            className="mt-6 w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-30
                       disabled:cursor-not-allowed text-white text-sm font-semibold transition-all
                       flex items-center justify-center gap-2"
          >
            {verificando ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Verificando…
              </>
            ) : (
              "Continuar"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/25">
          ¿No tienes tu código? Pídeselo a tu guía de comunidad.
        </p>
      </div>
    </main>
  );
}
