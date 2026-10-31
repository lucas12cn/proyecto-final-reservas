import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { darDeBajaDispositivoApi, registrarDispositivoApi } from './auth';

const CLAVE_TOKEN_PUSH = 'tokenPushExpo';

// Qué hacer con un aviso que llega con la app abierta: mostrarlo igual (banner + lista).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Pide permiso, obtiene el token de Expo de ESTE teléfono y se lo anota a la API.
 * Devuelve el token, o null si no se pudo (emulador sin Google Play, permiso denegado,
 * Expo Go en Android, etc.). Nunca tira: las notificaciones no pueden romper el login.
 */
export const registrarParaPush = async (): Promise<string | null> => {
  try {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
    if (!Device.isDevice) {
      console.log('Push: hace falta un teléfono real (o un emulador con Google Play).');
      return null;
    }

    if (Platform.OS === 'android') {
      // Desde Android 8 hace falta un canal; sin él no aparece ni el pedido de permiso.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos de reservas',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') {
      console.log('Push: el usuario no dio permiso para notificaciones.');
      return null;
    }

    // Sale de `eas init` (extra.eas.projectId en app.json / app.config).
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: tokenExpo } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    await registrarDispositivoApi(tokenExpo, Platform.OS);
    await SecureStore.setItemAsync(CLAVE_TOKEN_PUSH, tokenExpo);
    return tokenExpo;
  } catch (error) {
    console.log('Push: no se pudo registrar el teléfono:', error);
    return null;
  }
};

/** Da de baja el token de este teléfono. Llamar ANTES de borrar la sesión (usa su token). */
export const darDeBajaPush = async (): Promise<void> => {
  try {
    const tokenExpo = await SecureStore.getItemAsync(CLAVE_TOKEN_PUSH);
    if (!tokenExpo) return;
    await darDeBajaDispositivoApi(tokenExpo);
    await SecureStore.deleteItemAsync(CLAVE_TOKEN_PUSH);
  } catch (error) {
    console.log('Push: no se pudo dar de baja el teléfono:', error);
  }
};
