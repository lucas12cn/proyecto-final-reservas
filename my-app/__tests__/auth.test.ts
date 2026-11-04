jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn() }));
jest.mock('../src/servicios/config', () => ({ API_URL: 'http://api.test' }));

import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import {
  actualizarPerfilApi, darDeBajaDispositivoApi, iniciarSesionApi, registrarDispositivoApi,
  registrarUsuarioApi,
} from '../src/servicios/auth';
import { codigoDe } from '../src/servicios/errores';

const fetchMock = jest.fn();
(globalThis as any).fetch = fetchMock;

const ok = (datos: unknown, estado = 200) => ({ ok: true, status: estado, json: async () => ({ datos, meta: null }) }) as unknown as Response;
const sinCuerpo = () => ({ ok: true, status: 204, json: async () => { throw new Error('204'); } }) as unknown as Response;
const falla = (estado: number, codigo: string, mensaje: string) =>
  ({ ok: false, status: estado, json: async () => ({ error: { codigo, mensaje } }) }) as unknown as Response;

const pedido = (n = 0) => ({ url: fetchMock.mock.calls[n][0] as string, opciones: (fetchMock.mock.calls[n][1] ?? {}) as any });
const sesion = (token: string | null) => (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(token);

beforeEach(() => {
  fetchMock.mockReset();
  (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: true });
  sesion('TOKEN-123');
});

describe('iniciarSesionApi', () => {
  it('manda email y contraseña y devuelve token y usuario', async () => {
    fetchMock.mockResolvedValue(ok({ token: 'T', usuario: { id: 'usr-207' } }));
    await expect(iniciarSesionApi('emiliano@mail.com', 'villaguay2026')).resolves.toEqual({ token: 'T', usuario: { id: 'usr-207' } });

    expect(pedido().url).toBe('http://api.test/auth/ingreso');
    expect(pedido().opciones.method).toBe('POST');
    expect(JSON.parse(pedido().opciones.body)).toEqual({ email: 'emiliano@mail.com', contrasena: 'villaguay2026' });
    expect(pedido().opciones.headers.Authorization).toBeUndefined(); // todavía no hay sesión
  });

  it('con credenciales incorrectas muestra el mensaje de la API', async () => {
    fetchMock.mockResolvedValue(falla(401, 'CREDENCIALES_INVALIDAS', 'El email o la contraseña no son correctos.'));
    const error = await iniciarSesionApi('x@x.com', 'mal').catch((e) => e);
    expect(error.message).toBe('El email o la contraseña no son correctos.');
    expect(codigoDe(error)).toBe('CREDENCIALES_INVALIDAS');
  });

  it('sin conexión no llama a la API', async () => {
    (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: false });
    await expect(iniciarSesionApi('a@a.com', 'x')).rejects.toThrow('Sin conexión');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('registrarUsuarioApi', () => {
  it('manda los cuatro datos del registro (el teléfono es obligatorio)', async () => {
    fetchMock.mockResolvedValue(ok({ token: 'T', usuario: {} }, 201));
    await registrarUsuarioApi('Ana Gómez', 'ana@mail.com', '3455-111222', 'villaguay2026');
    expect(pedido().url).toBe('http://api.test/auth/registro');
    expect(JSON.parse(pedido().opciones.body)).toEqual({
      nombre: 'Ana Gómez', email: 'ana@mail.com', telefono: '3455-111222', contrasena: 'villaguay2026',
    });
  });

  it('si el email ya existe muestra el mensaje de la API', async () => {
    fetchMock.mockResolvedValue(falla(409, 'EMAIL_YA_REGISTRADO', 'Ese email ya está registrado.'));
    await expect(registrarUsuarioApi('Ana', 'ana@mail.com', '1', 'x')).rejects.toThrow('Ese email ya está registrado.');
  });
});

describe('actualizarPerfilApi', () => {
  it('hace PATCH /yo con el token y los datos', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'usr-207', nombre: 'Nuevo' }));
    await actualizarPerfilApi({ nombre: 'Nuevo' });
    expect(pedido().url).toBe('http://api.test/yo');
    expect(pedido().opciones.method).toBe('PATCH');
    expect(pedido().opciones.headers.Authorization).toBe('Bearer TOKEN-123');
    expect(JSON.parse(pedido().opciones.body)).toEqual({ nombre: 'Nuevo' });
  });

  it('sin sesión falla con SIN_SESION', async () => {
    sesion(null);
    await expect(actualizarPerfilApi({ nombre: 'Nuevo' })).rejects.toMatchObject({ codigo: 'SIN_SESION' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('dispositivos para push', () => {
  it('registrarDispositivoApi manda tokenExpo y plataforma', async () => {
    fetchMock.mockResolvedValue(ok({ tokenExpo: 'ExponentPushToken[abc]', plataforma: 'android' }, 201));
    await registrarDispositivoApi('ExponentPushToken[abc]', 'android');
    expect(pedido().url).toBe('http://api.test/dispositivos');
    expect(pedido().opciones.headers.Authorization).toBe('Bearer TOKEN-123');
    expect(JSON.parse(pedido().opciones.body)).toEqual({ tokenExpo: 'ExponentPushToken[abc]', plataforma: 'android' });
  });

  it('sin sesión no hay a quién anotarle el teléfono: no llama a la API ni falla', async () => {
    sesion(null);
    await expect(registrarDispositivoApi('ExponentPushToken[abc]', 'ios')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si la API rechaza el alta, lanza el error', async () => {
    fetchMock.mockResolvedValue(falla(400, 'VALIDACION_FALLIDA', 'El token de Expo no tiene un formato válido.'));
    await expect(registrarDispositivoApi('basura', 'ios')).rejects.toThrow('formato válido');
  });

  it('darDeBajaDispositivoApi codifica los corchetes del token en la URL', async () => {
    fetchMock.mockResolvedValue(sinCuerpo());
    await darDeBajaDispositivoApi('ExponentPushToken[abc]');
    expect(pedido().url).toBe('http://api.test/dispositivos/ExponentPushToken%5Babc%5D');
    expect(pedido().opciones.method).toBe('DELETE');
  });

  it('darDeBajaDispositivoApi sin sesión no hace nada', async () => {
    sesion(null);
    await darDeBajaDispositivoApi('ExponentPushToken[abc]');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
