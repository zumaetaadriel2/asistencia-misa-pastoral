"use client";

import { useEffect, useState } from "react";
import { coincide } from "@/lib/staff/busqueda";
import { mensajeDe } from "@/lib/staff/errores";
import { descargarCsv } from "@/lib/staff/reporte";
import { formatearMisas } from "@/lib/misas/horarios";
import { borrarIglesia, cambiarIglesiaActiva, importarIglesias, listarIglesias, type IglesiaAdmin } from "@/lib/misas/iglesias";
import { armarCsvIglesias, parsearFilasIglesias, plantillaCsv } from "@/lib/misas/importacion";
import { formatearFechaConAnio, hoyEnLima } from "@/lib/utils/timeHelpers";
import { Boton, Buscador, Cargando, claseInput, Mensaje, Tarjeta, type MensajeAdmin } from "@/components/ui/base";
import { useConfirmar } from "@/components/ui/confirmar";
import { ModalIglesia } from "./modal-iglesia";

const FILTROS = {
  todas: { texto: "Todas", cumple: () => true },
  sin_misas: { texto: "Sin misas", cumple: (i: IglesiaAdmin) => i.misas.length === 0 },
  inactivas: { texto: "Inactivas", cumple: (i: IglesiaAdmin) => !i.activa },
} as const;

type Filtro = keyof typeof FILTROS;

/** Iglesias y misas de la página pública /misas: importar desde Excel y corregir una por una */
export function SeccionMisas() {
  const [iglesias, setIglesias] = useState<IglesiaAdmin[] | null>(null);
  const [recargas, setRecargas] = useState(0);
  const [mensaje, setMensaje] = useState<MensajeAdmin | null>(null);
  const [texto, setTexto] = useState("");
  const [importando, setImportando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [editando, setEditando] = useState<IglesiaAdmin | "nueva" | null>(null);
  const { confirmar, dialogoConfirmar } = useConfirmar();

  useEffect(() => {
    let cancelado = false;
    listarIglesias()
      .then((lista) => {
        if (!cancelado) setIglesias(lista);
      })
      .catch((e) => {
        if (!cancelado) setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudieron cargar las iglesias.") });
      });
    return () => {
      cancelado = true;
    };
  }, [recargas]);

  const filas = parsearFilasIglesias(texto);
  const validas = filas.filter((f) => f.datos);
  const conErrores = filas.filter((f) => !f.datos);

  const importar = async () => {
    if (conErrores.length > 0) {
      const seguro = await confirmar({
        titulo: `¿Importar ${validas.length} de ${filas.length}?`,
        mensaje: `${conErrores.length === 1 ? "Una fila tiene" : `${conErrores.length} filas tienen`} errores y no se importará${conErrores.length === 1 ? "" : "n"}. Quedarán en el cuadro para que las corrijas.`,
        aceptar: "Importar las válidas",
      });
      if (!seguro) return;
    }
    setImportando(true);
    try {
      const { creadas, actualizadas } = await importarIglesias(validas.map((f) => f.datos!));
      setMensaje({
        tipo: "ok",
        texto: `Listo: ${creadas} ${creadas === 1 ? "nueva" : "nuevas"} y ${actualizadas} ${actualizadas === 1 ? "actualizada" : "actualizadas"}.`,
      });
      // Quedan solo las filas con errores, para corregirlas ahí mismo
      const lineas = texto.split(/\r?\n/);
      setTexto(conErrores.map((f) => lineas[f.numero - 1]).join("\n"));
      setRecargas((n) => n + 1);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo importar.") });
    } finally {
      setImportando(false);
    }
  };

  const alternar = async (iglesia: IglesiaAdmin) => {
    if (iglesia.activa) {
      const seguro = await confirmar({
        titulo: `¿Desactivar «${iglesia.nombre}»?`,
        mensaje: "Dejará de salir en la página de misas. Puedes volver a activarla cuando quieras.",
        aceptar: "Desactivar",
      });
      if (!seguro) return;
    }
    try {
      await cambiarIglesiaActiva(iglesia.id, !iglesia.activa);
      setIglesias((prev) => prev?.map((i) => (i.id === iglesia.id ? { ...i, activa: !i.activa } : i)) ?? prev);
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo cambiar la iglesia.") });
    }
  };

  const borrar = async (iglesia: IglesiaAdmin) => {
    const seguro = await confirmar({
      titulo: `¿Borrar «${iglesia.nombre}»?`,
      mensaje: "Se borran también sus misas. Si solo cerró por un tiempo, mejor desactívala.",
      aceptar: "Borrar",
      peligro: true,
    });
    if (!seguro) return;
    try {
      await borrarIglesia(iglesia.id);
      setIglesias((prev) => prev?.filter((i) => i.id !== iglesia.id) ?? prev);
      setMensaje({ tipo: "ok", texto: `«${iglesia.nombre}» borrada.` });
    } catch (e) {
      setMensaje({ tipo: "error", texto: mensajeDe(e, "No se pudo borrar la iglesia.") });
    }
  };

  if (!iglesias) return <Cargando />;
  const visibles = iglesias.filter(
    (i) => FILTROS[filtro].cumple(i) && coincide(busqueda, i.nombre, i.distrito, i.direccion)
  );
  const publicas = iglesias.filter((i) => i.activa && i.misas.length > 0).length;

  return (
    <div className="space-y-4">
      <Mensaje mensaje={mensaje} />

      <Tarjeta
        titulo="Importar desde Excel"
        descripcion="Copia las filas de tu Excel (con o sin encabezado) y pégalas aquí. Columnas: Nombre, Distrito, Dirección, Ubicación, Teléfono, Misas y Notas; las de más se ignoran. Si la iglesia ya existe (mismo nombre y distrito), se actualiza y sus misas se reemplazan."
      >
        <div className="flex flex-wrap gap-2 mb-3">
          <Boton variante="secundario" tamano="pequeno" onClick={() => descargarCsv("plantilla-iglesias.csv", plantillaCsv())}>
            Descargar plantilla
          </Boton>
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder={"Parroquia San José\tTrujillo\tJr. Ejemplo 123\t-8.1116, -79.0287\t\tSáb 19:00; Dom 8:00 y 11:00\t"}
          aria-label="Filas copiadas del Excel"
          className={`${claseInput} resize-y font-mono text-xs`}
        />

        {filas.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-texto-suave">
              <span className="text-exito font-medium">
                {validas.length} {validas.length === 1 ? "lista" : "listas"} para importar
              </span>
              {conErrores.length > 0 && (
                <span className="text-error font-medium">
                  {" "}
                  · {conErrores.length} con errores
                </span>
              )}
            </p>
            {conErrores.length > 0 && (
              <ul className="max-h-48 overflow-y-auto rounded-xl border border-error/25 bg-error/10 p-3 space-y-1.5 text-xs text-error">
                {conErrores.map((f) => (
                  <li key={f.numero}>
                    <strong>
                      Línea {f.numero} · {f.nombre}:
                    </strong>{" "}
                    {f.errores.join(" ")}
                  </li>
                ))}
              </ul>
            )}
            <Boton onClick={importar} disabled={validas.length === 0 || importando}>
              {importando ? "Importando…" : `Importar ${validas.length} ${validas.length === 1 ? "iglesia" : "iglesias"}`}
            </Boton>
          </div>
        )}
      </Tarjeta>

      <Tarjeta
        titulo={`Iglesias (${iglesias.length})`}
        descripcion={`${publicas} ${publicas === 1 ? "sale" : "salen"} en la página pública: las activas que tienen misas.`}
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Buscador valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar por nombre, distrito o dirección" />
          </div>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as Filtro)}
            aria-label="Mostrar"
            className={`${claseInput} sm:w-40 cursor-pointer`}
          >
            {(Object.keys(FILTROS) as Filtro[]).map((f) => (
              <option key={f} value={f}>
                {FILTROS[f].texto}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Boton tamano="pequeno" onClick={() => setEditando("nueva")}>
            Nueva iglesia
          </Boton>
          <Boton
            variante="secundario"
            tamano="pequeno"
            onClick={() => descargarCsv(`iglesias-${hoyEnLima()}.csv`, armarCsvIglesias(iglesias))}
            disabled={iglesias.length === 0}
          >
            Descargar la lista (Excel)
          </Boton>
        </div>

        {visibles.length === 0 ? (
          <p className="mt-4 text-sm text-texto-tenue">
            {iglesias.length === 0 ? "Todavía no hay iglesias. Importa tu Excel o agrega una." : "Ninguna iglesia coincide."}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-borde">
            {visibles.map((iglesia) => (
              <li
                key={iglesia.id}
                className={`py-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 ${iglesia.activa ? "" : "opacity-60"}`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-texto break-words">
                    {iglesia.nombre}
                    {!iglesia.activa && <span className="text-xs font-normal text-texto-tenue"> (inactiva)</span>}
                  </p>
                  <p className="text-xs text-texto-tenue">
                    {iglesia.distrito}
                    {iglesia.direccion && ` · ${iglesia.direccion}`}
                  </p>
                  <p className={`text-xs ${iglesia.misas.length ? "text-texto-suave" : "text-aviso"}`}>
                    {iglesia.misas.length ? formatearMisas(iglesia.misas) : "Sin misas: no sale en la página pública"}
                  </p>
                  <p className="text-xs text-texto-tenue break-words">
                    {iglesia.verificado_en ? `Revisada el ${formatearFechaConAnio(iglesia.verificado_en)}` : "Sin revisar"}
                    {iglesia.notas && ` · ${iglesia.notas}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Boton variante="secundario" tamano="pequeno" onClick={() => setEditando(iglesia)}>
                    Editar
                  </Boton>
                  <Boton variante="secundario" tamano="pequeno" onClick={() => alternar(iglesia)}>
                    {iglesia.activa ? "Desactivar" : "Activar"}
                  </Boton>
                  <Boton variante="fantasma" tamano="pequeno" onClick={() => borrar(iglesia)}>
                    Borrar
                  </Boton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {editando && (
        <ModalIglesia
          iglesia={editando === "nueva" ? null : editando}
          onCerrar={() => setEditando(null)}
          onGuardada={(nombre) => {
            setEditando(null);
            setMensaje({ tipo: "ok", texto: `«${nombre}» guardada.` });
            setRecargas((n) => n + 1);
          }}
        />
      )}
      {dialogoConfirmar}
    </div>
  );
}
