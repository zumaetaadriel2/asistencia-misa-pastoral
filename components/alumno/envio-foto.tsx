"use client";

import { useEffect, useRef, useState } from "react";
import { enviarFoto } from "@/lib/fotos/subir";
import { MENSAJE_FOTO_ILEGIBLE, MENSAJES_ERROR } from "@/lib/alumno/mensajes";

interface Props {
  codigo: string;
  /** La semana anterior fue rechazada y esta es una nueva foto */
  esReenvio: boolean;
  onEnviado: (semana: number) => void;
}

/** Tomar la foto, verla antes de enviarla y subirla */
export function EnvioFoto({ codigo, esReenvio, onEnviado }: Props) {
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
    setError("");
  };

  const quitarFoto = () => {
    setFoto(null);
    setVistaPrevia(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const enviar = async () => {
    if (!foto) return;
    setEnviando(true);
    setError("");

    try {
      const resultado = await enviarFoto(codigo, foto);
      if (resultado.ok) {
        onEnviado(resultado.semana);
        return;
      }
      setError(MENSAJES_ERROR[resultado.error]);
    } catch {
      // procesarFoto falla si el navegador no puede leer el archivo
      setError(MENSAJE_FOTO_ILEGIBLE);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={elegirFoto}
        className="hidden"
      />

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in-scale">
          <p className="text-sm text-rose-300 text-center">{error}</p>
        </div>
      )}

      {vistaPrevia ? (
        <div className="relative mb-4 rounded-xl overflow-hidden border border-white/10 animate-fade-in-scale">
          {/* URL blob local: next/image no aplica */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={vistaPrevia} alt="Vista previa de tu foto" className="w-full max-h-80 object-cover" />
          {!enviando && (
            <button
              onClick={quitarFoto}
              className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-black/60 text-white/80 text-xs font-medium"
            >
              Cambiar
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full mb-4 py-10 rounded-xl border-2 border-dashed border-white/15 hover:border-primary-500/50
                     text-white/50 hover:text-white/80 transition-all flex flex-col items-center gap-2"
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
          </svg>
          <span className="text-sm font-medium">{esReenvio ? "Tomar una nueva foto" : "Tomar foto"}</span>
        </button>
      )}

      <button
        onClick={enviar}
        disabled={!foto || enviando}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30
                   disabled:cursor-not-allowed text-white text-sm font-semibold transition-all
                   flex items-center justify-center gap-2"
      >
        {enviando ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Enviando…
          </>
        ) : (
          "Enviar foto"
        )}
      </button>
    </div>
  );
}
