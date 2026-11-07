jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));
jest.mock('../src/servicios/reservas', () => ({ obtenerMisReservas: jest.fn(), obtenerEspacios: jest.fn() }));
jest.mock('../src/servicios/cacheReservas', () => ({ guardarReservasEnCache: jest.fn(), leerReservasDeCache: jest.fn() }));

import * as Network from 'expo-network';
import { guardarReservasEnCache, leerReservasDeCache } from '../src/servicios/cacheReservas';
import { ErrorDeApi } from '../src/servicios/errores';
import { cargarMisReservasConRespaldo } from '../src/servicios/misReservas';
import { obtenerEspacios, obtenerMisReservas } from '../src/servicios/reservas';

const m = (fn: unknown) => fn as jest.Mock;
const red = (estado: Record<string, unknown>) => m(Network.getNetworkStateAsync).mockResolvedValue(estado);

const reservasApi = [{ id: 'res-1', turnoId: 'tur-esp-02-20261103-19' }];
const catalogo = [{ id: 'esp-02', nombre: 'Cancha 2' }];
const guardado = { reservas: [{ id: 'res-VIEJA' }], espacios: { 'esp-02': { id: 'esp-02', nombre: 'Cancha 2' } } };

beforeEach(() => {
  red({ isConnected: true, isInternetReachable: true });
  m(obtenerMisReservas).mockResolvedValue(reservasApi);
  m(obtenerEspacios).mockResolvedValue(catalogo);
  m(leerReservasDeCache).mockReturnValue(guardado);
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('con conexión', () => {
  it('trae las reservas de la API, arma el mapa de espacios y guarda la copia', async () => {
    const r = await cargarMisReservasConRespaldo('proximas');
    expect(r).toEqual({ reservas: reservasApi, espacios: { 'esp-02': catalogo[0] }, sinConexion: false });
    expect(obtenerMisReservas).toHaveBeenCalledWith('proximas');
    expect(guardarReservasEnCache).toHaveBeenCalledWith('proximas', reservasApi, { 'esp-02': catalogo[0] });
  });

  it('un fallo al guardar la copia no impide mostrar las reservas', async () => {
    m(guardarReservasEnCache).mockImplementation(() => { throw new Error('disco lleno'); });
    const r = await cargarMisReservasConRespaldo('proximas');
    expect(r.sinConexion).toBe(false);
    expect(r.reservas).toEqual(reservasApi);
  });
});

describe('wifi SIN salida a internet (la API está en la red local: caso de la demo)', () => {
  it('usa la API aunque isInternetReachable sea false', async () => {
    red({ isConnected: true, isInternetReachable: false });
    const r = await cargarMisReservasConRespaldo('proximas');
    expect(obtenerMisReservas).toHaveBeenCalled();
    expect(r.sinConexion).toBe(false);
    expect(r.reservas).toEqual(reservasApi);
  });

  it('usa la API aunque isInternetReachable no venga (undefined)', async () => {
    red({ isConnected: true });
    const r = await cargarMisReservasConRespaldo('proximas');
    expect(r.sinConexion).toBe(false);
  });
});

describe('sin conexión', () => {
  it('con isConnected en false usa lo guardado y no llama a la API', async () => {
    red({ isConnected: false, isInternetReachable: false });
    const r = await cargarMisReservasConRespaldo('proximas');
    expect(r).toEqual({ ...guardado, sinConexion: true });
    expect(obtenerMisReservas).not.toHaveBeenCalled();
  });

  it('si nunca se guardó nada devuelve listas vacías', async () => {
    red({ isConnected: false });
    m(leerReservasDeCache).mockReturnValue(null);
    expect(await cargarMisReservasConRespaldo('pasadas')).toEqual({ reservas: [], espacios: {}, sinConexion: true });
  });

  it('si la copia local está rota devuelve listas vacías (no rompe la pantalla)', async () => {
    red({ isConnected: false });
    m(leerReservasDeCache).mockImplementation(() => { throw new Error('base corrupta'); });
    expect(await cargarMisReservasConRespaldo('proximas')).toEqual({ reservas: [], espacios: {}, sinConexion: true });
  });
});

describe('la API falla estando "conectado"', () => {
  it('si no responde (error de red) usa lo guardado', async () => {
    m(obtenerMisReservas).mockRejectedValue(new TypeError('Network request failed'));
    const r = await cargarMisReservasConRespaldo('proximas');
    expect(r).toEqual({ ...guardado, sinConexion: true });
  });

  it('si responde con un error del servidor usa lo guardado', async () => {
    m(obtenerMisReservas).mockRejectedValue(new ErrorDeApi('Algo falló.', 'ERROR_INTERNO', 500));
    expect((await cargarMisReservasConRespaldo('proximas')).sinConexion).toBe(true);
  });
});

describe('problemas de sesión', () => {
  it('con la sesión vencida NO muestra lo guardado: relanza el error', async () => {
    m(obtenerMisReservas).mockRejectedValue(new ErrorDeApi('Tenés que ingresar.', 'NO_AUTENTICADO', 401));
    await expect(cargarMisReservasConRespaldo('proximas')).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    expect(leerReservasDeCache).not.toHaveBeenCalled();
  });

  it('sin sesión guardada tampoco muestra lo guardado', async () => {
    m(obtenerMisReservas).mockRejectedValue(new ErrorDeApi('Tenés que ingresar con tu cuenta.', 'SIN_SESION'));
    await expect(cargarMisReservasConRespaldo('proximas')).rejects.toMatchObject({ codigo: 'SIN_SESION' });
  });
});
