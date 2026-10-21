"use client";

import { useCallback, useEffect, useState } from "react";
import { guardarCodigo, useCodigoGuardado } from "@/lib/alumno/codigo";
import {
  identificarAlumno,
  type AlumnoIdentificado,
  type ResultadoIdentificacion,
} from "@/lib/alumno/identificar";
import { MENSAJES_ERROR } from "@/lib/alumno/mensajes";
import { IngresoCodigo } from "@/components/alumno/ingreso-codigo";
import { PanelAlumno } from "@/components/alumno/panel-alumno";
import { PantallaExito } from "@/components/alumno/pantalla-exito";

function Cargando({ texto }: { texto: string }) {
  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-sm text-white/50">{texto}</p>
      </div>
    </main>
  );
}

export default function AlumnoPage() {
  const codigo = useCodigoGuardado();

  // Cada recarga (tras enviar, al abrir el formulario o al reintentar) vuelve a consultar
  const [recargas, setRecargas] = useState(0);
  const [carga, setCarga] = useState<{ clave: string; resultado: ResultadoIdentificacion } | null>(null);
  const [enviado, setEnviado] = useState<{ semana: number; datos: AlumnoIdentificado } | null>(null);
  const [aviso, setAviso] = useState("");

  const clave = codigo ? `${codigo}#${recargas}` : null;

  useEffect(() => {
    if (!codigo || !clave) return;

    let cancelado = false;
    identificarAlumno(codigo).then((resultado) => {
      if (cancelado) return;
      // El código guardado dejó de existir (p. ej. ciclo nuevo): volver a pedirlo
      if (!resultado.ok && resultado.error === "codigo_invalido") {
        setAviso("Tu código guardado ya no es válido. Escríbelo de nuevo.");
        guardarCodigo(null);
        return;
      }
      setCarga({ clave, resultado });
    });
    return () => {
      cancelado = true;
    };
  }, [codigo, clave]);

  const actualizar = useCallback(() => setRecargas((n) => n + 1), []);

  // --- Aún no se sabe si hay código guardado (render del servidor e hidratación) ---
  if (codigo === undefined) return <Cargando texto="Cargando…" />;

  // --- Sin código: pedirlo ---
  if (codigo === null) {
    return (
      <IngresoCodigo
        aviso={aviso}
        onConfirmado={(nuevoCodigo, datos) => {
          setCarga({ clave: `${nuevoCodigo}#${recargas}`, resultado: datos });
          setAviso("");
          guardarCodigo(nuevoCodigo);
        }}
      />
    );
  }

  // --- Foto recién enviada ---
  if (enviado) {
    return (
      <PantallaExito
        alumnoNombre={enviado.datos.alumno.nombre_corto}
        comunidadNombre={enviado.datos.alumno.comunidad}
        semana={enviado.semana}
        onVolver={() => {
          setEnviado(null);
          actualizar();
        }}
      />
    );
  }

  if (carga?.clave !== clave) return <Cargando texto="Cargando tu asistencia…" />;

  // --- Error al consultar ---
  if (!carga.resultado.ok) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-sm w-full text-center animate-fade-in">
          <p className="text-sm text-white/60 mb-6">{MENSAJES_ERROR[carga.resultado.error]}</p>
          <button
            onClick={actualizar}
            className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
          <button
            onClick={() => guardarCodigo(null)}
            className="mt-3 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm font-medium transition-colors"
          >
            Usar otro código
          </button>
        </div>
      </main>
    );
  }

  const datos = carga.resultado;
  return (
    <PanelAlumno
      datos={datos}
      codigo={codigo}
      onCambiarCodigo={() => guardarCodigo(null)}
      onActualizar={actualizar}
      onEnviado={(semana) => setEnviado({ semana, datos })}
    />
  );
}
