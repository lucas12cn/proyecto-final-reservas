// Dirección de la API. Se lee de la variable de entorno EXPO_PUBLIC_API_URL (archivo `.env.local`
// de my-app, ver `.env.example`); si no está definida se usa la de abajo.
// Después de cambiarla hay que reiniciar Expo con `npx expo start -c`.
const URL_POR_DEFECTO = 'http://192.168.1.6:3000';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || URL_POR_DEFECTO).replace(/\/+$/, '');
