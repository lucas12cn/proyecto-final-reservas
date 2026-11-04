const mockAlmacen = new Map<string, string>();
const mockOrden: string[] = [];

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockAlmacen.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { mockAlmacen.set(k, v); }),
  deleteItemAsync: jest.fn(async (k: string) => { mockOrden.push(`borrar:${k}`); mockAlmacen.delete(k); }),
}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../src/servicios/auth', () => ({
  iniciarSesionApi: jest.fn(),
  registrarUsuarioApi: jest.fn(),
}));
jest.mock('../src/servicios/notificaciones', () => ({
  registrarParaPush: jest.fn(async () => null),
  darDeBajaPush: jest.fn(async () => { mockOrden.push('darDeBajaPush'); }),
  cancelarTodosLosRecordatorios: jest.fn(async () => { mockOrden.push('cancelarRecordatorios'); }),
}));

import { Alert } from 'react-native';
import { router } from 'expo-router';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/contexto/AuthContext';
import { errorDesdeRespuesta } from '../src/servicios/errores';
import { iniciarSesionApi, registrarUsuarioApi } from '../src/servicios/auth';
import { cancelarTodosLosRecordatorios, darDeBajaPush, registrarParaPush } from '../src/servicios/notificaciones';

const usuario = { id: 'usr-207', nombre: 'Emiliano Ruiz', email: 'emiliano@mail.com', rol: 'jugador' } as any;
const m = (fn: unknown) => fn as jest.Mock;

// Una respuesta de error de la API con el código NO_AUTENTICADO
const respuestaVencida = () =>
  ({ ok: false, status: 401, json: async () => ({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Tenés que ingresar.' } }) }) as unknown as Response;

const montar = async () => {
  const vista = await renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(vista.result.current.cargandoSesion).toBe(false));
  return vista;
};

beforeEach(() => {
  mockAlmacen.clear();
  mockOrden.length = 0;
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('arranque', () => {
  it('sin sesión guardada queda sin usuario', async () => {
    const { result } = await montar();
    expect(result.current.usuario).toBeNull();
    expect(result.current.token).toBeNull();
    expect(registrarParaPush).not.toHaveBeenCalled();
  });

  it('con sesión guardada la recupera y vuelve a registrar el teléfono para push', async () => {
    mockAlmacen.set('tokenReserva', 'TOKEN');
    mockAlmacen.set('usuarioReserva', JSON.stringify(usuario));

    const { result } = await montar();
    expect(result.current.token).toBe('TOKEN');
    expect(result.current.usuario).toEqual(usuario);
    expect(registrarParaPush).toHaveBeenCalledTimes(1);
  });

  it('useAuth fuera del AuthProvider lanza un error claro', async () => {
    await expect(renderHook(() => useAuth())).rejects.toThrow('useAuth debe ser usado dentro de un AuthProvider');
  });
});

describe('login y registro', () => {
  it('login guarda la sesión, la expone y registra el teléfono', async () => {
    m(iniciarSesionApi).mockResolvedValue({ token: 'T-NUEVO', usuario });
    const { result } = await montar();

    await act(async () => { await result.current.login('emiliano@mail.com', 'villaguay2026'); });

    expect(iniciarSesionApi).toHaveBeenCalledWith('emiliano@mail.com', 'villaguay2026');
    expect(result.current.usuario).toEqual(usuario);
    expect(mockAlmacen.get('tokenReserva')).toBe('T-NUEVO');
    expect(JSON.parse(mockAlmacen.get('usuarioReserva')!)).toEqual(usuario);
    expect(registrarParaPush).toHaveBeenCalled();
  });

  it('si el login falla no deja nada guardado y propaga el error', async () => {
    m(iniciarSesionApi).mockRejectedValue(new Error('El email o la contraseña no son correctos.'));
    const { result } = await montar();

    await expect(act(async () => { await result.current.login('x@x.com', 'mal'); })).rejects.toThrow('no son correctos');
    expect(result.current.usuario).toBeNull();
    expect(mockAlmacen.size).toBe(0);
  });

  it('registro crea la cuenta y deja la sesión iniciada', async () => {
    m(registrarUsuarioApi).mockResolvedValue({ token: 'T-REG', usuario });
    const { result } = await montar();

    await act(async () => { await result.current.registro('Emiliano Ruiz', 'emiliano@mail.com', '3455-401122', 'villaguay2026'); });
    expect(registrarUsuarioApi).toHaveBeenCalledWith('Emiliano Ruiz', 'emiliano@mail.com', '3455-401122', 'villaguay2026');
    expect(result.current.usuario).toEqual(usuario);
  });
});

describe('logout', () => {
  it('da de baja el teléfono ANTES de borrar la sesión (la baja necesita el token)', async () => {
    mockAlmacen.set('tokenReserva', 'TOKEN');
    mockAlmacen.set('usuarioReserva', JSON.stringify(usuario));
    const { result } = await montar();

    await act(async () => { await result.current.logout(); });

    expect(mockOrden.indexOf('darDeBajaPush')).toBeGreaterThanOrEqual(0);
    expect(mockOrden.indexOf('darDeBajaPush')).toBeLessThan(mockOrden.indexOf('borrar:tokenReserva'));
    expect(cancelarTodosLosRecordatorios).toHaveBeenCalledTimes(1);
    expect(result.current.usuario).toBeNull();
    expect(result.current.token).toBeNull();
    expect(mockAlmacen.has('tokenReserva')).toBe(false);
    expect(mockAlmacen.has('usuarioReserva')).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/login');
  });
});

describe('sesión vencida', () => {
  const conSesion = async () => {
    mockAlmacen.set('tokenReserva', 'TOKEN-VENCIDO');
    mockAlmacen.set('usuarioReserva', JSON.stringify(usuario));
    return montar();
  };

  it('cuando la API responde NO_AUTENTICADO cierra la sesión, avisa y vuelve al ingreso', async () => {
    const { result } = await conSesion();

    await act(async () => { await errorDesdeRespuesta(respuestaVencida(), 'x'); });

    await waitFor(() => expect(result.current.usuario).toBeNull());
    expect(mockAlmacen.has('tokenReserva')).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Sesión vencida', expect.any(String));
    expect(router.replace).toHaveBeenCalledWith('/login');
    expect(cancelarTodosLosRecordatorios).toHaveBeenCalled();
  });

  it('varios pedidos que fallan a la vez muestran un solo aviso', async () => {
    const { result } = await conSesion();

    await act(async () => {
      await Promise.all([
        errorDesdeRespuesta(respuestaVencida(), 'x'),
        errorDesdeRespuesta(respuestaVencida(), 'x'),
        errorDesdeRespuesta(respuestaVencida(), 'x'),
      ]);
    });

    await waitFor(() => expect(result.current.usuario).toBeNull());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(m(router.replace).mock.calls.filter((c) => c[0] === '/login')).toHaveLength(1);
  });

  it('si ya no hay sesión guardada no hace nada', async () => {
    await montar();
    await act(async () => { await errorDesdeRespuesta(respuestaVencida(), 'x'); });
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('un cierre de sesión en curso no dispara además el aviso de sesión vencida', async () => {
    const { result } = await conSesion();
    // La baja del teléfono tarda; mientras tanto la API responde NO_AUTENTICADO
    let liberar: () => void = () => {};
    m(darDeBajaPush).mockImplementationOnce(() => new Promise<void>((r) => { liberar = r; }));

    let cierre!: Promise<void>;
    await act(async () => { cierre = result.current.logout(); });
    await act(async () => { await errorDesdeRespuesta(respuestaVencida(), 'x'); });
    expect(Alert.alert).not.toHaveBeenCalled();

    await act(async () => { liberar(); await cierre; });
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(result.current.usuario).toBeNull();
  });
});
