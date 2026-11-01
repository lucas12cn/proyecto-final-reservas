import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Reserva } from '../tipos';
import { darDeBajaDispositivoApi, registrarDispositivoApi } from './auth';
import { leerTurnoId } from './turnos';

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

// Desde Android 8 una notificación necesita un canal; sin él no aparece ni el pedido de permiso.
const asegurarCanalAndroid = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Avisos de reservas',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
};

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

    await asegurarCanalAndroid();

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

// ---------------------------------------------------------------------------------------------
// Recordatorio local: "Tu turno es en 2 horas". Lo programa el teléfono (no el servidor): sigue
// funcionando sin señal. Cada recordatorio tiene un identificador fijo por reserva, así
// programarlo dos veces no lo duplica y se puede cancelar sabiendo sólo el id de la reserva.
// ---------------------------------------------------------------------------------------------
const HORAS_DE_ANTICIPACION = 2;
const idDelRecordatorio = (reservaId: string) => `recordatorio-${reservaId}`;

/** Cancela el recordatorio de una reserva (si no existe, no pasa nada). */
export const cancelarRecordatorio = async (reservaId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(idDelRecordatorio(reservaId));
  } catch (error) {
    console.log('No se pudo cancelar el recordatorio:', error);
  }
};

/** Cancela todos los recordatorios (al cerrar sesión: son de esa cuenta). */
export const cancelarTodosLosRecordatorios = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log('No se pudieron cancelar los recordatorios:', error);
  }
};

/**
 * Programa el aviso para 2 horas antes del turno. Devuelve true si quedó programado.
 * No programa (y devuelve false) si la reserva no está confirmada, si faltan menos de 2 horas
 * o si el usuario no dio permiso de notificaciones. Nunca lanza.
 */
export const programarRecordatorio = async (
  reserva: Pick<Reserva, 'id' | 'turnoId' | 'estado'>,
  nombreEspacio?: string,
): Promise<boolean> => {
  try {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;

    // Una reserva cancelada, cumplida o ausente no debe recordar nada.
    if (reserva.estado !== 'confirmada') {
      await cancelarRecordatorio(reserva.id);
      return false;
    }

    const turno = leerTurnoId(reserva.turnoId);
    if (!turno) return false;

    const cuando = new Date(turno.inicio.getTime() - HORAS_DE_ANTICIPACION * 60 * 60 * 1000);
    if (cuando.getTime() <= Date.now()) return false; // faltan menos de 2 h (o ya empezó)

    let permiso = await Notifications.getPermissionsAsync();
    if (permiso.status !== 'granted' && permiso.canAskAgain) {
      permiso = await Notifications.requestPermissionsAsync();
    }
    if (permiso.status !== 'granted') return false;

    await asegurarCanalAndroid();

    // Se cancela antes por las dudas: así reprogramar nunca deja dos avisos.
    await cancelarRecordatorio(reserva.id);
    await Notifications.scheduleNotificationAsync({
      identifier: idDelRecordatorio(reserva.id),
      content: {
        title: 'Tu turno es en 2 horas',
        body: `${nombreEspacio ?? 'Tu cancha'} · ${turno.hora}. Tené a mano el código QR.`,
        data: { tipo: 'recordatorio', reservaId: reserva.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: cuando,
        channelId: 'default',
      },
    });
    return true;
  } catch (error) {
    console.log('No se pudo programar el recordatorio:', error);
    return false;
  }
};

/**
 * Deja los recordatorios al día con la lista de reservas que devolvió la API: programa los de
 * las confirmadas y cancela los de las que ya no lo están (por ejemplo, las que canceló un
 * bloqueo del encargado).
 */
export const sincronizarRecordatorios = async (
  reservas: Pick<Reserva, 'id' | 'turnoId' | 'estado' | 'espacioId'>[],
  espacios: Record<string, { nombre?: string }>,
): Promise<void> => {
  for (const reserva of reservas) {
    await programarRecordatorio(reserva, espacios[reserva.espacioId]?.nombre);
  }
};
