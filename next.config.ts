import type { NextConfig } from "next";

const esDesarrollo = process.env.NODE_ENV === "development";

/** Supabase (datos, login y Edge Functions): sale de la variable pública, en build */
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";

/** Las fotos se suben a R2 y el staff las ve desde R2, con URLs firmadas */
const r2 = "https://*.r2.cloudflarestorage.com";

// Sin nonces: las páginas son estáticas, así que Next necesita 'unsafe-inline' para sus scripts.
// Aun así, solo se cargan scripts de este mismo sitio y nadie puede meter la app en un marco.
// En desarrollo React necesita 'unsafe-eval'.
const politicaContenido = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${r2}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${r2}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabecerasDeSeguridad = [
  { key: "Content-Security-Policy", value: politicaContenido },
  // Para navegadores viejos que no entienden frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // La cámara no se apaga: el alumno toma la foto con el selector de archivos
  { key: "Permissions-Policy", value: "microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: cabecerasDeSeguridad,
      },
      // El Service Worker siempre se revisa y controla toda la app
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
