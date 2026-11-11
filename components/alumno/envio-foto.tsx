"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Boton } from "@/components/ui/base";
import {
  enviarFotoLista,
  ERRORES_REINTENTABLES,
  INTENTOS_MAXIMOS,
  prepararFoto,
  type EtapaEnvio,
  type FotoLista,
  type ProgresoEnvio,
} from "@/lib/fotos/subir";
import {
  borrarFotoPendiente,
  guardarFotoPendiente,
  leerFotoPendiente,
  pendienteVigente,
} from "@/lib/fotos/pendiente";
import {
  ERRORES_QUE_CAMBIAN_LA_SEMANA,
  ERRORES_QUE_DESCARTAN_LA_FOTO,
  ESPERANDO_SENAL,
  ETAPAS_ENVIO,
  MENSAJE_FOTO_ILEGIBLE,
  MENSAJES_ERROR,
} from "@/lib/alumno/mensajes";
import { formatearDiaHora } from "@/lib/utils/timeHelpers";
import { ConsejosFoto } from "./consejos-foto";

interface Props {
  codigo: string;
  /** Semana del formulario: la foto guardada solo se ofrece en la misma semana */
  semana: number;
  /** La semana anterior fue rechazada y esta es una nueva foto */
  esReenvio: boolean;
  onEnviado: (semana: number) => void;
  /** Vuelve a consultar el estado de la semana (si cambió mientras elegía la foto) */
  onActualizar: () => void;
}

const PASOS: EtapaEnvio[] = ["preparando", "subiendo", "confirmando"];

/** Sin señal, cada cuánto se vuelve a intentar solo (además de cuando vuelve la conexión) */
const ESPERA_ENTRE_RONDAS_MS = 30_000;

/**
 * Tomar o elegir la foto, verla antes de enviarla y subirla.
 * Sin `capture`: el celular ofrece cámara o galería, para quien la toma en misa
 * sin señal y la sube después (la fecha EXIF y la huella ayudan a detectar fotos viejas).
 * Si se cae la señal, la foto queda guardada en el celular (lib/fotos/pendiente.ts) y se
 * vuelve a intentar sola; al abrir la app otra vez, se ofrece enviarla.
 */
export function EnvioFoto({ codigo, semana, esReenvio, onEnviado, onActualizar }: Props) {
  const [foto, setFoto] = useState<File | null>(null);
  const [lista, setLista] = useState<FotoLista | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  /** Cuándo se guardó en el celular la foto que se recuperó al abrir la app */
  const [recuperada, setRecuperada] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<EtapaEnvio | null>(null);
  const [intento, setIntento] = useState(1);
  const [error, setError] = useState<{ texto: string; semanaCambio: boolean } | null>(null);
  const [espera, setEspera] = useState<{ sinSenal: boolean; guardada: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progresoRef = useRef<ProgresoEnvio | null>(null);
  const guardadaEnRef = useRef<string | null>(null);
  const enviandoRef = useRef(false);
  const eligioRef = useRef(false);
  const enviando = etapa !== null;

  // Liberar la URL temporal de la vista previa al cambiar de foto o salir
  useEffect(() => {
    return () => {
      if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  // Al abrir: ¿quedó una foto sin enviar de este alumno y esta semana?
  useEffect(() => {
    let vigente = true;
    leerFotoPendiente().then((pendiente) => {
      if (!vigente || !pendiente || eligioRef.current) return;
      if (!pendienteVigente(pendiente, codigo, semana)) {
        borrarFotoPendiente();
        return;
      }
      progresoRef.current = pendiente.progreso;
      guardadaEnRef.current = pendiente.guardadaEn;
      setLista(pendiente.foto);
      setVistaPrevia(URL.createObjectURL(pendiente.foto.blob));
      setRecuperada(pendiente.guardadaEn);
    });
    return () => {
      vigente = false;
    };
  }, [codigo, semana]);

  /** Olvida la foto anterior, la de la pantalla y la guardada */
  const olvidarFoto = () => {
    eligioRef.current = true;
    progresoRef.current = null;
    guardadaEnRef.current = null;
    setLista(null);
    setRecuperada(null);
    setEspera(null);
    setError(null);
    borrarFotoPendiente();
  };

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    olvidarFoto();
    setFoto(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  };

  const cambiarFoto = () => {
    olvidarFoto();
    setFoto(null);
    setVistaPrevia(null);
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  };

  const enviar = async () => {
    if (enviandoRef.current || (!foto && !lista)) return;
    enviandoRef.current = true;
    setError(null);
    setEspera(null);
    setEtapa("preparando");
    setIntento(1);

    try {
      const preparada = lista ?? (foto ? await prepararFoto(foto) : null);
      if (!preparada) return;
      setLista(preparada);
      guardadaEnRef.current ??= new Date().toISOString();

      // Se guarda antes de subirla: si la app se cierra a medio camino, la foto no se pierde
      const pendiente = { codigo, semana, foto: preparada, guardadaEn: guardadaEnRef.current };
      const guardada = await guardarFotoPendiente({ ...pendiente, progreso: progresoRef.current });

      const resultado = await enviarFotoLista(codigo, preparada, {
        progreso: progresoRef.current,
        alAvanzar: (nueva, numero) => {
          setEtapa(nueva);
          setIntento(numero);
        },
        alProgresar: (progreso) => {
          progresoRef.current = progreso;
          if (guardada && progreso) guardarFotoPendiente({ ...pendiente, progreso });
        },
      });

      if (resultado.ok) {
        progresoRef.current = null;
        await borrarFotoPendiente();
        onEnviado(resultado.semana);
        return;
      }

      progresoRef.current = resultado.progreso;
      if (ERRORES_REINTENTABLES.includes(resultado.error)) {
        // Se acabaron los reintentos: queda esperando la señal
        setEspera({ sinSenal: resultado.error !== "error_interno", guardada });
        return;
      }
      if (ERRORES_QUE_DESCARTAN_LA_FOTO.includes(resultado.error)) {
        progresoRef.current = null;
        borrarFotoPendiente();
      }
      setError({
        texto: MENSAJES_ERROR[resultado.error],
        semanaCambio: ERRORES_QUE_CAMBIAN_LA_SEMANA.includes(resultado.error),
      });
    } catch {
      // prepararFoto falla si el navegador no puede leer el archivo
      setError({ texto: MENSAJE_FOTO_ILEGIBLE, semanaCambio: false });
    } finally {
      enviandoRef.current = false;
      setEtapa(null);
    }
  };

  // Mientras espera la señal: reintenta al volver la conexión, al volver a la app y cada 30 s
  const reintentarSolo = useEffectEvent(() => {
    if (document.visibilityState === "visible") enviar();
  });
  useEffect(() => {
    if (!espera) return;
    const alCambiar = () => reintentarSolo();
    window.addEventListener("online", alCambiar);
    document.addEventListener("visibilitychange", alCambiar);
    const intervalo = setInterval(alCambiar, ESPERA_ENTRE_RONDAS_MS);
    return () => {
      window.removeEventListener("online", alCambiar);
      document.removeEventListener("visibilitychange", alCambiar);
      clearInterval(intervalo);
    };
  }, [espera]);

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

      {espera && !enviando && (
        <div role="status" className="mb-4 p-3 rounded-xl bg-aviso/10 border border-aviso/25 animate-fade-in-scale">
          <p className="text-sm font-semibold text-aviso">{espera.sinSenal ? ESPERANDO_SENAL.sinSenal : ESPERANDO_SENAL.servidor}</p>
          <p className="mt-1 text-sm text-texto-suave">
            {espera.guardada ? ESPERANDO_SENAL.guardada : ESPERANDO_SENAL.sinGuardar}
          </p>
        </div>
      )}

      {recuperada && !espera && !enviando && (
        <p role="status" className="mb-3 p-3 rounded-xl bg-info/10 border border-info/25 text-sm text-info">
          {/* La hora termina en "a. m." o "p. m.": sin otro punto */}
          Tienes una foto sin enviar del {formatearDiaHora(recuperada)} Envíala o elige otra.
        </p>
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
              {recuperada ? "Elegir otra" : "Cambiar foto"}
            </button>
          )}
        </div>
      ) : (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full mb-2 py-6 rounded-xl border-2 border-dashed border-borde hover:border-marca/50
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
          <ConsejosFoto />
        </>
      )}

      <Boton variante="exito" onClick={enviar} disabled={(!foto && !lista) || enviando} className="w-full">
        {enviando ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            {ETAPAS_ENVIO[etapa]}
          </>
        ) : espera ? (
          "Reintentar ahora"
        ) : recuperada ? (
          "Enviar esta foto"
        ) : (
          "Enviar foto"
        )}
      </Boton>

      {/* Avance en tres pasos, para que no parezca colgado con poca señal (el texto va en el botón) */}
      {enviando && (
        <>
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
          {intento > 1 && (
            <p className="mt-2 text-xs text-texto-tenue text-center" aria-live="polite">
              Señal débil: reintentando ({intento} de {INTENTOS_MAXIMOS})
            </p>
          )}
        </>
      )}
    </div>
  );
}
