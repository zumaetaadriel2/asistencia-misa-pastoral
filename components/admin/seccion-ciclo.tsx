"use client";

import { useEffect, useState } from "react";
import {
  activarCiclo,
  actualizarCiclo,
  copiarComunidades,
  crearCiclo,
  listarCiclos,
  type Ciclo,
} from "@/lib/staff/admin";
import { mensajeDe } from "@/lib/staff/errores";
import { Cargando, claseBoton, claseBotonSecundario, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "@/components/ui/base";

const ESTADOS_FORMULARIO: { valor: boolean | null; texto: string; detalle: string }[] = [
  { valor: null, texto: "Automático", detalle: "Sáb 7 p. m. → lun 11:59 p. m." },
  { valor: true, texto: "Abierto", detalle: "Forzado (pruebas o excepciones)" },
  { valor: false, texto: "Cerrado", detalle: "Forzado" },
];

/** Datos del ciclo activo; se monta de nuevo (key) cuando cambia el ciclo */
function FormularioCiclo({ ciclo, onGuardado }: { ciclo: Ciclo; onGuardado: (m: MensajeAdmin) => void }) {
  const [nombre, setNombre] = useState(ciclo.nombre);
  const [inicio, setInicio] = useState(ciclo.fecha_inicio);
  const [fin, setFin] = useState(ciclo.fecha_fin);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await actualizarCiclo(ciclo.id, { nombre: nombre.trim(), fecha_inicio: inicio, fecha_fin: fin });
      onGuardado({ tipo: "ok", texto: "Ciclo actualizado. Recarga la página para ver las semanas recalculadas." });
    } catch (error) {
      onGuardado({ tipo: "error", texto: mensajeDe(error, "No se pudo guardar el ciclo.") });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-3">
      <label className="text-xs text-texto-suave">
        Nombre
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className={`mt-1 ${claseInput}`} />
      </label>
      <label className="text-xs text-texto-suave">
        Inicio (la semana 1 es el primer domingo desde esta fecha)
        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required className={`mt-1 ${claseInput}`} />
      </label>
      <label className="text-xs text-texto-suave">
        Fin
        <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required className={`mt-1 ${claseInput}`} />
      </label>
      <div className="sm:col-span-3">
        <button type="submit" disabled={guardando} className={claseBoton}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

export function SeccionCiclo() {
  const [ciclos, setCiclos] = useState<Ciclo[] | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", anio: new Date().getFullYear() + 1, inicio: "", fin: "" });

  useEffect(() => {
    let cancelado = false;
    listarCiclos()
      .then((lista) => {
        if (!cancelado) setCiclos(lista);
      })
      .catch((e) => {
        if (!cancelado) setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudieron cargar los ciclos.") });
      });
    return () => {
      cancelado = true;
    };
  }, [recargas]);

  const recargar = () => setRecargas((n) => n + 1);
  const activo = ciclos?.find((c) => c.activo) ?? null;
  const otros = ciclos?.filter((c) => !c.activo) ?? [];

  const cambiarFormulario = async (valor: boolean | null) => {
    if (!activo) return;
    try {
      await actualizarCiclo(activo.id, { abierto_manual: valor });
      setMensaje({ tipo: "ok", texto: "Estado del formulario actualizado." });
      recargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo cambiar el formulario.") });
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crearCiclo({ nombre: nuevo.nombre.trim(), anio: nuevo.anio, fecha_inicio: nuevo.inicio, fecha_fin: nuevo.fin });
      setMensaje({ tipo: "ok", texto: `Ciclo "${nuevo.nombre}" creado (inactivo). Actívalo cuando empiece el año.` });
      setNuevo({ nombre: "", anio: nuevo.anio, inicio: "", fin: "" });
      recargar();
    } catch (error) {
      setMensaje({ tipo: "error", texto: mensajeDe(error, "No se pudo crear el ciclo.") });
    }
  };

  const copiar = async (destino: Ciclo) => {
    if (!activo) return;
    try {
      const creadas = await copiarComunidades(activo.id, destino.id);
      setMensaje({ tipo: "ok", texto: `Se copiaron ${creadas} comunidades (con sus guías) a "${destino.nombre}".` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudieron copiar las comunidades.") });
    }
  };

  const activar = async (ciclo: Ciclo) => {
    const confirmado = window.confirm(
      `¿Activar "${ciclo.nombre}"? El ciclo actual dejará de recibir fotos y los alumnos usarán los códigos del nuevo ciclo.`
    );
    if (!confirmado) return;
    try {
      await activarCiclo(ciclo.id);
      window.location.reload();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo activar el ciclo.") });
    }
  };

  if (!ciclos) return <Cargando />;

  return (
    <div className="space-y-4">
      <Mensaje mensaje={mensaje} />

      {activo ? (
        <>
          <Tarjeta titulo={`Ciclo activo: ${activo.nombre}`} descripcion="Fechas del año de pastoral.">
            <FormularioCiclo key={`${activo.id}-${activo.fecha_inicio}-${activo.fecha_fin}`} ciclo={activo} onGuardado={setMensaje} />
          </Tarjeta>

          <Tarjeta titulo="Formulario de los alumnos" descripcion="Normalmente en automático. Forzarlo sirve para pruebas o una misa especial.">
            <div className="grid gap-2 sm:grid-cols-3">
              {ESTADOS_FORMULARIO.map((opcion) => (
                <button
                  key={String(opcion.valor)}
                  onClick={() => cambiarFormulario(opcion.valor)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    activo.abierto_manual === opcion.valor
                      ? "bg-marca/20 border-marca text-texto"
                      : "bg-superficie-2 border-borde text-texto-tenue hover:text-texto-suave"
                  }`}
                >
                  <span className="block text-sm font-semibold">{opcion.texto}</span>
                  <span className="block text-[11px] opacity-70">{opcion.detalle}</span>
                </button>
              ))}
            </div>
          </Tarjeta>
        </>
      ) : (
        <Mensaje mensaje={{ tipo: "error", texto: "No hay un ciclo activo: crea uno y actívalo." }} />
      )}

      <Tarjeta titulo="Nuevo ciclo" descripcion="Para el año siguiente. Se crea inactivo.">
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-4">
          <input
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            required
            placeholder={`Ciclo ${nuevo.anio}`}
            className={claseInput}
          />
          <input
            type="number"
            value={nuevo.anio}
            onChange={(e) => setNuevo({ ...nuevo, anio: Number(e.target.value) })}
            required
            className={claseInput}
          />
          <input type="date" value={nuevo.inicio} onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })} required className={claseInput} />
          <input type="date" value={nuevo.fin} onChange={(e) => setNuevo({ ...nuevo, fin: e.target.value })} required className={claseInput} />
          <div className="sm:col-span-4">
            <button type="submit" className={claseBoton}>
              Crear ciclo
            </button>
          </div>
        </form>
      </Tarjeta>

      {otros.length > 0 && (
        <Tarjeta titulo="Otros ciclos">
          <ul className="space-y-2">
            {otros.map((ciclo) => (
              <li key={ciclo.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-texto-suave">
                <span>
                  {ciclo.nombre} <span className="text-xs text-texto-tenue">({ciclo.fecha_inicio} → {ciclo.fecha_fin})</span>
                </span>
                <span className="flex gap-2">
                  {activo && (
                    <button onClick={() => copiar(ciclo)} className={claseBotonSecundario}>
                      Copiar comunidades del ciclo activo
                    </button>
                  )}
                  <button onClick={() => activar(ciclo)} className={claseBotonSecundario}>
                    Activar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}
