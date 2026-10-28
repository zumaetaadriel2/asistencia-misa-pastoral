import type { Metadata } from "next";
import { PaginaInstalar } from "@/components/pwa/pagina-instalar";

export const metadata: Metadata = {
  title: "Instalar · Mi Misa PS",
  description: "Cómo instalar Mi Misa PS en tu celular Android o iPhone.",
};

/** Pública: los pasos para instalar la app, para alumnos y familias */
export default function InstalarPage() {
  return <PaginaInstalar />;
}
