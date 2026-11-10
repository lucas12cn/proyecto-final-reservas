import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * ¿Se puede dibujar el mapa nativo?
 *  - iPhone: sí (Apple Maps, no necesita clave).
 *  - Expo Go: sí (trae su propia configuración de mapas).
 *  - Build de Android (APK/AAB): sólo si se compiló con la clave de Google Maps
 *    (`GOOGLE_MAPS_API_KEY`, que `app.config.js` registra en `extra.googleMapsConfigurada`). Sin
 *    clave el manifiesto no declara la del SDK y el mapa no se dibuja (o cierra la app), así que en
 *    ese caso la pantalla muestra la lista de complejos con "Cómo llegar".
 */
export const mapaDisponible = (): boolean => {
  if (Platform.OS !== 'android') return true;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return true;
  return Constants.expoConfig?.extra?.googleMapsConfigurada === true;
};
