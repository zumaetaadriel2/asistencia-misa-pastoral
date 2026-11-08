import type { Metadata } from "next";
import { PaginaAyuda } from "@/components/ayuda/pagina-ayuda";

export const metadata: Metadata = {
  title: "Ayuda · Mi Misa PS",
  description: "Guía rápida de Mi Misa PS para alumnos y para guías de la Pastoral Mariana.",
};

/** Pública: cómo usar la app, una parte para alumnos y otra para guías (se puede imprimir) */
export default function AyudaPage() {
  return <PaginaAyuda />;
}
