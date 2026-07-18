// =============================================
// Cloudinary — Upload directo desde el cliente (unsigned preset)
// =============================================

/** Resultado exitoso de la subida a Cloudinary */
export interface CloudinaryUploadResult {
  /** URL segura (HTTPS) de la imagen subida */
  secure_url: string;
  /** Identificador público para transformaciones y eliminación */
  public_id: string;
}

// =============================================
// Compresión de imagen en el navegador
// =============================================

/**
 * Comprime una imagen del lado del cliente usando la API de Canvas.
 * - Redimensiona a un máximo de `maxWidth` píxeles de ancho (mantiene proporción).
 * - Convierte a formato WebP con calidad configurable.
 *
 * @param file - Archivo de imagen original (File del input)
 * @param maxWidth - Ancho máximo en píxeles (default: 800)
 * @param quality - Calidad WebP entre 0 y 1 (default: 0.8)
 * @returns Blob comprimido en formato WebP
 */
export async function comprimirImagen(
  file: File,
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calcular dimensiones manteniendo la proporción
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      // Dibujar en canvas y exportar como WebP
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto 2D del canvas."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Error al comprimir la imagen."));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Error al cargar la imagen para compresión."));
    };

    img.src = url;
  });
}

// =============================================
// Upload a Cloudinary
// =============================================

/**
 * Comprime y sube una imagen directamente a Cloudinary usando un unsigned upload preset.
 * Todo ocurre en el navegador — no necesita servidor intermedio.
 *
 * @param file - Archivo de imagen desde un `<input type="file">`
 * @param folder - Carpeta destino dentro de Cloudinary (default: "asistencia_misa")
 * @returns Objeto con `secure_url` y `public_id`
 *
 * @example
 * ```tsx
 * const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0];
 *   if (!file) return;
 *
 *   const { secure_url, public_id } = await subirImagenCloudinary(file);
 *   console.log("Imagen subida:", secure_url);
 * };
 * ```
 */
export async function subirImagenCloudinary(
  file: File,
  folder: string = "asistencia_misa"
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Faltan las variables de entorno NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME " +
        "y/o NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET. Revisa tu archivo .env.local"
    );
  }

  // 1. Comprimir la imagen en el navegador
  const blobComprimido = await comprimirImagen(file);

  // 2. Preparar el FormData para la API de Cloudinary
  const formData = new FormData();
  formData.append("file", blobComprimido, "comprimida.webp");
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  // 3. Subir directamente a Cloudinary (unsigned upload)
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Error al subir imagen a Cloudinary (${response.status}): ${errorBody}`
    );
  }

  const result = await response.json();

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
}
