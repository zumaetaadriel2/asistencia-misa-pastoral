import type { Metadata } from "next";
import { PaginaMisas } from "@/components/misas/pagina-misas";

export const metadata: Metadata = {
  title: "Misas cerca de ti · Pastoral Mariana",
  description: "Iglesias de la provincia de Trujillo con sus misas del sábado y domingo.",
};

/** Pública (sin código): cualquier alumno o familia ve las misas cercanas */
export default function MisasPage() {
  return <PaginaMisas />;
}
