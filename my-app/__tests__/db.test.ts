// Una base SQLite en memoria muy simple: entiende sólo las sentencias que usa servicios/db.ts.
const mockTablas: Record<string, Map<string, string>> = {};
const mockAperturas = jest.fn();
const mockCreaciones = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseSync: (nombre: string) => {
    mockAperturas(nombre);
    return {
      execSync: (sql: string) => {
        mockCreaciones(sql);
        for (const t of ['espacios_locales', 'deportes_locales', 'reservas_locales']) mockTablas[t] = mockTablas[t] ?? new Map();
      },
      withTransactionSync: (fn: () => void) => fn(),
      runSync: (sql: string, params: string[] = []) => {
        const tabla = /(?:FROM|INTO) (\w+)/.exec(sql)![1];
        if (sql.startsWith('DELETE')) mockTablas[tabla].clear();
        else mockTablas[tabla].set(params[0], params[1]);
      },
      getAllSync: (sql: string) => {
        const tabla = /FROM (\w+)/.exec(sql)![1];
        return Array.from(mockTablas[tabla].entries()).map(([id, datos]) => ({ id, datos }));
      },
    };
  },
}));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: { getItemSync: jest.fn(), setItemSync: jest.fn() } }));

import {
  guardarDeportesEnTelefono, guardarEspaciosEnTelefono, leerDeportesDelTelefono, leerEspaciosDelTelefono,
} from '../src/servicios/db';

const cancha = (id: string, extra = {}) => ({ id, nombre: `Cancha ${id}`, precioPorHora: 8500, ...extra }) as any;

describe('catálogo local (SQLite)', () => {
  it('la base se abre una sola vez, al primer uso (no al importar el archivo)', () => {
    expect(mockAperturas).not.toHaveBeenCalled();
    guardarEspaciosEnTelefono([cancha('esp-01')]);
    leerEspaciosDelTelefono();
    guardarDeportesEnTelefono([{ id: 'dep-1', nombre: 'Fútbol 5' } as any]);
    expect(mockAperturas).toHaveBeenCalledTimes(1);
    expect(mockAperturas).toHaveBeenCalledWith('villaguay_deportes.db');
    expect(mockCreaciones.mock.calls[0][0]).toContain('CREATE TABLE IF NOT EXISTS espacios_locales');
  });

  it('guarda y lee los espacios tal cual (ida y vuelta por JSON)', () => {
    const espacios = [cancha('esp-01', { coordenadas: { latitud: -31.8, longitud: -59 }, techado: true }), cancha('esp-02')];
    guardarEspaciosEnTelefono(espacios);
    expect(leerEspaciosDelTelefono()).toEqual(espacios);
  });

  it('guardar REEMPLAZA la lista completa: un espacio dado de baja no queda en el teléfono', () => {
    guardarEspaciosEnTelefono([cancha('esp-01'), cancha('esp-02'), cancha('esp-03')]);
    guardarEspaciosEnTelefono([cancha('esp-01'), cancha('esp-03')]);
    expect(leerEspaciosDelTelefono().map((e) => e.id)).toEqual(['esp-01', 'esp-03']);
  });

  it('guardar un precio nuevo pisa el anterior del mismo espacio', () => {
    guardarEspaciosEnTelefono([cancha('esp-01', { precioPorHora: 8500 })]);
    guardarEspaciosEnTelefono([cancha('esp-01', { precioPorHora: 9500 })]);
    expect(leerEspaciosDelTelefono()).toHaveLength(1);
    expect(leerEspaciosDelTelefono()[0].precioPorHora).toBe(9500);
  });

  it('los deportes se guardan aparte de los espacios', () => {
    guardarEspaciosEnTelefono([cancha('esp-01')]);
    guardarDeportesEnTelefono([{ id: 'dep-1', nombre: 'Fútbol 5' } as any, { id: 'dep-2', nombre: 'Básquet' } as any]);
    expect(leerDeportesDelTelefono().map((d) => d.id)).toEqual(['dep-1', 'dep-2']);
    expect(leerEspaciosDelTelefono().map((e) => e.id)).toEqual(['esp-01']);
  });

  it('guardar una lista vacía deja el catálogo vacío', () => {
    guardarEspaciosEnTelefono([cancha('esp-01')]);
    guardarEspaciosEnTelefono([]);
    expect(leerEspaciosDelTelefono()).toEqual([]);
  });
});
