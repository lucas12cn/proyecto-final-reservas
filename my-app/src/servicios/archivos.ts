import { File, Paths } from 'expo-file-system';

// Copias locales de fotos y videos de las canchas, para verlas sin conexión.
// Usa la API nueva de expo-file-system (File / Paths); la vieja (documentDirectory,
// getInfoAsync, downloadAsync) lanza error en el SDK 57.

// Hash chico (djb2) para distinguir versiones de un archivo sin guardar la URL entera.
const hashear = (texto: string) => {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/**
 * Nombre del archivo local para una URL. Se calcula con la ruta (sin el servidor) porque la IP
 * de la API cambia de una red a otra y no debe invalidar lo ya guardado.
 */
export const nombreDeCache = (prefijo: string, url: string) => {
  const ruta = url.replace(/^https?:\/\/[^/]+/, '');
  const extension = /\.([a-zA-Z0-9]{2,4})(?:\?|$)/.exec(ruta)?.[1] ?? 'bin';
  return `${prefijo}_${hashear(ruta)}.${extension}`;
};

/** URI de la copia local si ya está guardada; si no, null. No usa la red. */
export const archivoGuardado = (nombre: string): string | null => {
  try {
    const archivo = new File(Paths.document, nombre);
    return archivo.exists ? archivo.uri : null;
  } catch {
    return null;
  }
};

/** Descarga la URL (si todavía no está) y devuelve la URI local; null si no se pudo. */
export const guardarArchivo = async (url: string, nombre: string): Promise<string | null> => {
  const destino = new File(Paths.document, nombre);
  try {
    if (!destino.exists) await File.downloadFileAsync(url, destino);
    return destino.uri;
  } catch (error) {
    console.log('No se pudo guardar el archivo en el teléfono:', error);
    try {
      // En Android una descarga cortada puede dejar un archivo incompleto
      if (destino.exists) destino.delete();
    } catch {}
    return null;
  }
};
