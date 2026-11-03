"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mensajeDe } from "@/lib/staff/errores";
import { NOMBRE_PROGRAMA } from "@/lib/staff/reporte";
import { armarResumen, FALTAS_PARA_ALERTA, obtenerResumen, textoEspera, type Resumen } from "@/lib/staff/resumen-admin";
import { formatearFecha } from "@/lib/utils/timeHelpers";
import { Cargando, Mensaje, Tarjeta } from "@/components/ui/base";

const enlaceComunidad = (id: number) => `/dashboard/comunidad?comunidad=${id}`;
const CLASE_ENLACE = "text-xs font-medium text-marca underline-offset-4 hover:underline";

/** Cómo va la pastoral de un vistazo: misa, catequesis, fotos por revisar y a quién hay que buscar */
export function SeccionResumen() {
  // undefined mientras carga; null si no hay ciclo activo
  const [datos, setDatos] = useState<{ resumen: Resumen | null; ahora: Date } | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    obtenerResumen()
      .then((respuesta) => {
        if (!cancelado) setDatos({ resumen: respuesta && armarResumen(respuesta), ahora: new Date() });
      })
      .catch((e) => {
        if (!cancelado) setError(mensajeDe(e, "No se pudo cargar el resumen."));
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (error) return <Mensaje mensaje={{ tipo: "error", texto: error }} />;
  if (!datos) return <Cargando />;
  const { resumen, ahora } = datos;
  if (!resumen) {
    return (
      <Tarjeta titulo="No hay un ciclo activo">
        <p className="text-sm text-texto-suave">Activa un ciclo en la pestaña Ciclo para ver el resumen.</p>
      </Tarjeta>
    );
  }

  const { cerrada, enCurso, porRevisar } = resumen;
  const avisos = resumen.alejandose.length + resumen.sinGuia.length + (resumen.iglesiasSinHorario > 0 ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metrica
          etiqueta={cerrada ? `Misa · semana ${cerrada.semana}` : "Misa"}
          valor={cerrada?.porcentaje != null ? `${cerrada.porcentaje}%` : "—"}
          detalle={
            !cerrada
              ? "Aún no hay semanas cerradas"
              : cerrada.diferencia === null
                ? `Domingo ${formatearFecha(cerrada.domingo)}`
                : cerrada.diferencia === 0
                  ? "Igual que la anterior"
                  : `${cerrada.diferencia > 0 ? "↑" : "↓"} ${Math.abs(cerrada.diferencia)} puntos vs. la anterior`
          }
          tono={cerrada?.diferencia ? (cerrada.diferencia > 0 ? "exito" : "error") : undefined}
        />
        <Metrica
          etiqueta={enCurso ? `Semana ${enCurso.semana} · en curso` : "Semana en curso"}
          valor={enCurso ? `${enCurso.conFoto}/${enCurso.activos}` : "—"}
          detalle={enCurso ? "ya enviaron su foto" : "Abre el sábado a las 7 p. m."}
        />
        <Metrica
          etiqueta="Fotos por revisar"
          valor={String(porRevisar.total)}
          detalle={
            porRevisar.mayor
              ? `${porRevisar.mayor.cantidad} en ${porRevisar.mayor.nombre}${porRevisar.mayor.desde ? `, ${textoEspera(porRevisar.mayor.desde, ahora)}` : ""}`
              : "Todo revisado"
          }
          tono={porRevisar.total > 0 ? "aviso" : "exito"}
        />
        <Metrica
          etiqueta="Catequesis · ciclo"
          valor={resumen.catequesis !== null ? `${resumen.catequesis}%` : "—"}
          detalle="La tardanza cuenta como asistencia"
        />
      </div>

      <Tarjeta
        titulo="Por comunidad"
        descripcion={`Misa ${cerrada ? `de la semana ${cerrada.semana} ` : ""}y del ciclo, y catequesis del ciclo. Igual que el Excel: las justificadas y las fotos en revisión no cuentan.`}
      >
        {resumen.comunidades.length === 0 ? (
          <p className="text-sm text-texto-tenue">Todavía no hay comunidades activas en este ciclo.</p>
        ) : (
          <ul>
            {resumen.comunidades.map((c) => (
              <li key={c.id} className="py-3 border-t border-borde first:border-t-0 first:pt-0 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-texto break-words">{c.nombre}</p>
                    <p className="text-xs text-texto-tenue">
                      {NOMBRE_PROGRAMA[c.programa]} · {c.activos} {c.activos === 1 ? "alumno" : "alumnos"}
                    </p>
                  </div>
                  <Link href={enlaceComunidad(c.id)} className={`${CLASE_ENLACE} shrink-0`}>
                    Ver asistencia
                  </Link>
                </div>
                <Barra
                  etiqueta={cerrada ? `Misa de la semana ${cerrada.semana} en ${c.nombre}` : `Misa en ${c.nombre}`}
                  valor={c.semana}
                />
                <p className="text-xs text-texto-suave">
                  Ciclo: {c.ciclo !== null ? `${c.ciclo}%` : "—"} · Catequesis: {c.catequesis !== null ? `${c.catequesis}%` : "—"}
                </p>
                {c.porRevisar > 0 && (
                  <p className="text-xs text-aviso">
                    {c.porRevisar} {c.porRevisar === 1 ? "foto por revisar" : "fotos por revisar"}
                    {c.esperandoDesde && `, la más antigua ${textoEspera(c.esperandoDesde, ahora)}`}
                  </p>
                )}
                {c.guias === 0 && <p className="text-xs text-error">Sin guía asignado</p>}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta
        titulo={avisos > 0 ? `Necesitan atención (${avisos})` : "Necesitan atención"}
        descripcion={`Alumnos con ${FALTAS_PARA_ALERTA} o más faltas seguidas (las justificadas no cuentan) y lo que falta configurar.`}
      >
        {avisos === 0 ? (
          <p className="text-sm text-exito">Todo en orden: nadie se está alejando y no falta configurar nada.</p>
        ) : (
          <ul className="divide-y divide-borde">
            {resumen.alejandose.map((a) => (
              <li key={a.alumno_id} className="py-2.5 first:pt-0 flex items-start justify-between gap-3">
                <p className="text-sm text-texto min-w-0 break-words">
                  {a.nombre} <span className="text-texto-tenue">· {a.comunidad}</span>
                  <span className="block text-xs text-aviso">{a.faltas_seguidas} faltas seguidas</span>
                </p>
                <Link href={enlaceComunidad(a.comunidad_id)} className={`${CLASE_ENLACE} shrink-0`}>
                  Ver
                </Link>
              </li>
            ))}
            {resumen.sinGuia.map((c) => (
              <li key={`guia-${c.id}`} className="py-2.5 first:pt-0 text-sm text-texto">
                {c.nombre} ({NOMBRE_PROGRAMA[c.programa]}) no tiene guía
                <span className="block text-xs text-texto-tenue">Asígnalo en la pestaña Staff.</span>
              </li>
            ))}
            {resumen.iglesiasSinHorario > 0 && (
              <li className="py-2.5 first:pt-0 text-sm text-texto">
                {resumen.iglesiasSinHorario}{" "}
                {resumen.iglesiasSinHorario === 1 ? "iglesia no tiene" : "iglesias no tienen"} horario de misa
                <span className="block text-xs text-texto-tenue">
                  {resumen.iglesiasSinHorario === 1
                    ? "No sale en la página de misas. Complétala en la pestaña Misas."
                    : "No salen en la página de misas. Complétalas en la pestaña Misas."}
                </span>
              </li>
            )}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Asistencia a misa por semana" descripcion="Solo las semanas ya cerradas.">
        {resumen.tendencia.length === 0 ? (
          <p className="text-sm text-texto-tenue">Todavía no hay semanas cerradas.</p>
        ) : (
          <>
            <div aria-hidden="true" className="flex items-end gap-0.5 sm:gap-1 h-28 border-b border-borde">
              {resumen.tendencia.map((t, i) => (
                <div
                  key={t.semana}
                  title={`Semana ${t.semana} (${formatearFecha(t.domingo)}): ${t.porcentaje ?? 0}%`}
                  className={`flex-1 min-w-0.5 rounded-t ${i === resumen.tendencia.length - 1 ? "bg-marca-solido" : "bg-marca-solido/50"}`}
                  style={{ height: `${Math.max(t.porcentaje ?? 0, 2)}%` }}
                />
              ))}
            </div>
            <div aria-hidden="true" className="mt-1 flex justify-between text-xs text-texto-tenue">
              <span>Semana {resumen.tendencia[0].semana}</span>
              <span>Semana {resumen.tendencia[resumen.tendencia.length - 1].semana}</span>
            </div>
            <ol className="sr-only">
              {resumen.tendencia.map((t) => (
                <li key={t.semana}>
                  Semana {t.semana}: {t.porcentaje ?? 0}%
                </li>
              ))}
            </ol>
          </>
        )}
      </Tarjeta>
    </div>
  );
}

const TONOS = { exito: "text-exito", aviso: "text-aviso", error: "text-error" } as const;

function Metrica({
  etiqueta,
  valor,
  detalle,
  tono,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  tono?: keyof typeof TONOS;
}) {
  return (
    <div className="tarjeta p-4 animate-fade-in">
      <p className="text-xs text-texto-tenue">{etiqueta}</p>
      <p className="mt-1 text-2xl font-bold text-texto tabular-nums">{valor}</p>
      <p className={`mt-1 text-xs ${tono ? TONOS[tono] : "text-texto-suave"}`}>{detalle}</p>
    </div>
  );
}

function Barra({ etiqueta, valor }: { etiqueta: string; valor: number | null }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 h-2 rounded-full bg-superficie-2 overflow-hidden"
        role="progressbar"
        aria-label={etiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor ?? undefined}
        aria-valuetext={valor === null ? "Sin datos" : `${valor}%`}
      >
        <div className="h-full rounded-full bg-marca-solido" style={{ width: `${valor ?? 0}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-texto tabular-nums">{valor === null ? "—" : `${valor}%`}</span>
    </div>
  );
}
