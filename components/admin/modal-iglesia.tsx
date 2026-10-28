"use client";

import { useState } from "react";
import { mensajeDe } from "@/lib/staff/errores";
import { formatearMisas } from "@/lib/misas/horarios";
import { guardarIglesia, type IglesiaAdmin } from "@/lib/misas/iglesias";
import { DISTRITOS, validarIglesia, type CamposIglesia } from "@/lib/misas/importacion";
import { formatearUbicacion, parsearUbicacion } from "@/lib/misas/ubicacion";
import { Boton, Campo, claseInput } from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";

interface Props {
  /** null: iglesia nueva */
  iglesia: IglesiaAdmin | null;
  onCerrar: () => void;
  onGuardada: (nombre: string) => void;
}

function camposDe(iglesia: IglesiaAdmin | null): CamposIglesia {
  if (!iglesia) return { nombre: "", distrito: "", direccion: "", ubicacion: "", telefono: "", misas: "", notas: "" };
  return {
    nombre: iglesia.nombre,
    distrito: iglesia.distrito,
    direccion: iglesia.direccion,
    ubicacion: formatearUbicacion(iglesia),
    telefono: iglesia.telefono ?? "",
    misas: formatearMisas(iglesia.misas),
    notas: iglesia.notas ?? "",
  };
}

/** Crear o corregir una iglesia: al guardar se reemplazan sus misas y queda revisada hoy */
export function ModalIglesia({ iglesia, onCerrar, onGuardada }: Props) {
  const [campos, setCampos] = useState<CamposIglesia>(() => camposDe(iglesia));
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const { datos, errores } = validarIglesia(campos);
  const ubicacion = parsearUbicacion(campos.ubicacion);
  const cambiar = (campo: keyof CamposIglesia) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setCampos((prev) => ({ ...prev, [campo]: e.target.value }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!datos) return;
    setGuardando(true);
    setError("");
    try {
      await guardarIglesia(iglesia?.id ?? null, datos);
      onGuardada(datos.nombre);
    } catch (err) {
      setError(mensajeDe(err, "No se pudo guardar la iglesia."));
      setGuardando(false);
    }
  };

  return (
    <Modal titulo={iglesia ? "Editar iglesia" : "Nueva iglesia"} onCerrar={onCerrar} bloqueado={guardando} tamano="md">
      <form onSubmit={guardar} className="mt-4 space-y-4">
        <Campo etiqueta="Nombre">
          <input value={campos.nombre} onChange={cambiar("nombre")} required maxLength={120} data-autofocus className={claseInput} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Distrito">
            <select value={campos.distrito} onChange={cambiar("distrito")} required className={`${claseInput} cursor-pointer`}>
              <option value="" disabled>
                Elige el distrito
              </option>
              {DISTRITOS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Teléfono (opcional)">
            <input value={campos.telefono} onChange={cambiar("telefono")} maxLength={40} inputMode="tel" className={claseInput} />
          </Campo>
        </div>

        <Campo etiqueta="Dirección">
          <input value={campos.direccion} onChange={cambiar("direccion")} maxLength={200} className={claseInput} />
        </Campo>

        <Campo
          etiqueta="Ubicación"
          ayuda="En Google Maps, haz clic derecho sobre la iglesia y toca las coordenadas para copiarlas."
        >
          <input
            value={campos.ubicacion}
            onChange={cambiar("ubicacion")}
            placeholder="-8.1116, -79.0287"
            inputMode="decimal"
            className={claseInput}
          />
        </Campo>
        {!("error" in ubicacion) && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${ubicacion.latitud},${ubicacion.longitud}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-xs text-marca underline underline-offset-4"
          >
            Comprobar la ubicación en Google Maps
          </a>
        )}

        <Campo etiqueta="Misas" ayuda="Ej.: Sáb 19:00; Dom 7:00, 9:00 y 11:00. Solo el sábado desde las 17:00 y el domingo.">
          <input value={campos.misas} onChange={cambiar("misas")} placeholder="Sáb 19:00; Dom 8:00 y 11:00" className={claseInput} />
        </Campo>
        {datos && datos.misas.length > 0 && (
          <p className="text-xs text-texto-suave">Se guardará: {formatearMisas(datos.misas)}</p>
        )}
        {datos && datos.misas.length === 0 && (
          <p className="text-xs text-aviso">Sin misas, la iglesia no sale en la página pública.</p>
        )}

        <Campo etiqueta="Notas (opcional)" ayuda="Las ve el público, p. ej. «Misa de jóvenes el domingo a las 19:00».">
          <textarea value={campos.notas} onChange={cambiar("notas")} maxLength={300} rows={2} className={`${claseInput} resize-none`} />
        </Campo>

        {intento && errores.length > 0 && (
          <ul role="alert" className="text-sm text-error list-disc pl-5 space-y-1">
            {errores.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <p className="text-xs text-texto-tenue">Al guardar, la iglesia queda como revisada hoy.</p>
        <div className="flex gap-3">
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando} className="flex-1">
            Cancelar
          </Boton>
          <Boton type="submit" disabled={guardando} className="flex-[2]">
            {guardando ? "Guardando…" : "Guardar"}
          </Boton>
        </div>
      </form>
    </Modal>
  );
}
