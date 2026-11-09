"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Boton, claseDeBoton } from "@/components/ui/base";
import { LogoOvalo } from "@/components/ui/logo";
import { HORARIO_ENVIO } from "@/lib/alumno/mensajes";

const ENLACE = "font-semibold text-marca underline underline-offset-4 print:text-black print:no-underline";

/** Pasos numerados; al imprimir quedan en negro sobre blanco */
function Pasos({ pasos }: { pasos: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {pasos.map((paso, i) => (
        <li key={i} className="flex gap-3 text-sm text-texto-suave leading-relaxed print:text-black print:leading-snug">
          <span className="shrink-0 w-6 h-6 rounded-full bg-marca/10 text-marca text-xs font-bold flex items-center justify-center print:border print:border-neutral-400 print:bg-transparent print:text-black">
            {i + 1}
          </span>
          <span>{paso}</span>
        </li>
      ))}
    </ol>
  );
}

function Preguntas({ preguntas }: { preguntas: [string, ReactNode][] }) {
  return (
    <dl className="space-y-3">
      {preguntas.map(([pregunta, respuesta]) => (
        <div key={pregunta}>
          <dt className="text-sm font-semibold text-texto print:text-black">{pregunta}</dt>
          <dd className="mt-0.5 text-sm text-texto-suave leading-relaxed print:text-black print:leading-snug">{respuesta}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Una parte de la guía: en pantalla es una tarjeta; al imprimir, una hoja */
function Parte({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="tarjeta p-5 space-y-5 print:border-0 print:shadow-none print:p-0 print:break-after-page print:space-y-4"
    >
      <div>
        <p className="hidden print:block text-xs text-neutral-600">Mi Misa PS · Pastoral Mariana</p>
        <h2 id={`${id}-titulo`} className="text-lg font-bold text-texto print:text-black">
          {titulo}
        </h2>
      </div>
      {children}
    </section>
  );
}

const Subtitulo = ({ children }: { children: ReactNode }) => (
  <h3 className="text-sm font-semibold text-texto uppercase tracking-wide print:text-black">{children}</h3>
);

export function PaginaAyuda() {
  return (
    <main className="flex-1 flex flex-col max-w-md md:max-w-2xl mx-auto w-full px-4 py-6 gap-4 print:max-w-none print:p-0">
      <header className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <LogoOvalo className="h-11" />
          <div>
            <h1 className="text-xl font-bold text-texto">Ayuda</h1>
            <p className="text-xs text-texto-tenue">Guía rápida de Mi Misa PS</p>
          </div>
        </div>
        <Link href="/alumno" className={claseDeBoton("secundario", "pequeno")}>
          Volver
        </Link>
      </header>

      <nav aria-label="Partes de la guía" className="flex flex-wrap gap-2 print:hidden">
        <a href="#alumnos" className={claseDeBoton("secundario", "pequeno")}>
          Para alumnos
        </a>
        <a href="#guias" className={claseDeBoton("secundario", "pequeno")}>
          Para guías
        </a>
        <Boton variante="fantasma" tamano="pequeno" onClick={() => window.print()}>
          Imprimir o guardar PDF
        </Boton>
      </nav>

      <Parte id="alumnos" titulo="Para alumnos: tu asistencia a misa">
        <div className="space-y-3">
          <Subtitulo>Cada semana</Subtitulo>
          <Pasos
            pasos={[
              <>
                <strong className="text-texto print:text-black">Instala la app</strong> en tu celular: sigue los pasos de{" "}
                <Link href="/instalar" className={ENLACE}>
                  Cómo instalar
                </Link>
                . No hace falta la tienda de apps.
              </>,
              <>
                <strong className="text-texto print:text-black">Entra con tu código</strong>, el de 6 letras y números que te dio tu
                guía. La app lo recuerda en tu celular.
              </>,
              <>
                <strong className="text-texto print:text-black">Toma la foto en la misa:</strong> que se vea tu rostro y que estás
                dentro de la iglesia, con el altar o el interior detrás. Nada de fotos viejas, de pantallas ni de internet.
              </>,
              <>
                <strong className="text-texto print:text-black">Súbela a tiempo:</strong> del {HORARIO_ENVIO}. La misa del sábado en
                la noche cuenta para ese domingo.
              </>,
              <>
                <strong className="text-texto print:text-black">Revisa cómo quedó:</strong> tu guía la valida o la rechaza. Si la
                rechaza, verás el motivo y podrás mandar otra hasta el miércoles a las 11:59 p. m.
              </>,
            ]}
          />
        </div>
        <div className="space-y-3">
          <Subtitulo>¿Qué hago si…?</Subtitulo>
          <Preguntas
            preguntas={[
              ["Perdí mi código", "Pídeselo a tu guía: puede darte el mismo o uno nuevo."],
              ["No pude ir a misa", "Avísale a tu guía. Si hubo un motivo, puede justificar tu falta."],
              [
                "No sé a qué misa ir",
                <>
                  En{" "}
                  <Link href="/misas" className={ENLACE}>
                    Misas cerca
                  </Link>{" "}
                  están las iglesias de Trujillo con sus horarios del fin de semana.
                </>,
              ],
              [
                "No me deja enviar la foto",
                "Revisa que tengas señal y que estés dentro del horario. Si sigue sin funcionar, avísale a tu guía.",
              ],
              [
                "Quiero que me recuerde el sábado",
                "En tu pantalla, en Recordatorios, activa los avisos del celular (en iPhone, con la app instalada) o toca «Agregar al calendario».",
              ],
            ]}
          />
        </div>
      </Parte>

      <Parte id="guias" titulo="Para guías: revisar y llevar la asistencia">
        <div className="space-y-3">
          <Subtitulo>Revisar las fotos</Subtitulo>
          <Pasos
            pasos={[
              <>
                <strong className="text-texto print:text-black">Entra con tu Gmail</strong> (el que registró la pastoral) desde{" "}
                «¿Eres guía, catequista o administrador?», en la pantalla del código.
              </>,
              <>
                <strong className="text-texto print:text-black">Revisión:</strong> desliza la foto a la derecha para validarla y a la
                izquierda para rechazarla. Tócala para verla en grande. En la computadora: → o V valida, ← o R rechaza y Z deshace.
              </>,
              <>
                <strong className="text-texto print:text-black">Qué validar:</strong> que se vea el rostro del alumno dentro del
                templo, en la misa de ese fin de semana. La app avisa si la foto se parece a otra o si se tomó antes del sábado.
              </>,
              <>
                <strong className="text-texto print:text-black">Al rechazar</strong>, escribe un motivo claro: el alumno lo ve y puede
                mandar otra hasta el miércoles. ¿Te equivocaste? Toca «Deshacer» en los segundos siguientes.
              </>,
              <>
                <strong className="text-texto print:text-black">¿Es de otro alumno?</strong> «Cambiar alumno» la pasa al alumno
                correcto de tu comunidad.
              </>,
            ]}
          />
        </div>
        <div className="space-y-3">
          <Subtitulo>Tu comunidad</Subtitulo>
          <Preguntas
            preguntas={[
              [
                "Ver quién falta",
                "En Asistencia (o Mi comunidad) está cada alumno semana por semana, con su porcentaje.",
              ],
              ["Justificar una falta", "Toca la semana del alumno en Asistencia y escribe el motivo."],
              ["Mandar el resumen al grupo", "En Revisión, «Resumen WhatsApp» arma el mensaje con quién envió y quién falta."],
              ["Que me avisen de las fotos", "Toca la campana de arriba: te avisa los lunes a las 8 p. m. si tienes fotos por revisar."],
              ["Códigos y Excel", "En Asistencia: «Imprimir códigos» para repartirlos y «Descargar Excel» para el reporte."],
              [
                "Pasar lista en catequesis",
                "En Catequesis, crea la sesión del día y marca a cada uno: presente, tardanza, falta o justificada (con motivo).",
              ],
              [
                "Cuándo se cierra la semana",
                "El jueves a las 12:05 a. m. se cierra sola: quien no envió foto queda con falta.",
              ],
            ]}
          />
        </div>
      </Parte>

      <p className="text-center text-xs text-texto-tenue print:hidden">
        ¿Dudas? Escribe a la pastoral:{" "}
        <a href="mailto:pastoral@ps.edu.pe" className="underline underline-offset-4">
          pastoral@ps.edu.pe
        </a>
      </p>
    </main>
  );
}
