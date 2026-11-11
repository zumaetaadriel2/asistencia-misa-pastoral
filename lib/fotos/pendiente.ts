// =============================================
// Foto sin enviar, guardada en el celular del alumno
// =============================================
// Si se cae la señal, la foto ya comprimida (~80 KB) queda en IndexedDB para enviarla después,
// aunque se cierre la app: en iPhone, la foto tomada desde la app no queda en la galería. Hay una
// sola a la vez y se borra al enviarla, al elegir otra, con "No soy yo" o cuando ya no sirve.
// Nunca sale del celular salvo al enviarla. Si el navegador no deja guardar (modo privado), el
// envío sigue funcionando mientras la app esté abierta.

import type { FotoLista, ProgresoEnvio } from "./subir";

export interface FotoPendiente {
  /** Código del alumno que la eligió: a otro alumno no se le ofrece */
  codigo: string;
  /** Semana del formulario cuando la eligió */
  semana: number;
  foto: FotoLista;
  /** Cuándo intentó enviarla (ISO) */
  guardadaEn: string;
  progreso: ProgresoEnvio | null;
}

/** Más que lo que dura el envío de una semana (sábado 7 p. m. → miércoles 11:59 p. m.) */
export const DIAS_DE_VIGENCIA = 5;

/** Si la foto guardada todavía se le puede ofrecer a este alumno en esta semana */
export function pendienteVigente(
  pendiente: Pick<FotoPendiente, "codigo" | "semana" | "guardadaEn">,
  codigo: string,
  semana: number,
  ahora: Date = new Date()
): boolean {
  const guardada = new Date(pendiente.guardadaEn).getTime();
  return (
    pendiente.codigo === codigo &&
    pendiente.semana === semana &&
    Number.isFinite(guardada) &&
    ahora.getTime() - guardada < DIAS_DE_VIGENCIA * 24 * 60 * 60_000
  );
}

const BASE = "mi-misa-ps";
const ALMACEN = "foto-pendiente";
const CLAVE = "actual";

/** Lo que va en IndexedDB: la foto como ArrayBuffer, que todos los navegadores guardan bien */
interface Registro extends Omit<FotoPendiente, "foto"> {
  foto: { bytes: ArrayBuffer; tipo: string; huella: string; fechaExif: string | null };
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((listo, fallo) => {
    const pedido = indexedDB.open(BASE, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(ALMACEN);
    pedido.onsuccess = () => listo(pedido.result);
    pedido.onerror = () => fallo(pedido.error);
  });
}

// Las operaciones van en fila: guardar lee la foto antes de abrir la transacción, y sin la fila un
// borrado podría terminar antes y la foto quedaría guardada
let fila: Promise<unknown> = Promise.resolve();
function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const resultado = fila.then(tarea, tarea);
  fila = resultado.catch(() => {});
  return resultado;
}

async function usar<T>(modo: IDBTransactionMode, accion: (almacen: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const base = await abrir();
  try {
    return await new Promise<T>((listo, fallo) => {
      const transaccion = base.transaction(ALMACEN, modo);
      const pedido = accion(transaccion.objectStore(ALMACEN));
      transaccion.oncomplete = () => listo(pedido.result);
      transaccion.onerror = () => fallo(transaccion.error);
      transaccion.onabort = () => fallo(transaccion.error);
    });
  } finally {
    base.close();
  }
}

/** Guarda (o reemplaza) la foto sin enviar. Devuelve false si el navegador no lo permite */
export function guardarFotoPendiente(pendiente: FotoPendiente): Promise<boolean> {
  return enFila(async () => {
    try {
      const { blob, huella, fechaExif } = pendiente.foto;
      const registro: Registro = {
        ...pendiente,
        foto: { bytes: await blob.arrayBuffer(), tipo: blob.type, huella, fechaExif },
      };
      await usar("readwrite", (almacen) => almacen.put(registro, CLAVE));
      return true;
    } catch {
      return false;
    }
  });
}

/** La foto sin enviar, o null si no hay (o si el navegador no deja leerla) */
export function leerFotoPendiente(): Promise<FotoPendiente | null> {
  return enFila(async () => {
    try {
      const registro = await usar<Registro | undefined>("readonly", (almacen) => almacen.get(CLAVE));
      if (!registro?.foto?.bytes) return null;
      const { bytes, tipo, huella, fechaExif } = registro.foto;
      return { ...registro, foto: { blob: new Blob([bytes], { type: tipo }), huella, fechaExif } };
    } catch {
      return null;
    }
  });
}

/** Borra la foto sin enviar, si hay */
export function borrarFotoPendiente(): Promise<void> {
  return enFila(async () => {
    try {
      await usar("readwrite", (almacen) => almacen.delete(CLAVE));
    } catch {
      // Sin IndexedDB no hay nada que borrar
    }
  });
}
