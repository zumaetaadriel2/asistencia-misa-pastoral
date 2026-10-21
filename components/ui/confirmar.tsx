"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Boton } from "./base";
import { Modal } from "./modal";

interface OpcionesConfirmar {
  titulo: string;
  mensaje?: ReactNode;
  /** Texto del botón de aceptar (por defecto "Aceptar") */
  aceptar?: string;
  /** Pinta el botón de aceptar en rojo (borrar, dar de baja…) */
  peligro?: boolean;
}

/**
 * Reemplazo de window.confirm con el diseño de la app:
 *   const { confirmar, dialogoConfirmar } = useConfirmar();
 *   if (!(await confirmar({ titulo: "¿Dar de baja?" }))) return;
 *   …y en el JSX: {dialogoConfirmar}
 * Responde false al cancelar, al desmontarse o si se pide otra confirmación antes.
 */
export function useConfirmar() {
  const [pedido, setPedido] = useState<OpcionesConfirmar | null>(null);
  const resolverPendiente = useRef<((respuesta: boolean) => void) | null>(null);

  const confirmar = useCallback((opciones: OpcionesConfirmar) => {
    resolverPendiente.current?.(false);
    return new Promise<boolean>((resolver) => {
      resolverPendiente.current = resolver;
      setPedido(opciones);
    });
  }, []);

  const responder = useCallback((respuesta: boolean) => {
    resolverPendiente.current?.(respuesta);
    resolverPendiente.current = null;
    setPedido(null);
  }, []);

  useEffect(() => {
    const pendiente = resolverPendiente;
    return () => pendiente.current?.(false);
  }, []);

  const dialogoConfirmar = pedido && (
    <Modal titulo={pedido.titulo} onCerrar={() => responder(false)}>
      {pedido.mensaje && <div className="mt-2 text-sm text-texto-suave">{pedido.mensaje}</div>}
      <div className="mt-6 flex gap-3">
        <Boton variante="secundario" className="flex-1" onClick={() => responder(false)}>
          Cancelar
        </Boton>
        <Boton
          variante={pedido.peligro ? "peligro" : "primario"}
          className="flex-1"
          onClick={() => responder(true)}
          data-autofocus
        >
          {pedido.aceptar ?? "Aceptar"}
        </Boton>
      </div>
    </Modal>
  );

  return { confirmar, dialogoConfirmar };
}
