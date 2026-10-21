"use client";

import { useEffect, useRef, useState } from "react";
import { Boton } from "@/components/ui/base";
import { enviarFoto, type EtapaEnvio } from "@/lib/fotos/subir";
import {
  ERRORES_QUE_CAMBIAN_LA_SEMANA,
  ETAPAS_ENVIO,
  MENSAJE_FOTO_ILEGIBLE,
  MENSAJES_ERROR,
} from "@/lib/alumno/mensajes";

interface Props {
  codigo: string;
  /** La semana anterior fue rechazada y esta es una nueva foto */
  esReenvio: boolean;
  onEnviado: (semana: number) => void;
  /** Vuelve a consultar el estado de la semana (si cambió mientras elegía la foto) */
  onActualizar: () => void;
}

const PASOS: EtapaEnvio[] = ["preparando", "subiendo", "confirmando"];

/**
 * Tomar o elegir la foto, verla antes de enviarla y subirla.
 * Sin `capture`: el celular ofrece cámara o galería, para quien la toma en misa
 * sin señal y la sube después (la fecha EXIF y la huella ayudan a detectar fotos viejas).
 */
export function EnvioFoto({ codigo, esReenvio, onEnviado, onActualizar }: Props) {
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<EtapaEnvio | null>(null);
  const [error, setError] = useState<{ texto: string; semanaCambio: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const enviando = etapa !== null;

  // Liberar la URL temporal de la vista previa al cambiar de foto o salir
  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setFoto(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
    setError(null);
  };

  const cambiarFoto = () => {
    setFoto(null);
    setVistaPrevia(null);
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const enviar = async () => {
    if (!foto) return;
    setError(null);

    try {
      const resultado = await enviarFoto(codigo, foto, setEtapa);
      if (resultado.ok) {
        onEnviado(resultado.semana);
        return;
      }
      setError({
        texto: MENSAJES_ERROR[resultado.error],
        semanaCambio: ERRORES_QUE_CAMBIAN_LA_SEMANA.includes(resultado.error),
      });
    } catch {
      // procesarFoto falla si el navegador no puede leer el archivo
      setError({ texto: MENSAJE_FOTO_ILEGIBLE, semanaCambio: false });
    } finally {
      setEtapa(null);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={elegirFoto} className="hidden" />

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-xl bg-error/10 border border-error/25 animate-fade-in-scale">
          <p className="text-sm text-error text-center">{error.texto}</p>
          {/* La semana cambió (ya hay foto, se cerró…): ver cómo quedó en vez de reintentar */}
          {error.semanaCambio && (
            <Boton variante="secundario" tamano="pequeno" onClick={onActualizar} className="mt-3 w-full">
              Ver cómo está mi semana
            </Boton>
          )}
        </div>
      )}

      {vistaPrevia ? (
        <div className="relative mb-4 rounded-xl overflow-hidden border border-borde bg-superficie-2 animate-fade-in-scale">
          {/* URL blob local: next/image no aplica. object-contain: se ve la foto completa */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vistaPrevia} alt="Vista previa de tu foto" className="w-full max-h-96 object-contain" />
          {!enviando && (
            <button
              onClick={cambiarFoto}
              className="absolute top-2 right-2 min-h-11 px-4 rounded-xl bg-black/60 hover:bg-black/75 text-white text-sm font-medium"
            >
              Cambiar foto
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full mb-4 py-10 rounded-xl border-2 border-dashed border-borde hover:border-marca/50
                     text-texto-suave hover:text-texto transition-all flex flex-col items-center gap-2"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
          <span className="text-sm font-medium">{esReenvio ? "Tomar o elegir otra foto" : "Tomar o elegir foto"}</span>
        </button>
      )}

      <Boton variante="exito" onClick={enviar} disabled={!foto || enviando} className="w-full">
        {enviando ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            {ETAPAS_ENVIO[etapa]}
          </>
        ) : (
          "Enviar foto"
        )}
      </Boton>

      {/* Avance en tres pasos, para que no parezca colgado con poca señal (el texto va en el botón) */}
      {enviando && (
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {PASOS.map((paso, i) => (
            <span
              key={paso}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= PASOS.indexOf(etapa) ? "bg-exito-solido" : "bg-borde"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
