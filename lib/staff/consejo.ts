// =============================================
// Consejo de la primera vez en la revisión ("desliza para validar o rechazar")
// =============================================
// Se recuerda en el navegador del guía (lib/utils/marca-vista.ts).

import { crearMarcaVista } from "@/lib/utils/marca-vista";

const consejo = crearMarcaVista("revision.consejoVisto");

export const marcarConsejoVisto = consejo.marcar;

/** `true` si ya lo vio; en el servidor también `true`, para no mostrarlo y esconderlo de golpe */
export const useConsejoVisto = consejo.useVista;
