// =============================================
// Avisos push: activarlos y desactivarlos en este celular
// =============================================
// El navegador entrega una "suscripción" (una dirección en su servicio de avisos) y se guarda
// en la base. Un celular tiene una sola: si otra persona activa los avisos ahí, pasa a ser
// suya. A quién avisar y cuándo lo decide la base (avisos_para_enviar).

import { useEffect, useState } from "react";
import { plataformaDe, type Plataforma } from "@/lib/pwa/instalacion";
import { supabase, supabasePublico } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type EstadoAvisos =
  | "cargando"
  /** Este navegador no tiene avisos, o la app no tiene la clave configurada */
  | "no_disponible"
  /** En iPhone, los avisos solo funcionan con la app instalada */
  | "instalar"
  /** El permiso está bloqueado: se cambia en los ajustes del navegador */
  | "bloqueados"
  | "desactivados"
  | "activados";

export type DestinoAvisos = { tipo: "alumno"; codigo: string } | { tipo: "staff" };

// ---------------------------------------------
// Lógica pura
// ---------------------------------------------

export function soporteDeAvisos(entorno: {
  claveConfigurada: boolean;
  apisPresentes: boolean;
  plataforma: Plataforma;
  instalada: boolean;
}): "disponible" | "instalar" | "no_disponible" {
  if (!entorno.claveConfigurada) return "no_disponible";
  if (entorno.plataforma === "ios" && !entorno.instalada) return "instalar";
  return entorno.apisPresentes ? "disponible" : "no_disponible";
}

/** La clave VAPID viene en base64url; el navegador la pide en bytes */
export function claveABytes(clave: string): Uint8Array<ArrayBuffer> {
  const base64 = clave.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(clave.length / 4) * 4, "=");
  const texto = atob(base64);
  const bytes = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

// ---------------------------------------------
// En el navegador
// ---------------------------------------------

function soporteActual() {
  return soporteDeAvisos({
    claveConfigurada: CLAVE_PUBLICA !== "",
    // El service worker solo se registra en producción (components/service-worker-registrar.tsx)
    apisPresentes:
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    plataforma: plataformaDe(navigator.userAgent, navigator.maxTouchPoints),
    instalada: window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true,
  });
}

async function suscripcionActual(): Promise<PushSubscription | null> {
  const registro = await navigator.serviceWorker.getRegistration();
  return registro ? registro.pushManager.getSubscription() : null;
}

/** `ready` nunca termina si el service worker no llega a registrarse: no quedarse esperando */
function serviceWorkerListo(): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, rechazar) =>
      setTimeout(() => rechazar(new Error("El service worker no está listo.")), 10_000)
    ),
  ]);
}

export async function consultarAvisos(): Promise<EstadoAvisos> {
  const soporte = soporteActual();
  if (soporte !== "disponible") return soporte;
  if (Notification.permission === "denied") return "bloqueados";
  return (await suscripcionActual()) ? "activados" : "desactivados";
}

async function guardarEnLaBase(suscripcion: PushSubscription, destino: DestinoAvisos): Promise<void> {
  const datos = suscripcion.toJSON() as unknown as Json;
  if (destino.tipo === "staff") {
    const { error } = await supabase.rpc("registrar_aviso_staff", { p_suscripcion: datos });
    if (error) throw error;
    return;
  }
  const { data, error } = await supabasePublico.rpc("registrar_aviso_alumno", {
    p_codigo: destino.codigo,
    p_suscripcion: datos,
  });
  if (error) throw error;
  if (!(data as { ok: boolean }).ok) throw new Error("No se pudo guardar la suscripción.");
}

/** Pide el permiso (tiene que venir de un toque) y activa los avisos en este celular */
export async function activarAvisos(destino: DestinoAvisos): Promise<EstadoAvisos> {
  const permiso = await Notification.requestPermission();
  if (permiso === "denied") return "bloqueados";
  if (permiso !== "granted") return "desactivados";

  const registro = await serviceWorkerListo();
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: claveABytes(CLAVE_PUBLICA),
  });
  try {
    await guardarEnLaBase(suscripcion, destino);
  } catch (error) {
    // Sin guardar nunca llegaría un aviso: mejor que el botón siga ofreciendo activarlos
    await suscripcion.unsubscribe();
    throw error;
  }
  return "activados";
}

/** Quita los avisos de este celular (también al cambiar de alumno o al cerrar sesión) */
export async function desactivarAvisos(): Promise<void> {
  if (soporteActual() !== "disponible") return;
  const suscripcion = await suscripcionActual();
  if (!suscripcion) return;
  const { error } = await supabasePublico.rpc("quitar_aviso", { p_endpoint: suscripcion.endpoint });
  if (error) throw error;
  await suscripcion.unsubscribe();
}

/** Estado de los avisos de este celular y las acciones para cambiarlo */
export function useAvisos(destino: DestinoAvisos) {
  const [estado, setEstado] = useState<EstadoAvisos>("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    consultarAvisos()
      .then((actual) => {
        if (!cancelado) setEstado(actual);
      })
      .catch(() => {
        if (!cancelado) setEstado("no_disponible");
      });
    return () => {
      cancelado = true;
    };
  }, []);

  /** Devuelve el estado nuevo, o null si falló */
  const cambiar = async (accion: () => Promise<EstadoAvisos>): Promise<EstadoAvisos | null> => {
    setOcupado(true);
    setFallo(false);
    try {
      const nuevo = await accion();
      setEstado(nuevo);
      return nuevo;
    } catch {
      setFallo(true);
      return null;
    } finally {
      setOcupado(false);
    }
  };

  return {
    estado,
    ocupado,
    fallo,
    activar: () => cambiar(() => activarAvisos(destino)),
    desactivar: () =>
      cambiar(async () => {
        await desactivarAvisos();
        return "desactivados";
      }),
  };
}
