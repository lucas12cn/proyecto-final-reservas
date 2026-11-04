let mockEsDispositivo = true;

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('expo-device', () => ({ get isDevice() { return mockEsDispositivo; } }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'proyecto-123' } } }, easConfig: null },
}));
jest.mock('../src/servicios/auth', () => ({
  registrarDispositivoApi: jest.fn(),
  darDeBajaDispositivoApi: jest.fn(),
}));

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { darDeBajaDispositivoApi, registrarDispositivoApi } from '../src/servicios/auth';
import {
  cancelarRecordatorio, cancelarTodosLosRecordatorios, darDeBajaPush, programarRecordatorio,
  registrarParaPush, sincronizarRecordatorios,
} from '../src/servicios/notificaciones';

// El manejador se registra al importar el módulo: se captura antes de que clearMocks limpie las llamadas
const llamadaAlManejador = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0];

const m = (fn: unknown) => fn as jest.Mock;
const permiso = (status: string, canAskAgain = true) => ({ status, canAskAgain });

// Turno de las 19:00 (hora argentina) del 03/11/2026 = 22:00 UTC. El recordatorio va a las 20:00 UTC.
const reserva = (extra: Record<string, unknown> = {}) =>
  ({ id: 'res-1', turnoId: 'tur-esp-02-20261103-19', estado: 'confirmada', espacioId: 'esp-02', ...extra }) as any;

beforeEach(() => {
  mockEsDispositivo = true;
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-03T13:00:00Z')); // 10:00 en Argentina
  jest.replaceProperty(Platform, 'OS', 'ios');
  m(Notifications.getPermissionsAsync).mockResolvedValue(permiso('granted'));
  m(Notifications.requestPermissionsAsync).mockResolvedValue(permiso('granted'));
  m(Notifications.getExpoPushTokenAsync).mockResolvedValue({ data: 'ExponentPushToken[abc]' });
  m(Notifications.scheduleNotificationAsync).mockResolvedValue('id');
  m(SecureStore.getItemAsync).mockResolvedValue(null);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('manejador de notificaciones con la app abierta', () => {
  it('muestra banner, lista y sonido (si no, con la app abierta no se vería nada)', async () => {
    const comportamiento = await llamadaAlManejador[0].handleNotification();
    expect(comportamiento).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true });
  });
});

describe('programarRecordatorio', () => {
  it('programa el aviso 2 horas antes del turno con un identificador por reserva', async () => {
    await expect(programarRecordatorio(reserva(), 'Cancha 2 — Fútbol 5')).resolves.toBe(true);

    const pedido = m(Notifications.scheduleNotificationAsync).mock.calls[0][0];
    expect(pedido.identifier).toBe('recordatorio-res-1');
    expect(pedido.trigger.date).toEqual(new Date('2026-11-03T20:00:00.000Z')); // 17:00 en Argentina
    expect(pedido.trigger.type).toBe('date');
    expect(pedido.content.title).toBe('Tu turno es en 2 horas');
    expect(pedido.content.body).toContain('Cancha 2 — Fútbol 5');
    expect(pedido.content.body).toContain('19:00');
    expect(pedido.content.data).toEqual({ tipo: 'recordatorio', reservaId: 'res-1' });
  });

  it('cancela el anterior antes de programar, para no dejar dos avisos', async () => {
    await programarRecordatorio(reserva());
    const cancelar = m(Notifications.cancelScheduledNotificationAsync).mock.invocationCallOrder[0];
    const programar = m(Notifications.scheduleNotificationAsync).mock.invocationCallOrder[0];
    expect(m(Notifications.cancelScheduledNotificationAsync)).toHaveBeenCalledWith('recordatorio-res-1');
    expect(cancelar).toBeLessThan(programar);
  });

  it('si la reserva no está confirmada, no programa y cancela el que hubiera', async () => {
    for (const estado of ['cancelada', 'cumplida', 'ausente']) {
      m(Notifications.cancelScheduledNotificationAsync).mockClear();
      await expect(programarRecordatorio(reserva({ estado }))).resolves.toBe(false);
      expect(m(Notifications.cancelScheduledNotificationAsync)).toHaveBeenCalledWith('recordatorio-res-1');
    }
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('si faltan menos de 2 horas no programa nada', async () => {
    jest.setSystemTime(new Date('2026-11-03T20:30:00Z')); // 17:30 en Argentina: el aviso ya pasó
    await expect(programarRecordatorio(reserva())).resolves.toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('justo a 2 horas exactas ya no se programa (la hora ya llegó)', async () => {
    jest.setSystemTime(new Date('2026-11-03T20:00:00Z'));
    await expect(programarRecordatorio(reserva())).resolves.toBe(false);
  });

  it('si el id del turno no sirve, no programa', async () => {
    await expect(programarRecordatorio(reserva({ turnoId: 'basura' }))).resolves.toBe(false);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('sin permiso (y sin poder volver a pedirlo) no programa', async () => {
    m(Notifications.getPermissionsAsync).mockResolvedValue(permiso('denied', false));
    await expect(programarRecordatorio(reserva())).resolves.toBe(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('si todavía se puede pedir el permiso, lo pide y programa', async () => {
    m(Notifications.getPermissionsAsync).mockResolvedValue(permiso('undetermined', true));
    await expect(programarRecordatorio(reserva())).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('en la web no programa', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await expect(programarRecordatorio(reserva())).resolves.toBe(false);
  });

  it('nunca lanza: si el sistema falla devuelve false', async () => {
    m(Notifications.scheduleNotificationAsync).mockRejectedValue(new Error('el sistema rechazó el aviso'));
    await expect(programarRecordatorio(reserva())).resolves.toBe(false);
  });
});

describe('cancelar y sincronizar recordatorios', () => {
  it('cancelarRecordatorio usa el identificador de la reserva y no lanza si falla', async () => {
    await cancelarRecordatorio('res-7');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('recordatorio-res-7');

    m(Notifications.cancelScheduledNotificationAsync).mockRejectedValue(new Error('x'));
    await expect(cancelarRecordatorio('res-7')).resolves.toBeUndefined();
  });

  it('cancelarTodosLosRecordatorios los cancela todos', async () => {
    await cancelarTodosLosRecordatorios();
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('sincronizarRecordatorios programa las confirmadas y cancela las demás', async () => {
    await sincronizarRecordatorios(
      [
        reserva({ id: 'res-1', turnoId: 'tur-esp-02-20261103-19' }),
        reserva({ id: 'res-2', turnoId: 'tur-esp-03-20261103-21', espacioId: 'esp-03' }),
        reserva({ id: 'res-3', estado: 'cancelada' }),
      ],
      { 'esp-02': { nombre: 'Cancha 2' }, 'esp-03': { nombre: 'Cancha 3' } }
    );

    const programadas = m(Notifications.scheduleNotificationAsync).mock.calls.map((c) => c[0].identifier);
    expect(programadas).toEqual(['recordatorio-res-1', 'recordatorio-res-2']);
    expect(m(Notifications.cancelScheduledNotificationAsync)).toHaveBeenCalledWith('recordatorio-res-3');
    expect(m(Notifications.scheduleNotificationAsync).mock.calls[1][0].content.body).toContain('Cancha 3');
  });
});

describe('registrarParaPush', () => {
  it('obtiene el token con el projectId, lo anota en la API y lo guarda', async () => {
    await expect(registrarParaPush()).resolves.toBe('ExponentPushToken[abc]');
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proyecto-123' });
    expect(registrarDispositivoApi).toHaveBeenCalledWith('ExponentPushToken[abc]', 'ios');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('tokenPushExpo', 'ExponentPushToken[abc]');
  });

  it('en Android crea el canal de notificaciones antes de pedir el permiso', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await registrarParaPush();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({ importance: 5 }));
    expect(registrarDispositivoApi).toHaveBeenCalledWith('ExponentPushToken[abc]', 'android');
  });

  it('en un emulador (sin teléfono real) no hace nada', async () => {
    mockEsDispositivo = false;
    await expect(registrarParaPush()).resolves.toBeNull();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('si el usuario no da permiso devuelve null y no registra el teléfono', async () => {
    m(Notifications.getPermissionsAsync).mockResolvedValue(permiso('denied'));
    m(Notifications.requestPermissionsAsync).mockResolvedValue(permiso('denied'));
    await expect(registrarParaPush()).resolves.toBeNull();
    expect(registrarDispositivoApi).not.toHaveBeenCalled();
  });

  it('nunca lanza: si falla algo (Expo Go en Android, sin projectId…) devuelve null', async () => {
    m(Notifications.getExpoPushTokenAsync).mockRejectedValue(new Error('No se pudo obtener el token'));
    await expect(registrarParaPush()).resolves.toBeNull();
    expect(registrarDispositivoApi).not.toHaveBeenCalled();
  });

  it('en la web no hace nada', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await expect(registrarParaPush()).resolves.toBeNull();
  });
});

describe('darDeBajaPush', () => {
  it('da de baja el token guardado y lo borra del teléfono', async () => {
    m(SecureStore.getItemAsync).mockResolvedValue('ExponentPushToken[abc]');
    await darDeBajaPush();
    expect(darDeBajaDispositivoApi).toHaveBeenCalledWith('ExponentPushToken[abc]');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('tokenPushExpo');
  });

  it('sin token guardado no llama a la API', async () => {
    await darDeBajaPush();
    expect(darDeBajaDispositivoApi).not.toHaveBeenCalled();
  });

  it('si la API falla no lanza (no debe impedir cerrar sesión)', async () => {
    m(SecureStore.getItemAsync).mockResolvedValue('ExponentPushToken[abc]');
    m(darDeBajaDispositivoApi).mockRejectedValue(new Error('sin red'));
    await expect(darDeBajaPush()).resolves.toBeUndefined();
  });
});
