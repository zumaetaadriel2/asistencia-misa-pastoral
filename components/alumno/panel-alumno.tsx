"use client";

import { NOMBRE_PROGRAMA, type AlumnoIdentificado } from "@/lib/alumno/identificar";
import { formatearDiaHora } from "@/lib/utils/timeHelpers";
import { EnvioFoto } from "./envio-foto";
import { FormularioCerrado } from "./formulario-cerrado";
import { EtiquetaEstado, HistorialSemanas } from "./historial-semanas";

interface Props {
  datos: AlumnoIdentificado;
  codigo: string;
  onCambiarCodigo: () => void;
  onActualizar: () => void;
  onEnviado: (semana: number) => void;
}

/** Pantalla principal del alumno ya identificado: semana actual e historial */
export function PanelAlumno({ datos, codigo, onCambiarCodigo, onActualizar, onEnviado }: Props) {
  const { alumno, formulario, accion, semanas } = datos;
  const actual = semanas.find((s) => s.semana === formulario.semana);
  const anteriores = semanas.filter((s) => s.semana !== formulario.semana);

  return (
    <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6 gap-5">
      {/* ── Saludo ── */}
      <header className="flex items-start justify-between gap-3 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Hola, {alumno.nombre_corto}</h1>
          <p className="text-xs text-white/40">
            {alumno.comunidad} · {NOMBRE_PROGRAMA[alumno.programa]}
          </p>
        </div>
        <button
          onClick={onCambiarCodigo}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-medium transition-all"
        >
          No soy yo
        </button>
      </header>

      {/* ── Semana actual ── */}
      <section className="glass-card p-5 animate-fade-in delay-100">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            {formulario.semana > 0 ? `Semana ${formulario.semana}` : formulario.ciclo_nombre}
          </h2>
          {actual && actual.estado !== "sin_registro" && <EtiquetaEstado estado={actual.estado} />}
        </div>

        {accion === "enviar" && (
          <>
            <p className="text-sm text-white/60 mb-4">
              Envía una foto tuya en la misa de este fin de semana
              {formulario.cierre_envio && <> hasta el {formatearDiaHora(formulario.cierre_envio)}</>}.
            </p>
            <EnvioFoto codigo={codigo} esReenvio={false} onEnviado={onEnviado} />
          </>
        )}

        {accion === "reenviar" && (
          <>
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-sm text-rose-300">Tu foto fue rechazada{actual?.motivo && `: ${actual.motivo}`}</p>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Puedes enviar otra
              {formulario.cierre_reenvio && <> hasta el {formatearDiaHora(formulario.cierre_reenvio)}</>}.
            </p>
            <EnvioFoto codigo={codigo} esReenvio onEnviado={onEnviado} />
          </>
        )}

        {accion === null && <EstadoSinAccion datos={datos} onActualizar={onActualizar} />}
      </section>

      {/* ── Historial ── */}
      <HistorialSemanas semanas={anteriores} />
    </main>
  );
}

/** Qué decirle al alumno cuando esta semana no puede enviar nada */
function EstadoSinAccion({ datos, onActualizar }: { datos: AlumnoIdentificado; onActualizar: () => void }) {
  const { formulario, semanas } = datos;
  const actual = semanas.find((s) => s.semana === formulario.semana);

  switch (actual?.estado) {
    case "pendiente":
      return <p className="text-sm text-white/60">Tu foto está en revisión. Tu guía la validará pronto.</p>;
    case "validado":
      return <p className="text-sm text-emerald-300">¡Tu asistencia de esta semana está validada!</p>;
    case "justificada":
      return (
        <p className="text-sm text-white/60">
          Tu falta está justificada{actual.motivo && `: ${actual.motivo}`}.
        </p>
      );
    case "inasistencia":
      return <p className="text-sm text-white/60">Esta semana se cerró sin tu foto.</p>;
    case "rechazado":
      return (
        <p className="text-sm text-white/60">
          Tu foto fue rechazada{actual.motivo && `: ${actual.motivo}`}. El plazo para enviar otra ya terminó.
        </p>
      );
    default:
      return (
        <>
          {/* Martes y miércoles la semana sigue abierta solo para reenvíos */}
          {actual?.estado === "sin_registro" && formulario.reenvio_abierto && !formulario.abierto && (
            <p className="text-sm text-white/60 text-center mb-5">
              No enviaste foto esta semana. La próxima vez podrás hacerlo desde el sábado.
            </p>
          )}
          <FormularioCerrado
            proximaApertura={formulario.proxima_apertura}
            manual={formulario.manual}
            onAbrir={onActualizar}
          />
        </>
      );
  }
}
