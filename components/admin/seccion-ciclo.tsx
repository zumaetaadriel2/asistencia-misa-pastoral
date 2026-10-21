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
import { Boton, Campo, Cargando, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";

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
      <Campo etiqueta="Nombre">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className={claseInput} />
      </Campo>
      <Campo etiqueta="Inicio" ayuda="La semana 1 es la del primer domingo desde esta fecha.">
        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required className={claseInput} />
      </Campo>
      <Campo etiqueta="Fin">
        <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} required className={claseInput} />
      </Campo>
      <div className="sm:col-span-3">
        <Boton type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Boton>
      </div>
    </form>
  );
}

export function SeccionCiclo() {
  const [ciclos, setCiclos] = useState<Ciclo[] | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", anio: new Date().getFullYear() + 1, inicio: "", fin: "" });
  // Qué acción está en curso, para no mandarla dos veces
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { confirmar, dialogoConfirmar } = useConfirmar();

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
    setOcupado("formulario");
    try {
      await actualizarCiclo(activo.id, { abierto_manual: valor });
      setMensaje({ tipo: "ok", texto: "Estado del formulario actualizado." });
      recargar();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo cambiar el formulario.") });
    } finally {
      setOcupado(null);
    }
  };

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setOcupado("crear");
    try {
      await crearCiclo({ nombre: nuevo.nombre.trim(), anio: nuevo.anio, fecha_inicio: nuevo.inicio, fecha_fin: nuevo.fin });
      setMensaje({ tipo: "ok", texto: `Ciclo "${nuevo.nombre}" creado (inactivo). Actívalo cuando empiece el año.` });
      setNuevo({ nombre: "", anio: nuevo.anio, inicio: "", fin: "" });
      recargar();
    } catch (error) {
      setMensaje({ tipo: "error", texto: mensajeDe(error, "No se pudo crear el ciclo.") });
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async (destino: Ciclo) => {
    if (!activo) return;
    const seguro = await confirmar({
      titulo: `¿Copiar las comunidades a "${destino.nombre}"?`,
      mensaje: `Se copian las comunidades activas de "${activo.nombre}" con sus guías. Las que ya existan no se duplican.`,
      aceptar: "Copiar",
    });
    if (!seguro) return;
    setOcupado(`copiar-${destino.id}`);
    try {
      const creadas = await copiarComunidades(activo.id, destino.id);
      setMensaje({ tipo: "ok", texto: `Se copiaron ${creadas} comunidades (con sus guías) a "${destino.nombre}".` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudieron copiar las comunidades.") });
    } finally {
      setOcupado(null);
    }
  };

  const activar = async (ciclo: Ciclo) => {
    const seguro = await confirmar({
      titulo: `¿Activar "${ciclo.nombre}"?`,
      mensaje: "El ciclo actual dejará de recibir fotos y los alumnos usarán los códigos del nuevo ciclo.",
      aceptar: "Sí, activar",
      peligro: true,
    });
    if (!seguro) return;
    setOcupado(`activar-${ciclo.id}`);
    try {
      await activarCiclo(ciclo.id);
      window.location.reload();
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo activar el ciclo.") });
      setOcupado(null);
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
              {ESTADOS_FORMULARIO.map((opcion) => {
                const elegida = activo.abierto_manual === opcion.valor;
                return (
                  <button
                    key={String(opcion.valor)}
                    onClick={() => cambiarFormulario(opcion.valor)}
                    disabled={ocupado === "formulario"}
                    aria-pressed={elegida}
                    className={`p-3 rounded-xl border-2 text-left transition-all disabled:opacity-60 ${
                      elegida ? "bg-marca/15 border-marca text-texto" : "bg-superficie-2 border-borde text-texto-suave hover:text-texto"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                      {opcion.texto}
                      {elegida && <span className="text-xs font-semibold text-marca">✓ Actual</span>}
                    </span>
                    <span className="block text-xs text-texto-tenue">{opcion.detalle}</span>
                  </button>
                );
              })}
            </div>
          </Tarjeta>
        </>
      ) : (
        <Mensaje mensaje={{ tipo: "error", texto: "No hay un ciclo activo: crea uno y actívalo." }} />
      )}

      <Tarjeta titulo="Nuevo ciclo" descripcion="Para el año siguiente. Se crea inactivo.">
        <form onSubmit={crear} className="grid gap-3 sm:grid-cols-4">
          <Campo etiqueta="Nombre">
            <input
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              required
              placeholder={`Ciclo ${nuevo.anio}`}
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Año">
            <input
              type="number"
              value={nuevo.anio}
              onChange={(e) => setNuevo({ ...nuevo, anio: Number(e.target.value) })}
              required
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Inicio">
            <input
              type="date"
              value={nuevo.inicio}
              onChange={(e) => setNuevo({ ...nuevo, inicio: e.target.value })}
              required
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Fin">
            <input
              type="date"
              value={nuevo.fin}
              onChange={(e) => setNuevo({ ...nuevo, fin: e.target.value })}
              required
              className={claseInput}
            />
          </Campo>
          <div className="sm:col-span-4">
            <Boton type="submit" disabled={ocupado === "crear"}>
              {ocupado === "crear" ? "Creando…" : "Crear ciclo"}
            </Boton>
          </div>
        </form>
      </Tarjeta>

      {otros.length > 0 && (
        <Tarjeta titulo="Otros ciclos">
          <ul className="divide-y divide-borde">
            {otros.map((ciclo) => (
              <li key={ciclo.id} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm text-texto-suave">
                <span>
                  {ciclo.nombre} <span className="text-xs text-texto-tenue">({ciclo.fecha_inicio} → {ciclo.fecha_fin})</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {activo && (
                    <Boton
                      variante="secundario"
                      tamano="pequeno"
                      onClick={() => copiar(ciclo)}
                      disabled={ocupado !== null}
                    >
                      {ocupado === `copiar-${ciclo.id}` ? "Copiando…" : "Copiar comunidades del ciclo activo"}
                    </Boton>
                  )}
                  <Boton variante="secundario" tamano="pequeno" onClick={() => activar(ciclo)} disabled={ocupado !== null}>
                    {ocupado === `activar-${ciclo.id}` ? "Activando…" : "Activar"}
                  </Boton>
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {dialogoConfirmar}
    </div>
  );
}
