"use client";

import { useEffect, useState } from "react";
import { Boton, Campo, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { armarResumenWhatsApp } from "@/lib/staff/resumen";
import { obtenerResumen, type FilaResumen } from "@/lib/staff/revision";

interface Props {
  /** Semana de la última misa: la más reciente que se puede resumir */
  semanaActual: number;
  onCerrar: () => void;
}

type Carga = { semana: number; filas: FilaResumen[] } | { semana: number; error: true };

/** Arma el resumen de una semana para copiarlo y pegarlo en el grupo de WhatsApp */
export function ModalResumen({ semanaActual, onCerrar }: Props) {
  const [semana, setSemana] = useState(semanaActual);
  const [carga, setCarga] = useState<Carga | null>(null);
  const [reintentos, setReintentos] = useState(0);
  const [comunidad, setComunidad] = useState<number | null>(null);
  const [copia, setCopia] = useState<"copiado" | "fallo" | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerResumen(semana)
      .then((filas) => {
        if (!cancelado) setCarga({ semana, filas });
      })
      .catch(() => {
        if (!cancelado) setCarga({ semana, error: true });
      });
    return () => {
      cancelado = true;
    };
  }, [semana, reintentos]);

  const actual = carga?.semana === semana ? carga : null;
  const filas = actual && "filas" in actual ? actual.filas : null;
  const fallo = actual !== null && "error" in actual;
  const comunidades = [...new Map((filas ?? []).map((f) => [f.comunidad_id, f.comunidad])).entries()];
  const filtradas = filas?.filter((f) => comunidad === null || f.comunidad_id === comunidad) ?? [];
  const texto = filas ? armarResumenWhatsApp(semana, filtradas) : "";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopia("copiado");
      setTimeout(() => setCopia(null), 2000);
    } catch {
      // Sin permiso para el portapapeles (o navegador antiguo): que lo copie a mano
      setCopia("fallo");
    }
  };

  return (
    <Modal titulo="Resumen para WhatsApp" onCerrar={onCerrar} tamano="md">
      <p className="mt-1 mb-4 text-sm text-texto-suave">Cópialo y pégalo en el grupo de tu comunidad.</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Campo etiqueta="Semana">
          <select
            value={semana}
            onChange={(e) => {
              setSemana(Number(e.target.value));
              setCopia(null);
            }}
            className={`${claseInput} cursor-pointer`}
          >
            {Array.from({ length: semanaActual }, (_, i) => semanaActual - i).map((n) => (
              <option key={n} value={n}>
                Semana {n}
              </option>
            ))}
          </select>
        </Campo>
        {comunidades.length > 1 && (
          <Campo etiqueta="Comunidad">
            <select
              value={comunidad ?? ""}
              onChange={(e) => setComunidad(e.target.value ? Number(e.target.value) : null)}
              className={`${claseInput} cursor-pointer`}
            >
              <option value="">Todas mis comunidades</option>
              {comunidades.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      {fallo ? (
        <div role="alert" className="p-3 rounded-xl bg-error/10 border border-error/25">
          <p className="text-sm text-error">No se pudo cargar el resumen. Revisa tu conexión.</p>
          <Boton
            variante="secundario"
            tamano="pequeno"
            onClick={() => {
              setCarga(null);
              setReintentos((n) => n + 1);
            }}
            className="mt-2"
          >
            Reintentar
          </Boton>
        </div>
      ) : (
        <pre className="max-h-[45dvh] overflow-y-auto whitespace-pre-wrap text-xs text-texto-suave bg-superficie-2 border border-borde rounded-xl p-3 min-h-32 select-all">
          {filas ? texto : "Cargando…"}
        </pre>
      )}

      {copia === "fallo" && (
        <p role="alert" className="mt-2 text-xs text-aviso">
          No se pudo copiar automáticamente. Mantén presionado el texto, selecciónalo y cópialo.
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <Boton variante="secundario" onClick={onCerrar} className="flex-1">
          Cerrar
        </Boton>
        <Boton variante="exito" onClick={copiar} disabled={!filas || filtradas.length === 0} className="flex-[2]">
          {copia === "copiado" ? "¡Copiado!" : "Copiar resumen"}
        </Boton>
      </div>
    </Modal>
  );
}
