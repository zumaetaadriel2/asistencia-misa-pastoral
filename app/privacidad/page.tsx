import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LogoOvalo } from "@/components/ui/logo";
import { claseDeBoton } from "@/components/ui/clases";

export const metadata: Metadata = {
  title: "Privacidad · Mi Misa PS",
  description: "Qué datos guarda Mi Misa PS, quién los ve y cómo pedir que se borren.",
};

const CORREO = "pastoral@ps.edu.pe";
const ACTUALIZADA = "27 de octubre de 2026";

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="tarjeta p-5">
      <h2 className="text-base font-semibold text-texto">{titulo}</h2>
      <div className="mt-2 space-y-2 text-sm text-texto-suave leading-relaxed">{children}</div>
    </section>
  );
}

const enlaceCorreo = (
  <a href={`mailto:${CORREO}`} className="text-marca font-medium underline underline-offset-4">
    {CORREO}
  </a>
);

/**
 * Política de privacidad (pública). Describe lo que la app hace de verdad: si cambia qué
 * datos se guardan o quién los ve, hay que actualizar esta página.
 */
export default function PrivacidadPage() {
  return (
    <main className="flex-1 flex flex-col max-w-md md:max-w-2xl mx-auto w-full px-4 py-6 gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <LogoOvalo className="h-12 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-texto">Privacidad</h1>
            <p className="text-xs text-texto-tenue">Mi Misa PS · actualizada el {ACTUALIZADA}</p>
          </div>
        </div>
        <Link href="/alumno" className={`${claseDeBoton("secundario", "pequeno")} shrink-0`}>
          Volver
        </Link>
      </header>

      <p className="text-sm text-texto-suave leading-relaxed">
        Mi Misa PS es la app de la Pastoral Mariana para registrar la asistencia de los alumnos de catequesis a la misa
        del fin de semana y a la catequesis, y para encontrar misas cerca. Aquí te contamos, en simple, qué datos guarda,
        quién los ve y cómo pedir que se corrijan o se borren.
      </p>

      <Seccion titulo="Quién es responsable">
        <p>
          La Pastoral Mariana del colegio Nuestra Señora del Perpetuo Socorro (Trujillo). Para cualquier consulta,
          escríbenos a {enlaceCorreo}.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos guardamos">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-texto">De cada alumno:</strong> su nombre, su comunidad y programa (Confirmación o
            Primera Comunión), su código personal, su asistencia a misa semana a semana, su asistencia a catequesis (y el
            motivo cuando una falta se justifica) y las fotos de misa que sube.
          </li>
          <li>
            <strong className="text-texto">De cada foto:</strong> la imagen reducida, la fecha en que se tomó y una
            «huella» que sirve para detectar fotos repetidas. Antes de enviarla, el celular la comprime y le quita sus
            datos internos, así que <strong className="text-texto">no se guarda dónde se tomó</strong>.
          </li>
          <li>
            <strong className="text-texto">Del equipo de la pastoral</strong> (guías, catequistas y administradores):
            su nombre, su correo de Google y qué hace en cada comunidad.
          </li>
          <li>
            <strong className="text-texto">En «Misas cerca de ti»:</strong> nada. Si compartes tu ubicación, se usa solo
            en tu celular para ordenar las iglesias; no se envía ni se guarda.
          </li>
          <li>
            <strong className="text-texto">Por seguridad:</strong> cuando alguien escribe un código equivocado, se guarda
            la dirección IP durante un día, para impedir que se adivinen códigos.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <p>
          Para registrar y revisar la asistencia de cada alumno, avisarle si su foto fue aceptada o rechazada y preparar
          reportes para la pastoral. Nunca los usamos para publicidad ni los vendemos o compartimos con otros fines.
        </p>
      </Seccion>

      <Seccion titulo="Quién los ve">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            Las fotos las ve <strong className="text-texto">solo el guía de la comunidad del alumno</strong> y los
            administradores de la pastoral. <strong className="text-texto">Nunca son públicas</strong>: se abren con
            enlaces que vencen a los 5 minutos.
          </li>
          <li>Los catequistas solo ven la lista de su comunidad para marcar la asistencia a catequesis.</li>
          <li>Cada alumno ve únicamente su propia asistencia, con su código.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Dónde se guardan">
        <p>
          En servicios en la nube: Supabase (la base de datos y el inicio de sesión del equipo), Cloudflare R2 (las
          fotos, en un almacén privado) y Vercel (la página). Sus servidores pueden estar fuera del Perú. Cada semana se
          hace una copia de seguridad cifrada.
        </p>
      </Seccion>

      <Seccion titulo="Cuánto tiempo">
        <p>
          Mientras la pastoral los necesite para su labor. Si la familia lo pide, eliminamos los datos y las fotos del
          alumno.
        </p>
      </Seccion>

      <Seccion titulo="En tu celular">
        <p>
          La app no usa cookies de publicidad ni de analítica. Tu celular solo recuerda el código del alumno (para no
          pedirlo cada vez) y, si eres del equipo, tu sesión.
        </p>
      </Seccion>

      <Seccion titulo="Otros servicios">
        <p>
          El equipo de la pastoral inicia sesión con su cuenta de Google. El botón «Cómo llegar» abre Google Maps, que
          tiene su propia política de privacidad.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          Según la Ley N.° 29733 de Protección de Datos Personales, puedes pedir ver, corregir o eliminar tus datos, u
          oponerte a su uso, escribiendo a {enlaceCorreo}. Si el alumno es menor de edad, lo puede pedir su padre, madre
          o tutor.
        </p>
      </Seccion>

      <Seccion titulo="Cambios">
        <p>
          Si esta política cambia, actualizaremos esta página y su fecha. Última actualización: {ACTUALIZADA}.
        </p>
      </Seccion>

      <p className="pt-2 text-center text-xs text-texto-tenue">
        <Link href="/instalar" className="inline-flex items-center min-h-11 px-2 underline underline-offset-4">
          Cómo instalar la app
        </Link>
      </p>
    </main>
  );
}
