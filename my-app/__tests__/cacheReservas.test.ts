// Una base SQLite en memoria muy simple: entiende sólo las sentencias de cacheReservas.ts.
const mockFilas = new Map<string, { reservas_json: string; espacios_json: string }>();
const mockAperturas = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: (nombre: string) => {
    mockAperturas(nombre);
    return {
      execSync: jest.fn(),
      runSync: (sql: string, params: string[] = []) => {
        if (sql.startsWith('DELETE')) mockFilas.clear();
        else mockFilas.set(params[0], { reservas_json: params[1], espacios_json: params[2] });
      },
      getFirstSync: (_sql: string, params: string[]) => mockFilas.get(params[0]) ?? null,
    };
  },
}));

import { borrarCacheReservas, guardarReservasEnCache, leerReservasDeCache } from '../src/servicios/cacheReservas';

beforeEach(() => { mockFilas.clear(); mockAperturas.mockClear(); });

const reservas = [{ id: 'res-1', turnoId: 'tur-esp-02-20261103-19', codigoQr: 'VGY-1103-19-AAAAAA' }];
const espacios = { 'esp-02': { id: 'esp-02', nombre: 'Cancha 2' } };

describe('copia local de "Mis reservas"', () => {
  it('guarda y lee las reservas con su código QR (ida y vuelta por JSON)', () => {
    guardarReservasEnCache('proximas', reservas, espacios);
    expect(leerReservasDeCache('proximas')).toEqual({ reservas, espacios });
  });

  it('usa la base mis_reservas_final.db', () => {
    guardarReservasEnCache('proximas', reservas, espacios);
    expect(mockAperturas).toHaveBeenCalledWith('mis_reservas_final.db');
  });

  it('cada filtro tiene su propia copia', () => {
    guardarReservasEnCache('proximas', reservas, espacios);
    guardarReservasEnCache('pasadas', [], {});
    expect(leerReservasDeCache('proximas')!.reservas).toHaveLength(1);
    expect(leerReservasDeCache('pasadas')!.reservas).toHaveLength(0);
  });

  it('guardar de nuevo reemplaza la copia anterior del mismo filtro', () => {
    guardarReservasEnCache('proximas', reservas, espacios);
    guardarReservasEnCache('proximas', [], {});
    expect(leerReservasDeCache('proximas')).toEqual({ reservas: [], espacios: {} });
  });

  it('devuelve null si todavía no hay nada guardado', () => {
    expect(leerReservasDeCache('proximas')).toBeNull();
  });

  it('borrarCacheReservas deja el teléfono sin ninguna reserva guardada', () => {
    guardarReservasEnCache('proximas', reservas, espacios);
    guardarReservasEnCache('pasadas', reservas, espacios);
    borrarCacheReservas();
    expect(leerReservasDeCache('proximas')).toBeNull();
    expect(leerReservasDeCache('pasadas')).toBeNull();
  });
});
