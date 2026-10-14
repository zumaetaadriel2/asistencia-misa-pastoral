"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { EstadoFormulario } from "@/lib/utils/timeHelpers";
import { supabase } from "@/lib/supabase/client";
import { subirImagenCloudinary } from "@/lib/cloudinary";
import { PantallaExito } from "./pantalla-exito";

// =============================================
// Tipos
// =============================================

interface Comunidad {
  id: number;
  nombre: string;
}

interface Alumno {
  id: number;
  nombre_completo: string;
}

interface Props {
  estado: EstadoFormulario;
}

type Paso = 1 | 2 | 3 | 4;

// =============================================
// Componente principal
// =============================================

export function FormularioAsistencia({ estado }: Props) {
  // --- State del wizard ---
  const [paso, setPaso] = useState<Paso>(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  // --- Datos del formulario ---
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [comunidadId, setComunidadId] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [loadingComunidades, setLoadingComunidades] = useState(true);
  const [loadingAlumnos, setLoadingAlumnos] = useState(false);
  const [validandoPin, setValidandoPin] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Cargar comunidades activas ---
  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("comunidades")
        .select("id, nombre")
        .eq("activa", true)
        .order("nombre");

      if (error) {
        setError("Error al cargar comunidades: " + error.message);
      } else {
        setComunidades(data ?? []);
      }
      setLoadingComunidades(false);
    }
    cargar();
  }, []);

  // --- Validar PIN ---
  const validarPin = useCallback(async () => {
    if (!comunidadId || pin.length !== 4) return;

    setValidandoPin(true);
    setPinError("");

    const { data, error } = await supabase
      .from("comunidades")
      .select("id")
      .eq("id", comunidadId)
      .eq("pin", pin)
      .maybeSingle();

    if (error) {
      setPinError("Error al validar el PIN.");
      setValidandoPin(false);
      return;
    }

    if (!data) {
      setPinError("PIN incorrecto. Verifica e intenta de nuevo.");
      setValidandoPin(false);
      return;
    }

    // PIN correcto — cargar alumnos de la comunidad
    setLoadingAlumnos(true);
    const { data: alumnosData, error: alumnosError } = await supabase
      .from("alumnos")
      .select("id, nombre_completo")
      .eq("comunidad_id", comunidadId)
      .eq("activo", true)
      .order("nombre_completo");

    if (alumnosError) {
      setPinError("Error al cargar alumnos: " + alumnosError.message);
    } else {
      setAlumnos(alumnosData ?? []);
      setPaso(3);
    }

    setValidandoPin(false);
    setLoadingAlumnos(false);
  }, [comunidadId, pin]);

  // --- Manejar foto ---
  const handleFoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFoto(file);

    // Generar preview
    const url = URL.createObjectURL(file);
    setFotoPreview(url);
  }, []);

  const limpiarFoto = useCallback(() => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFoto(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [fotoPreview]);

  // --- Enviar formulario ---
  const enviarAsistencia = useCallback(async () => {
    if (!alumnoId || !foto) return;

    setEnviando(true);
    setError("");

    try {
      // 1. Verificar si ya existe un registro para este alumno y semana
      const { data: existente, error: checkError } = await supabase
        .from("asistencias")
        .select("id, estado")
        .eq("alumno_id", alumnoId)
        .eq("semana_numero", estado.semanaActual)
        .maybeSingle();

      if (checkError) {
        throw new Error("Error al verificar registro existente: " + checkError.message);
      }

      // Bloquear si la semana ya se cerró y el alumno quedó como inasistencia
      if (existente && existente.estado === "inasistencia") {
        throw new Error(
          `La Semana ${estado.semanaActual} ya fue cerrada y tu registro quedó como inasistencia. Si es un error, consulta con tu guía.`
        );
      }

      // Bloquear si ya tiene un registro pendiente o validado
      if (existente && existente.estado !== "rechazado") {
        const estadoTexto =
          existente.estado === "pendiente"
            ? "pendiente de revisión"
            : "ya validada";
        throw new Error(
          `Ya tienes una asistencia registrada para la Semana ${estado.semanaActual} (${estadoTexto}). No puedes enviar otra.`
        );
      }

      // 2. Subir foto a Cloudinary (comprime automáticamente)
      const { secure_url, public_id } = await subirImagenCloudinary(foto);

      if (existente && existente.estado === "rechazado") {
        // 3a. Reenvío: actualizar el registro rechazado con la nueva foto
        const { error: updateError } = await supabase
          .from("asistencias")
          .update({
            foto_url: secure_url,
            foto_public_id: public_id,
            estado: "pendiente",
            motivo_rechazo: null,
            fecha_subida: new Date().toISOString(),
          })
          .eq("id", existente.id);

        if (updateError) {
          throw new Error("Error al actualizar la asistencia: " + updateError.message);
        }
      } else {
        // 3b. Primer envío: insertar nuevo registro
        const { error: insertError } = await supabase
          .from("asistencias")
          .insert({
            alumno_id: alumnoId,
            semana_numero: estado.semanaActual,
            foto_url: secure_url,
            foto_public_id: public_id,
            estado: "pendiente",
          });

        if (insertError) {
          throw new Error("Error al guardar la asistencia: " + insertError.message);
        }
      }

      // 4. ¡Éxito!
      setExito(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setEnviando(false);
    }
  }, [alumnoId, foto, estado.semanaActual]);

  // --- Pantalla de éxito ---
  if (exito) {
    const alumnoNombre =
      alumnos.find((a) => a.id === alumnoId)?.nombre_completo ?? "";
    const comunidadNombre =
      comunidades.find((c) => c.id === comunidadId)?.nombre ?? "";

    return (
      <PantallaExito
        alumnoNombre={alumnoNombre}
        comunidadNombre={comunidadNombre}
        semana={estado.semanaActual}
      />
    );
  }

  // --- Nombres de los pasos ---
  const pasos = ["Comunidad", "PIN", "Alumno", "Foto"];

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-6">
      <div className="max-w-md w-full animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-white">
            Registro de Asistencia
          </h1>
          <p className="text-xs text-white/40 mt-1">
            Semana {estado.semanaActual} · {estado.nombreCiclo}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {pasos.map((nombre, idx) => {
            const num = (idx + 1) as Paso;
            const isActive = num === paso;
            const isCompleted = num < paso;

            return (
              <div key={nombre} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                      ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isActive
                          ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30"
                          : "bg-white/5 text-white/25 border border-white/[0.06]"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 transition-colors ${
                      isActive ? "text-white/70" : "text-white/20"
                    }`}
                  >
                    {nombre}
                  </span>
                </div>
                {idx < pasos.length - 1 && (
                  <div
                    className={`w-6 h-px mb-4 transition-colors ${
                      isCompleted ? "bg-emerald-500/30" : "bg-white/[0.06]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Error global */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-fade-in-scale">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          </div>
        )}

        {/* Card del formulario */}
        <div className="glass-card p-6">
          {/* ========== PASO 1: Comunidad ========== */}
          {paso === 1 && (
            <div className="animate-fade-in" key="paso1">
              <label className="block text-sm font-medium text-white/70 mb-1">
                Selecciona tu comunidad
              </label>
              <p className="text-xs text-white/30 mb-4">
                Elige la comunidad a la que perteneces.
              </p>

              {loadingComunidades ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                  <p className="text-xs text-white/30">Cargando comunidades…</p>
                </div>
              ) : comunidades.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-white/40">
                    No hay comunidades activas.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    id="select-comunidad"
                    value={comunidadId ?? ""}
                    onChange={(e) => {
                      setComunidadId(e.target.value ? Number(e.target.value) : null);
                      setError("");
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
                               appearance-none cursor-pointer transition-all"
                  >
                    <option value="" className="bg-neutral-900">
                      — Seleccionar —
                    </option>
                    {comunidades.map((c) => (
                      <option key={c.id} value={c.id} className="bg-neutral-900">
                        {c.nombre}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      if (!comunidadId) {
                        setError("Selecciona una comunidad para continuar.");
                        return;
                      }
                      setError("");
                      setPaso(2);
                    }}
                    disabled={!comunidadId}
                    className="mt-6 w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-30
                               disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
                  >
                    Continuar
                  </button>
                </>
              )}
            </div>
          )}

          {/* ========== PASO 2: PIN ========== */}
          {paso === 2 && (
            <div className="animate-fade-in" key="paso2">
              <label className="block text-sm font-medium text-white/70 mb-1">
                Código PIN de tu comunidad
              </label>
              <p className="text-xs text-white/30 mb-4">
                Ingresa el PIN de 4 dígitos que te proporcionó tu coordinador.
              </p>

              <input
                id="input-pin"
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPin(val);
                  setPinError("");
                  setError("");
                }}
                placeholder="• • • •"
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white text-center
                           text-2xl font-mono tracking-[0.5em] placeholder:text-white/15
                           focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
                           transition-all"
                autoFocus
              />

              {pinError && (
                <p className="mt-3 text-sm text-rose-400 text-center animate-fade-in-scale">
                  {pinError}
                </p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setPaso(1);
                    setPin("");
                    setPinError("");
                    setError("");
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-all"
                >
                  Atrás
                </button>
                <button
                  onClick={validarPin}
                  disabled={pin.length !== 4 || validandoPin}
                  className="flex-[2] py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-30
                             disabled:cursor-not-allowed text-white text-sm font-semibold transition-all
                             flex items-center justify-center gap-2"
                >
                  {validandoPin ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Validando…
                    </>
                  ) : (
                    "Verificar PIN"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========== PASO 3: Alumno ========== */}
          {paso === 3 && (
            <div className="animate-fade-in" key="paso3">
              <label className="block text-sm font-medium text-white/70 mb-1">
                Selecciona tu nombre
              </label>
              <p className="text-xs text-white/30 mb-4">
                Busca tu nombre en la lista de tu comunidad.
              </p>

              {loadingAlumnos ? (
                <div className="py-8 text-center">
                  <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
                  <p className="text-xs text-white/30">Cargando alumnos…</p>
                </div>
              ) : alumnos.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-white/40">
                    No hay alumnos registrados en esta comunidad.
                  </p>
                </div>
              ) : (
                <>
                  <select
                    id="select-alumno"
                    value={alumnoId ?? ""}
                    onChange={(e) => {
                      setAlumnoId(e.target.value ? Number(e.target.value) : null);
                      setError("");
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
                               appearance-none cursor-pointer transition-all"
                  >
                    <option value="" className="bg-neutral-900">
                      — Seleccionar alumno —
                    </option>
                    {alumnos.map((a) => (
                      <option key={a.id} value={a.id} className="bg-neutral-900">
                        {a.nombre_completo}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setPaso(2);
                        setAlumnoId(null);
                        setError("");
                      }}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-all"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={() => {
                        if (!alumnoId) {
                          setError("Selecciona tu nombre para continuar.");
                          return;
                        }
                        setError("");
                        setPaso(4);
                      }}
                      disabled={!alumnoId}
                      className="flex-[2] py-3 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-30
                                 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ========== PASO 4: Foto ========== */}
          {paso === 4 && (
            <div className="animate-fade-in" key="paso4">
              <label className="block text-sm font-medium text-white/70 mb-1">
                Foto de asistencia
              </label>
              <p className="text-xs text-white/30 mb-4">
                Toma una foto o selecciona una imagen de tu galería.
              </p>

              {/* Input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFoto}
                className="hidden"
                id="input-foto"
              />

              {!fotoPreview ? (
                // Área táctil para tomar/seleccionar foto
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-white/10
                             hover:border-primary-500/40 bg-white/[0.02] hover:bg-primary-600/5
                             flex flex-col items-center justify-center gap-3
                             transition-all duration-300 group cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full bg-primary-600/10 flex items-center justify-center
                                  group-hover:bg-primary-600/20 transition-colors">
                    <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">
                      Toca para tomar foto
                    </p>
                    <p className="text-xs text-white/25 mt-0.5">
                      o seleccionar de la galería
                    </p>
                  </div>
                </button>
              ) : (
                // Preview de la foto
                <div className="relative animate-fade-in-scale">
                  <img
                    src={fotoPreview}
                    alt="Preview de la foto"
                    className="w-full aspect-[4/3] object-cover rounded-xl"
                  />
                  {/* Botón para quitar foto */}
                  <button
                    onClick={limpiarFoto}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm
                               flex items-center justify-center hover:bg-rose-500/80 transition-colors"
                    title="Quitar foto"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setPaso(3);
                    limpiarFoto();
                    setError("");
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-all"
                >
                  Atrás
                </button>
                <button
                  onClick={enviarAsistencia}
                  disabled={!foto || enviando}
                  className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30
                             disabled:cursor-not-allowed text-white text-sm font-semibold transition-all
                             flex items-center justify-center gap-2"
                >
                  {enviando ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Enviar asistencia
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-white/15 mt-6">
          Cierra el Lunes a las 11:59 PM
        </p>
      </div>
    </main>
  );
}
