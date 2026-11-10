import Storage from 'expo-sqlite/kv-store';

// Dirección de la API. Se resuelve así, de mayor a menor prioridad:
//   1. La que se escribió en la app (pantalla de entrada o perfil → "Servidor"). Se guarda en
//      kv-store y sobrevive al cierre de la app. Sirve para que un APK ya compilado hable con la API
//      local de cualquier red, sin recompilar.
//   2. La variable EXPO_PUBLIC_API_URL (`.env.local`; ver `.env.example`). Tras cambiarla hay que
//      reiniciar Expo con `npx expo start -c`.
//   3. La dirección por defecto de abajo.
const CLAVE = 'apiUrlPersonalizada';
export const URL_POR_DEFECTO = 'http://192.168.1.6:3000';

// Se lee una sola vez, al cargar el módulo (Metro incorpora EXPO_PUBLIC_* al compilar)
const DE_ENTORNO = (process.env.EXPO_PUBLIC_API_URL || URL_POR_DEFECTO).replace(/\/+$/, '');

/**
 * Deja una dirección en la forma `http(s)://host[:puerto]` (sin barra final ni ruta), o devuelve null
 * si no es válida. Si falta el esquema se asume `http://` ("192.168.0.10:3000" → "http://192.168.0.10:3000").
 */
export const normalizarUrlApi = (texto: string): string | null => {
  let url = texto.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, '');
  return /^https?:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/.test(url) ? url : null;
};

const leerGuardada = (): string | null => {
  try {
    const guardada = Storage.getItemSync(CLAVE);
    return guardada ? normalizarUrlApi(guardada) : null;
  } catch {
    return null;
  }
};

let personalizada: string | null = leerGuardada();

/** Dirección de la API vigente. Se llama en cada pedido: así un cambio rige de inmediato. */
export const apiUrl = (): string => personalizada ?? DE_ENTORNO;

/** ¿Hay una dirección escrita en la app (en vez de la del entorno)? */
export const hayUrlPersonalizada = (): boolean => personalizada !== null;

/**
 * Guarda la dirección escrita en la app. Con `null` o texto vacío vuelve a la del entorno.
 * Lanza un error con un mensaje listo para mostrar si la dirección no es válida.
 */
export const fijarApiUrl = (texto: string | null): void => {
  if (texto === null || !texto.trim()) {
    personalizada = null;
    try { Storage.removeItemSync(CLAVE); } catch { /* sigue rigiendo hasta cerrar la app */ }
    return;
  }
  const normalizada = normalizarUrlApi(texto);
  if (!normalizada) throw new Error('La dirección no es válida. Ejemplo: http://192.168.0.10:3000');
  personalizada = normalizada;
  try { Storage.setItemSync(CLAVE, normalizada); } catch { /* sigue rigiendo hasta cerrar la app */ }
};
