jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn() }));
jest.mock('../src/servicios/config', () => ({ apiUrl: () => 'http://api.test' }));
jest.mock('../src/servicios/db', () => ({
  guardarEspaciosEnTelefono: jest.fn(),
  leerEspaciosDelTelefono: jest.fn(),
  guardarDeportesEnTelefono: jest.fn(),
  leerDeportesDelTelefono: jest.fn(),
}));

import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import * as db from '../src/servicios/db';
import * as S from '../src/servicios/reservas';
import { codigoDe, registrarAlSesionVencida } from '../src/servicios/errores';

const fetchMock = jest.fn();
(globalThis as any).fetch = fetchMock;

const ok = (datos: unknown, meta: unknown = null, estado = 200) =>
  ({ ok: true, status: estado, json: async () => ({ datos, meta }) }) as unknown as Response;
const sinCuerpo = () => ({ ok: true, status: 204, json: async () => { throw new Error('204 no tiene cuerpo'); } }) as unknown as Response;
const falla = (estado: number, codigo: string, mensaje: string) =>
  ({ ok: false, status: estado, json: async () => ({ error: { codigo, mensaje } }) }) as unknown as Response;

const sesion = (token: string | null) => (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(token);
const sinRed = () => (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: false });
const conRed = () => (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({ isConnected: true });
const pedido = (n = 0) => ({ url: fetchMock.mock.calls[n][0] as string, opciones: (fetchMock.mock.calls[n][1] ?? {}) as any });

beforeEach(() => {
  fetchMock.mockReset();
  conRed();
  sesion('TOKEN-123');
  (db.leerEspaciosDelTelefono as jest.Mock).mockReturnValue([]);
  (db.leerDeportesDelTelefono as jest.Mock).mockReturnValue([]);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('crearReserva', () => {
  it('manda turnoId y cantidadPersonas con el token de la sesión', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'res-1', codigoQr: 'VGY-0919-19-K3X9QM' }, null, 201));
    const reserva = await S.crearReserva('tur-esp-02-20260919-19', 8);

    const { url, opciones } = pedido();
    expect(url).toBe('http://api.test/reservas');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe('Bearer TOKEN-123');
    expect(JSON.parse(opciones.body)).toEqual({ turnoId: 'tur-esp-02-20260919-19', cantidadPersonas: 8 });
    expect(reserva.codigoQr).toBe('VGY-0919-19-K3X9QM');
  });

  it('sin sesión falla con SIN_SESION y no llama a la red', async () => {
    sesion(null);
    await expect(S.crearReserva('tur-esp-02-20260919-19', 8)).rejects.toMatchObject({ codigo: 'SIN_SESION' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el turno ya está ocupado lanza el error de la API con su mensaje', async () => {
    fetchMock.mockResolvedValue(falla(409, 'TURNO_OCUPADO', 'Ese turno ya fue reservado.'));
    const error = await S.crearReserva('tur-esp-02-20260919-19', 8).catch((e) => e);
    expect(codigoDe(error)).toBe('TURNO_OCUPADO');
    expect(error.message).toBe('Ese turno ya fue reservado.');
  });

  it('si la API dice NO_AUTENTICADO avisa que la sesión venció', async () => {
    const alVencer = jest.fn();
    const darDeBaja = registrarAlSesionVencida(alVencer);
    fetchMock.mockResolvedValue(falla(401, 'NO_AUTENTICADO', 'Tenés que ingresar.'));

    await expect(S.crearReserva('tur-esp-02-20260919-19', 8)).rejects.toMatchObject({ codigo: 'NO_AUTENTICADO' });
    expect(alVencer).toHaveBeenCalledTimes(1);
    darDeBaja();
  });

  it('sin conexión lanza el aviso de red y no llama a la API', async () => {
    sinRed();
    await expect(S.crearReserva('tur-esp-02-20260919-19', 8)).rejects.toThrow('Sin conexión');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('cancelarReserva y mis reservas', () => {
  it('cancelarReserva hace POST a /reservas/:id/cancelacion', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'res-1', estado: 'cancelada' }));
    await S.cancelarReserva('res-1');
    expect(pedido().url).toBe('http://api.test/reservas/res-1/cancelacion');
    expect(pedido().opciones.method).toBe('POST');
  });

  it('si ya pasó el plazo muestra el mensaje de la API', async () => {
    fetchMock.mockResolvedValue(falla(422, 'CANCELACION_FUERA_DE_PLAZO', 'Ya no podés cancelar: avisá al encargado.'));
    await expect(S.cancelarReserva('res-1')).rejects.toThrow('avisá al encargado');
  });

  it('obtenerMisReservas pide el filtro indicado', async () => {
    fetchMock.mockResolvedValue(ok([]));
    await S.obtenerMisReservas('proximas');
    expect(pedido().url).toBe('http://api.test/yo/reservas?cuando=proximas');
    await S.obtenerMisReservas('pasadas');
    expect(pedido(1).url).toBe('http://api.test/yo/reservas?cuando=pasadas');
  });
});

describe('catálogo con respaldo sin conexión', () => {
  const canchas = [{ id: 'esp-01', nombre: 'Cancha 1' }, { id: 'esp-02', nombre: 'Cancha 2' }];

  it('obtenerEspacios guarda lo descargado en el teléfono', async () => {
    fetchMock.mockResolvedValue(ok(canchas));
    await expect(S.obtenerEspacios()).resolves.toEqual(canchas);
    expect(db.guardarEspaciosEnTelefono).toHaveBeenCalledWith(canchas);
  });

  it('sin conexión devuelve lo último guardado', async () => {
    sinRed();
    (db.leerEspaciosDelTelefono as jest.Mock).mockReturnValue(canchas);
    await expect(S.obtenerEspacios()).resolves.toEqual(canchas);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si la API falla también devuelve lo guardado', async () => {
    fetchMock.mockResolvedValue(falla(500, 'ERROR_INTERNO', 'Algo falló.'));
    (db.leerEspaciosDelTelefono as jest.Mock).mockReturnValue(canchas);
    await expect(S.obtenerEspacios()).resolves.toEqual(canchas);
  });

  it('si además la lectura local falla, devuelve una lista vacía (no rompe la pantalla)', async () => {
    sinRed();
    (db.leerEspaciosDelTelefono as jest.Mock).mockImplementation(() => { throw new Error('base corrupta'); });
    await expect(S.obtenerEspacios()).resolves.toEqual([]);
  });

  it('un fallo al guardar no impide mostrar el catálogo', async () => {
    fetchMock.mockResolvedValue(ok(canchas));
    (db.guardarEspaciosEnTelefono as jest.Mock).mockImplementation(() => { throw new Error('disco lleno'); });
    await expect(S.obtenerEspacios()).resolves.toEqual(canchas);
  });

  it('obtenerEspacioPorId busca en lo guardado cuando no hay conexión', async () => {
    sinRed();
    (db.leerEspaciosDelTelefono as jest.Mock).mockReturnValue(canchas);
    await expect(S.obtenerEspacioPorId('esp-02')).resolves.toEqual(canchas[1]);
    await expect(S.obtenerEspacioPorId('esp-99')).resolves.toBeNull();
  });

  it('obtenerDeportes usa el respaldo sin conexión y guarda al descargar', async () => {
    const deportes = [{ id: 'dep-futbol5', nombre: 'Fútbol 5' }];
    fetchMock.mockResolvedValue(ok(deportes));
    await expect(S.obtenerDeportes()).resolves.toEqual(deportes);
    expect(db.guardarDeportesEnTelefono).toHaveBeenCalledWith(deportes);

    sinRed();
    (db.leerDeportesDelTelefono as jest.Mock).mockReturnValue(deportes);
    await expect(S.obtenerDeportes()).resolves.toEqual(deportes);
  });
});

describe('favoritos', () => {
  it('obtenerMisFavoritos cruza los ids del usuario con el catálogo', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ id: 'usr-1', espaciosFavoritos: ['esp-02'] }))
      .mockResolvedValueOnce(ok([{ id: 'esp-01' }, { id: 'esp-02' }]));
    await expect(S.obtenerMisFavoritos()).resolves.toEqual([{ id: 'esp-02' }]);
  });

  it('sin sesión devuelve una lista vacía', async () => {
    sesion(null);
    await expect(S.obtenerMisFavoritos()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('alternarFavoritoApi usa PUT para marcar y DELETE para quitar', async () => {
    fetchMock.mockResolvedValue(ok({}));
    await S.alternarFavoritoApi('esp-02', true);
    expect(pedido().opciones.method).toBe('PUT');
    await S.alternarFavoritoApi('esp-02', false);
    expect(pedido(1).opciones.method).toBe('DELETE');
    expect(pedido(1).url).toBe('http://api.test/yo/espacios-favoritos/esp-02');
  });
});

describe('servicios del personal', () => {
  it('obtenerReservasDelDia recorre todas las páginas', async () => {
    const pagina = (desde: number, cantidad: number) => Array.from({ length: cantidad }, (_, i) => ({ id: `res-${desde + i}` }));
    fetchMock
      .mockResolvedValueOnce(ok(pagina(0, 100), { total: 150, pagina: 1, porPagina: 100 }))
      .mockResolvedValueOnce(ok(pagina(100, 50), { total: 150, pagina: 2, porPagina: 100 }));

    const reservas = await S.obtenerReservasDelDia('2026-11-03');
    expect(reservas).toHaveLength(150);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(pedido(0).url).toBe('http://api.test/reservas?fecha=2026-11-03&pagina=1&porPagina=100');
    expect(pedido(1).url).toBe('http://api.test/reservas?fecha=2026-11-03&pagina=2&porPagina=100');
  });

  it('con una sola página hace un solo pedido', async () => {
    fetchMock.mockResolvedValue(ok([{ id: 'res-1' }], { total: 1, pagina: 1, porPagina: 100 }));
    await S.obtenerReservasDelDia('2026-11-03');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no se queda en un bucle si una página llega vacía', async () => {
    fetchMock.mockResolvedValue(ok([], { total: 500, pagina: 1, porPagina: 100 }));
    await expect(S.obtenerReservasDelDia('2026-11-03')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('marcarAusenteApi hace POST a /reservas/:id/ausente', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'res-1', estado: 'ausente' }));
    const r = await S.marcarAusenteApi('res-1');
    expect(pedido().url).toBe('http://api.test/reservas/res-1/ausente');
    expect(pedido().opciones.method).toBe('POST');
    expect(r.estado).toBe('ausente');
  });

  it('marcarAusenteApi propaga el mensaje si es antes de tiempo', async () => {
    fetchMock.mockResolvedValue(falla(422, 'ANTES_DE_TIEMPO', 'Todavía no pasaron 15 minutos del inicio.'));
    await expect(S.marcarAusenteApi('res-1')).rejects.toThrow('15 minutos');
  });

  it('obtenerUsuarioApi pide el usuario por id', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'usr-207', telefono: '3455-401122' }));
    const u = await S.obtenerUsuarioApi('usr-207');
    expect(pedido().url).toBe('http://api.test/usuarios/usr-207');
    expect(u.telefono).toBe('3455-401122');
  });

  it('registrarIngresoApi manda el código y el espacio', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'res-1', estado: 'cumplida' }));
    await S.registrarIngresoApi('VGY-0919-19-K3X9QM', 'esp-02');
    expect(pedido().url).toBe('http://api.test/ingresos');
    expect(JSON.parse(pedido().opciones.body)).toEqual({ codigoQr: 'VGY-0919-19-K3X9QM', espacioId: 'esp-02' });
  });

  it('registrarIngresoApi muestra el rechazo de la API (código de otro día)', async () => {
    fetchMock.mockResolvedValue(falla(422, 'CODIGO_DE_OTRO_DIA', 'Esa reserva no es para hoy.'));
    await expect(S.registrarIngresoApi('VGY-1', 'esp-02')).rejects.toThrow('Esa reserva no es para hoy.');
  });
});

describe('administración', () => {
  it('un bloqueo de día entero NO manda inicio ni fin', async () => {
    fetchMock.mockResolvedValue(ok([{ id: 'blo-1' }], null, 201));
    await S.crearBloqueosApi({ espacioIds: ['esp-01', 'esp-02'], fecha: '2026-11-10', inicio: null, fin: null, motivo: 'Lluvia' });

    const cuerpo = JSON.parse(pedido().opciones.body);
    expect(cuerpo).toEqual({ espacioIds: ['esp-01', 'esp-02'], fecha: '2026-11-10', motivo: 'Lluvia' });
    expect(cuerpo).not.toHaveProperty('inicio');
    expect(cuerpo).not.toHaveProperty('fin');
  });

  it('un bloqueo por tramo manda inicio y fin', async () => {
    fetchMock.mockResolvedValue(ok([{ id: 'blo-1' }], null, 201));
    await S.crearBloqueosApi({ espacioIds: ['esp-03'], fecha: '2026-11-10', inicio: '22:00', fin: '24:00', motivo: 'Luz' });
    expect(JSON.parse(pedido().opciones.body)).toMatchObject({ inicio: '22:00', fin: '24:00' });
  });

  it('un bloqueo sin motivo muestra el error de la API', async () => {
    fetchMock.mockResolvedValue(falla(422, 'MOTIVO_REQUERIDO', 'Escribí el motivo del bloqueo.'));
    const e = await S.crearBloqueosApi({ espacioIds: ['esp-01'], fecha: '2026-11-10', inicio: null, fin: null, motivo: '' }).catch((x) => x);
    expect(codigoDe(e)).toBe('MOTIVO_REQUERIDO');
  });

  it('obtenerBloqueos pide desde la fecha indicada', async () => {
    fetchMock.mockResolvedValue(ok([], { total: 0, pagina: 1, porPagina: 100 }));
    await S.obtenerBloqueos('2026-11-03');
    expect(pedido().url).toBe('http://api.test/bloqueos?desde=2026-11-03&pagina=1&porPagina=100');
  });

  it('quitarBloqueoApi acepta la respuesta 204 sin cuerpo', async () => {
    fetchMock.mockResolvedValue(sinCuerpo());
    await expect(S.quitarBloqueoApi('blo-1')).resolves.toBeUndefined();
    expect(pedido().opciones.method).toBe('DELETE');
    expect(pedido().url).toBe('http://api.test/bloqueos/blo-1');
  });

  it('obtenerFijas pide sólo las activas', async () => {
    fetchMock.mockResolvedValue(ok([], { total: 0, pagina: 1, porPagina: 100 }));
    await S.obtenerFijas();
    expect(pedido().url).toBe('http://api.test/fijas?activa=true&pagina=1&porPagina=100');
  });

  it('crearFijaApi manda el cuerpo completo y muestra el choque con otra fija', async () => {
    const nueva = { espacioId: 'esp-02', titular: 'Otro grupo', dia: 2, inicio: '21:00', fin: '22:00', desde: '2026-11-10', hasta: null };
    fetchMock.mockResolvedValue(falla(409, 'FIJA_SUPERPUESTA', 'Ya hay una reserva fija en ese horario.'));
    const e = await S.crearFijaApi(nueva).catch((x) => x);
    expect(codigoDe(e)).toBe('FIJA_SUPERPUESTA');
    expect(JSON.parse(pedido().opciones.body)).toEqual(nueva);
  });

  it('darDeBajaFijaApi hace DELETE', async () => {
    fetchMock.mockResolvedValue(sinCuerpo());
    await S.darDeBajaFijaApi('fij-9');
    expect(pedido().url).toBe('http://api.test/fijas/fij-9');
    expect(pedido().opciones.method).toBe('DELETE');
  });

  it('cambiarPrecioApi hace PATCH con precioPorHora', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'esp-01', precioPorHora: 9500 }));
    const e = await S.cambiarPrecioApi('esp-01', 9500);
    expect(pedido().url).toBe('http://api.test/espacios/esp-01');
    expect(pedido().opciones.method).toBe('PATCH');
    expect(JSON.parse(pedido().opciones.body)).toEqual({ precioPorHora: 9500 });
    expect(e.precioPorHora).toBe(9500);
  });

  it('un encargado que intenta cambiar precios recibe SIN_PERMISO', async () => {
    fetchMock.mockResolvedValue(falla(403, 'SIN_PERMISO', 'No tenés permiso para hacer esto.'));
    await expect(S.cambiarPrecioApi('esp-01', 9500)).rejects.toMatchObject({ codigo: 'SIN_PERMISO' });
  });
});
