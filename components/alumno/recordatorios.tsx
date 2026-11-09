"use client";

import Link from "next/link";
import { Boton, claseDeBoton } from "@/components/ui/base";
import { IconoCampana } from "@/components/ui/icono-campana";
import { useAvisos } from "@/lib/push/avisos";

/** Para no olvidarse: avisos en el celular y un recordatorio semanal en su calendario */
export function Recordatorios({ codigo }: { codigo: string }) {
  const { estado, ocupado, fallo, activar, desactivar } = useAvisos({ tipo: "alumno", codigo });

  return (
    <section className="tarjeta p-5 animate-fade-in delay-300 space-y-3">
      <h2 className="text-sm font-semibold text-texto">Recordatorios</h2>

      {estado === "desactivados" && (
        <Boton variante="secundario" onClick={activar} disabled={ocupado} className="w-full">
          <IconoCampana />
          {ocupado ? "Activando…" : "Avisarme el sábado y si me falta la foto"}
        </Boton>
      )}

      {estado === "activados" && (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-exito">
            Avisos activados: el sábado a las 7 p. m. y, si te falta la foto, el domingo y el lunes.
          </p>
          <Boton variante="fantasma" tamano="pequeno" onClick={desactivar} disabled={ocupado} className="shrink-0">
            Desactivar
          </Boton>
        </div>
      )}

      {estado === "instalar" && (
        <p className="text-sm text-texto-suave">
          En iPhone, los avisos funcionan con la app instalada.{" "}
          <Link href="/instalar" className="font-semibold text-marca underline underline-offset-4">
            Cómo instalarla
          </Link>
        </p>
      )}

      {estado === "bloqueados" && (
        <p className="text-sm text-texto-suave">
          Tu celular tiene bloqueados los avisos de esta app. Puedes permitirlos en los ajustes del navegador.
        </p>
      )}

      {fallo && (
        <p role="alert" className="text-sm text-error">
          No se pudo cambiar los avisos. Revisa tu señal e inténtalo otra vez.
        </p>
      )}

      {/* Archivo .ics: el iPhone lo abre en «Agregar al calendario» y Android en su calendario */}
      <a href="/recordatorio-misa.ics" className={`${claseDeBoton("secundario")} w-full`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008Z"
          />
        </svg>
        Agregar al calendario
      </a>
      <p className="text-xs text-texto-tenue">El calendario te recuerda cada sábado a las 7 p. m., cuando ya puedes subir tu foto.</p>
    </section>
  );
}
