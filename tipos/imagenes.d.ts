// Tipos para importar imágenes (import logo from "….webp"), como el logo de components/ui/logo.tsx.
// next-env.d.ts ya los trae, pero Next lo genera recién con `next dev`/`next build` y está en
// .gitignore: sin este archivo, `npx tsc --noEmit` falla en la CI, que corre antes del build.
/// <reference types="next/image-types/global" />
