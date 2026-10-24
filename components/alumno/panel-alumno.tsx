"use client";

import { Boton } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";
import { useEnfocarAlAparecer } from "@/components/ui/enfoque";
import { LogoOvalo } from "@/components/ui/logo";
import { NOMBRE_PROGRAMA, type AlumnoIdentificado } from "@/lib/alumno/identificar";
import { formatearDiaHora, formatearFecha } from "@/lib/utils/timeHelpers";
import { EnvioFoto } from "./envio-foto";
import { FormularioCerrado } from "./formulario-cerrado";
import { EtiquetaEstado, HistorialSemanas } from "./historial-semanas";
import { TuCatequesis } from "./tu-catequesis";

interface Props {
  datos: AlumnoIdentificado;
  codigo: string;
  onCambiarCodigo: () => void;
  onActualizar: () => void;
  onEnviado: (semana: number) => void;
}

/** Pantalla principal del alumno ya identificado: semana actual, su catequesis e historial */
export function PanelAlumno({ datos, codigo, onCambiarCodigo, onActualizar, onEnviado }: Props) {
  const { alumno, formulario, accion, semanas, catequesis = [] } = datos;
  const actual = semanas.find((s) => s.semana === formulario.semana);
  const anteriores = semanas.filter((s) => s.semana !== formulario.semana);
  const titulo = useEnfocarAlAparecer<HTMLHeadingElement>();
  const { confirmar, dialogoConfirmar } = useConfirmar();

  const noSoyYo = async () => {
    const seguro = await confirmar({
      titulo: "¿Cambiar de alumno?",
      mensaje: "Se borrará tu código de este celular y tendrás que escribirlo otra vez.",
      aceptar: "Sí, cambiar",
    });
    if (seguro) onCambiarCodigo();
  };

  return (
    <main className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6 gap-5">
      {/* ── Saludo ── */}
      <header className="flex items-start justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <LogoOvalo className="h-12" />
          <div>
            <h1 ref={titulo} tabIndex={-1} className="text-xl font-bold text-texto focus:outline-none">
              Hola, {alumno.nombre_corto}
            </h1>
            <p className="text-xs text-texto-tenue">
              {alumno.comunidad} · {NOMBRE_PROGRAMA[alumno.programa]}
            </p>
          </div>
        </div>
        <Boton variante="secundario" tamano="pequeno" onClick={noSoyYo}>
          No soy yo
        </Boton>
      </header>

      {/* ── Semana actual ── */}
      <section className="tarjeta p-5 animate-fade-in delay-100">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-texto">
            {formulario.semana > 0 ? `Semana ${formulario.semana}` : formulario.ciclo_nombre}
            {actual?.domingo && (
              <span className="font-normal text-texto-tenue"> · {formatearFecha(actual.domingo)}</span>
            )}
          </h2>
          {actual && actual.estado !== "sin_registro" && <EtiquetaEstado estado={actual.estado} />}
        </div>

        {accion === "enviar" && (
          <>
            <p className="text-sm text-texto-suave mb-4">
              Envía una foto tuya en la misa de este fin de semana
              {formulario.cierre_envio && <> hasta el {formatearDiaHora(formulario.cierre_envio)}</>}.
            </p>
            <EnvioFoto codigo={codigo} esReenvio={false} onEnviado={onEnviado} onActualizar={onActualizar} />
          </>
        )}

        {accion === "reenviar" && (
          <>
            <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25">
              <p className="text-sm text-error">Tu foto fue rechazada{actual?.motivo && `: ${actual.motivo}`}</p>
            </div>
            <p className="text-sm text-texto-suave mb-4">
              Puedes enviar otra
              {formulario.cierre_reenvio && <> hasta el {formatearDiaHora(formulario.cierre_reenvio)}</>}.
            </p>
            <EnvioFoto codigo={codigo} esReenvio onEnviado={onEnviado} onActualizar={onActualizar} />
          </>
        )}

        {accion === null && <EstadoSinAccion datos={datos} onActualizar={onActualizar} />}
      </section>

      {/* ── Catequesis ── */}
      <TuCatequesis sesiones={catequesis} />

      {/* ── Historial ── */}
      <HistorialSemanas semanas={anteriores} />

      {dialogoConfirmar}
    </main>
  );
}

/** Qué decirle al alumno cuando esta semana no puede enviar nada */
function EstadoSinAccion({ datos, onActualizar }: { datos: AlumnoIdentificado; onActualizar: () => void }) {
  const { formulario, semanas } = datos;
  const actual = semanas.find((s) => s.semana === formulario.semana);

  switch (actual?.estado) {
    case "pendiente":
      return <p className="text-sm text-texto-suave">Tu foto está en revisión. Tu guía la verá pronto.</p>;
    case "validado":
      return <p className="text-sm text-exito">¡Tu asistencia de esta semana está validada!</p>;
    case "justificada":
      return (
        <p className="text-sm text-texto-suave">
          Tu falta está justificada{actual.motivo && `: ${actual.motivo}`}.
        </p>
      );
    case "inasistencia":
      return <p className="text-sm text-texto-suave">Esta semana se cerró sin tu foto.</p>;
    case "rechazado":
      return (
        <p className="text-sm text-texto-suave">
          Tu foto fue rechazada{actual.motivo && `: ${actual.motivo}`}. El plazo para enviar otra ya terminó.
        </p>
      );
    default:
      return (
        <>
          {/* Martes y miércoles la semana sigue abierta solo para reenvíos */}
          {actual?.estado === "sin_registro" && formulario.reenvio_abierto && !formulario.abierto && (
            <p className="text-sm text-texto-suave text-center mb-5">
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
