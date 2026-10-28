"use client";

import { useState } from "react";
import Link from "next/link";
import { esCodigoValido, LARGO_CODIGO, normalizarCodigo } from "@/lib/alumno/codigo";
import {
  identificarAlumno,
  NOMBRE_PROGRAMA,
  type AlumnoIdentificado,
} from "@/lib/alumno/identificar";
import { MENSAJES_ERROR } from "@/lib/alumno/mensajes";
import { Boton } from "@/components/ui/base";
import { useEnfocarAlAparecer } from "@/components/ui/enfoque";
import { LogoCompleto } from "@/components/ui/logo";

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
    return (
      <ConfirmarIdentidad
        datos={candidato.datos}
        onSi={() => onConfirmado(candidato.codigo, candidato.datos)}
        onNo={() => {
          setCandidato(null);
          setTexto("");
        }}
      />
    );
  }

  // --- Ingreso del código ---
  const mensajeError = error || aviso;
  const faltan = LARGO_CODIGO - normalizarCodigo(texto).length;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="max-w-sm w-full animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-5 flex justify-center">
            <LogoCompleto className="h-28" />
          </div>
          <h1 className="text-2xl font-bold text-texto mb-2">Asistencia a Misa</h1>
          <p className="text-sm text-texto-suave">
            Escribe el código personal que te dio tu guía. Solo lo pedimos la primera vez.
          </p>
        </div>

        <form onSubmit={verificar} className="tarjeta p-6">
          {mensajeError && (
            <div
              id="codigo-error"
              role="alert"
              className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 animate-fade-in-scale"
            >
              <p className="text-sm text-error text-center">{mensajeError}</p>
            </div>
          )}

          <label htmlFor="codigo" className="block text-sm font-medium text-texto-suave mb-1.5">
            Tu código
          </label>
          <input
            id="codigo"
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value.toUpperCase())}
            maxLength={8}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            placeholder="K7P2QM"
            aria-invalid={Boolean(error)}
            aria-describedby={mensajeError ? "codigo-error codigo-ayuda" : "codigo-ayuda"}
            className="w-full px-4 py-3 rounded-xl bg-superficie-2 border border-borde text-texto text-2xl text-center
                       font-mono tracking-[0.3em] placeholder:text-texto-tenue focus:outline-none focus:ring-2
                       focus:ring-marca/40 focus:border-marca/50 transition-all"
          />
          <p id="codigo-ayuda" aria-live="polite" className="mt-2 min-h-5 text-xs text-texto-tenue text-center">
            {faltan > 0 && texto.length > 0 && `Faltan ${faltan} ${faltan === 1 ? "carácter" : "caracteres"}`}
          </p>

          <Boton type="submit" disabled={verificando || faltan > 0} className="mt-4 w-full">
            {verificando ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Verificando…
              </>
            ) : (
              "Continuar"
            )}
          </Boton>
        </form>

        <p className="mt-6 text-center text-xs text-texto-tenue">
          ¿No tienes tu código? Pídeselo a tu guía de comunidad.
        </p>
        {/* Las misas cercanas son públicas: no hace falta el código */}
        <p className="mt-4 text-center">
          <Link
            href="/misas"
            className="inline-flex items-center min-h-11 px-2 text-sm text-marca hover:underline underline-offset-4 font-medium"
          >
            Ver misas cerca de ti
          </Link>
        </p>
        {/* La app instalada no tiene barra de direcciones: este es el camino del staff al panel */}
        <p className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center min-h-11 px-2 text-sm text-texto-suave hover:text-texto underline underline-offset-4"
          >
            ¿Eres guía, catequista o administrador? Entrar al panel
          </Link>
        </p>
      </div>
    </main>
  );
}

function ConfirmarIdentidad({ datos, onSi, onNo }: { datos: AlumnoIdentificado; onSi: () => void; onNo: () => void }) {
  const titulo = useEnfocarAlAparecer<HTMLHeadingElement>();
  const { alumno } = datos;

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="tarjeta p-8 max-w-sm w-full text-center animate-fade-in-scale">
        <p className="text-sm text-texto-tenue mb-2">¿Eres tú?</p>
        <h1 ref={titulo} tabIndex={-1} className="text-2xl font-bold text-texto mb-1 focus:outline-none">
          {alumno.nombre_corto}
        </h1>
        <p className="text-sm text-texto-tenue mb-8">
          {alumno.comunidad} · {NOMBRE_PROGRAMA[alumno.programa]}
        </p>
        <Boton onClick={onSi} className="w-full">
          Sí, soy yo
        </Boton>
        <Boton variante="secundario" onClick={onNo} className="mt-3 w-full">
          No, escribir otro código
        </Boton>
      </div>
    </main>
  );
}
