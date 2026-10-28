"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCodigoGuardado } from "@/lib/alumno/codigo";
import { coincide } from "@/lib/staff/busqueda";
import { obtenerIglesiasPublicas, type IglesiaPublica } from "@/lib/misas/iglesias";
import { DISTRITOS } from "@/lib/misas/importacion";
import { distanciaKm, type Coordenadas } from "@/lib/misas/ubicacion";
import { Boton, Buscador, Cargando, claseDeBoton, claseInput } from "@/components/ui/base";
import { EnlacesPie } from "@/components/pwa/enlaces-pie";
import { LogoOvalo } from "@/components/ui/logo";
import { TarjetaIglesia } from "./tarjeta-iglesia";

type EstadoUbicacion = "sin_pedir" | "buscando" | "lista" | "denegada" | "no_disponible";

/** Si la iglesia más cercana está más lejos, el alumno probablemente no está en Trujillo */
const LEJOS_KM = 40;

/**
 * Página pública: iglesias de la provincia con sus misas del fin de semana. La ubicación
 * solo vive en el estado de esta página (ni localStorage ni red) para ordenar por cercanía.
 */
export function PaginaMisas() {
  const [iglesias, setIglesias] = useState<IglesiaPublica[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [estadoUbicacion, setEstadoUbicacion] = useState<EstadoUbicacion>("sin_pedir");
  const [distrito, setDistrito] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [ahora, setAhora] = useState(() => new Date());
  const selectorDistrito = useRef<HTMLSelectElement>(null);
  // Con el código guardado, /alumno abre directo su panel: no hace falta volver a escribirlo
  const codigo = useCodigoGuardado();

  useEffect(() => {
    let cancelado = false;
    obtenerIglesiasPublicas()
      .then((lista) => {
        if (!cancelado) setIglesias(lista);
      })
      .catch(() => {
        if (!cancelado) setErrorCarga(true);
      });
    return () => {
      cancelado = true;
    };
  }, [intentos]);

  // La próxima misa cambia mientras la página sigue abierta
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(reloj);
  }, []);

  const reintentar = () => {
    setErrorCarga(false);
    setIntentos((n) => n + 1);
  };

  const usarUbicacion = () => {
    if (!("geolocation" in navigator)) {
      setEstadoUbicacion("no_disponible");
      return;
    }
    setEstadoUbicacion("buscando");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUbicacion({ latitud: coords.latitude, longitud: coords.longitude });
        setEstadoUbicacion("lista");
        setDistrito("");
      },
      (error) => {
        setEstadoUbicacion(error.code === error.PERMISSION_DENIED ? "denegada" : "no_disponible");
        selectorDistrito.current?.focus();
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  };

  const olvidarUbicacion = () => {
    setUbicacion(null);
    setEstadoUbicacion("sin_pedir");
  };

  const conDistancia = (iglesias ?? []).map((iglesia) => ({
    iglesia,
    km: ubicacion ? distanciaKm(ubicacion, iglesia) : null,
  }));
  const visibles = conDistancia
    .filter(
      ({ iglesia }) =>
        (!distrito || iglesia.distrito === distrito) &&
        coincide(busqueda, iglesia.nombre, iglesia.direccion, iglesia.distrito)
    )
    .sort((a, b) => (a.km !== null && b.km !== null ? a.km - b.km : 0));
  const masCercana = ubicacion && conDistancia.length > 0 ? Math.min(...conDistancia.map((c) => c.km ?? Infinity)) : null;

  return (
    <main className="flex-1 flex flex-col max-w-md md:max-w-2xl mx-auto w-full px-4 py-6 gap-4">
      <header className="flex items-start justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3 min-w-0">
          <LogoOvalo className="h-12 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-texto">Misas cerca de ti</h1>
            <p className="text-xs text-texto-tenue">Sábado desde las 17:00 y domingo · provincia de Trujillo</p>
          </div>
        </div>
        <Link href="/alumno" className={`${claseDeBoton("secundario", "pequeno")} shrink-0`}>
          {codigo ? "Mi asistencia" : "Volver"}
        </Link>
      </header>

      <section className="tarjeta p-4 space-y-3 animate-fade-in delay-100" aria-label="Buscar iglesias">
        {estadoUbicacion === "lista" ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-exito font-medium">Ordenadas de la más cercana a la más lejana.</p>
            <Boton variante="fantasma" tamano="pequeno" onClick={olvidarUbicacion}>
              Quitar
            </Boton>
          </div>
        ) : (
          <Boton onClick={usarUbicacion} disabled={estadoUbicacion === "buscando"} className="w-full">
            {estadoUbicacion === "buscando" ? "Buscando tu ubicación…" : "Usar mi ubicación"}
          </Boton>
        )}
        {(estadoUbicacion === "denegada" || estadoUbicacion === "no_disponible") && (
          <p role="status" className="text-sm text-aviso">
            {estadoUbicacion === "denegada"
              ? "No diste permiso para usar tu ubicación. Elige tu distrito:"
              : "No se pudo saber dónde estás. Elige tu distrito:"}
          </p>
        )}
        <p className="text-xs text-texto-tenue">
          Tu ubicación solo se usa en tu celular para ordenar la lista: no se guarda ni se envía.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            ref={selectorDistrito}
            value={distrito}
            onChange={(e) => setDistrito(e.target.value)}
            aria-label="Distrito"
            className={`${claseInput} cursor-pointer`}
          >
            <option value="">Todos los distritos</option>
            {DISTRITOS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Buscador valor={busqueda} onCambiar={setBusqueda} etiqueta="Buscar iglesia" />
        </div>
      </section>

      {masCercana !== null && masCercana > LEJOS_KM && (
        <p role="status" className="text-sm text-aviso text-center">
          Parece que no estás en la provincia de Trujillo: la iglesia más cercana está a {Math.round(masCercana)} km.
        </p>
      )}

      {errorCarga ? (
        <div role="alert" className="tarjeta p-6 text-center space-y-3">
          <p className="text-sm text-error">No se pudieron cargar las iglesias. Revisa tu conexión.</p>
          <Boton variante="secundario" onClick={reintentar}>
            Reintentar
          </Boton>
        </div>
      ) : !iglesias ? (
        <Cargando />
      ) : visibles.length === 0 ? (
        <p className="text-sm text-texto-tenue text-center py-8">
          {iglesias.length === 0
            ? "Todavía no hay horarios de misa cargados."
            : "Ninguna iglesia coincide. Prueba con otro distrito o nombre."}
        </p>
      ) : (
        <>
          <p className="text-xs text-texto-tenue" aria-live="polite">
            {visibles.length} {visibles.length === 1 ? "iglesia" : "iglesias"}
          </p>
          <ul className="space-y-3">
            {visibles.map(({ iglesia, km }) => (
              <TarjetaIglesia key={iglesia.id} iglesia={iglesia} km={km} ahora={ahora} />
            ))}
          </ul>
        </>
      )}

      <div className="mt-auto pt-4">
        <p className="text-center text-xs text-texto-tenue">
          Los horarios pueden cambiar: si puedes, confírmalos con la parroquia.
        </p>
        <EnlacesPie />
      </div>
    </main>
  );
}
