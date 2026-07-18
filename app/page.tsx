import { redirect } from "next/navigation";

/**
 * Página raíz — redirige al formulario del alumno.
 * En una PWA, la ruta principal es la vista del alumno.
 */
export default function Home() {
  redirect("/alumno");
}
