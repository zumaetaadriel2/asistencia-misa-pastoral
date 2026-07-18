"use client";

import { useEffect, useState } from "react";
import {
  obtenerEstadoFormulario,
  type EstadoFormulario,
} from "@/lib/utils/timeHelpers";
import { FormularioCerrado } from "../../components/alumno/formulario-cerrado";
import { FormularioAsistencia } from "../../components/alumno/formulario-asistencia";

type PageState = "loading" | "open" | "closed" | "error";

export default function AlumnoPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [estado, setEstado] = useState<EstadoFormulario | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function cargarEstado() {
      try {
        const result = await obtenerEstadoFormulario();
        setEstado(result);
        setPageState(result.abierto ? "open" : "closed");
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Error al cargar el estado."
        );
        setPageState("error");
      }
    }
    cargarEstado();
  }, []);

  // --- Loading ---
  if (pageState === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-sm text-white/50">Cargando formulario…</p>
        </div>
      </main>
    );
  }

  // --- Error ---
  if (pageState === "error") {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-fade-in">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-semibold text-white mb-2">
            Error de conexión
          </h1>
          <p className="text-sm text-white/50 mb-6">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  // --- Formulario cerrado ---
  if (pageState === "closed" && estado) {
    return <FormularioCerrado estado={estado} />;
  }

  // --- Formulario abierto ---
  if (pageState === "open" && estado) {
    return <FormularioAsistencia estado={estado} />;
  }

  return null;
}
