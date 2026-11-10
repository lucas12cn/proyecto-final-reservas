export type ResultadoPrueba = { ok: true } | { ok: false; mensaje: string };

const ESPERA_MAXIMA_MS = 5000;

/**
 * Comprueba que en `url` responda la API de reservas (GET /salud). Sirve para verificar la dirección
 * antes de guardarla. Devuelve un mensaje listo para mostrar si algo falla.
 */
export const probarServidor = async (url: string): Promise<ResultadoPrueba> => {
  try {
    const respuesta = await fetch(`${url}/salud`, { signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) });
    if (!respuesta.ok) return { ok: false, mensaje: `El servidor respondió con el error ${respuesta.status}.` };

    const json = await respuesta.json().catch(() => null);
    if (json?.datos?.estado !== 'ok') {
      return { ok: false, mensaje: 'Esa dirección responde, pero no parece ser la API de reservas.' };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      mensaje: 'No se pudo conectar. Revisá que la API esté encendida, que el teléfono esté en la misma red wifi y que la IP sea la correcta.',
    };
  }
};
