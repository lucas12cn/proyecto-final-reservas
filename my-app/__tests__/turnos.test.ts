import {
  aFechaLocal, desplazarDia, diaDeLaSemana, etiquetaDelDia, habilitadaParaAusenteDesde,
  leerTurnoId, plazoDeCancelacion,
} from '../src/servicios/turnos';

describe('leerTurnoId', () => {
  it('desarma un id de turno', () => {
    const turno = leerTurnoId('tur-esp-02-20260919-19');
    expect(turno).not.toBeNull();
    expect(turno!.espacioId).toBe('esp-02');
    expect(turno!.fecha).toBe('2026-09-19');
    expect(turno!.hora).toBe('19:00');
  });

  it('calcula el inicio en hora argentina (UTC-3) sin depender de la zona del teléfono', () => {
    // 19:00 en Argentina son las 22:00 UTC
    expect(leerTurnoId('tur-esp-02-20260919-19')!.inicio.toISOString()).toBe('2026-09-19T22:00:00.000Z');
    expect(leerTurnoId('tur-esp-11-20261231-08')!.inicio.toISOString()).toBe('2026-12-31T11:00:00.000Z');
  });

  it('acepta ids de espacio con guiones o más largos', () => {
    expect(leerTurnoId('tur-esp-11-20261001-08')!.espacioId).toBe('esp-11');
    expect(leerTurnoId('tur-cancha-norte-3-20261001-08')!.espacioId).toBe('cancha-norte-3');
  });

  it('devuelve null si el formato o la fecha no son válidos', () => {
    expect(leerTurnoId('')).toBeNull();
    expect(leerTurnoId('basura')).toBeNull();
    expect(leerTurnoId('tur-esp-02-2026-09-19-19')).toBeNull();
    expect(leerTurnoId('tur-esp-02-20261340-19')).toBeNull(); // mes 13, día 40
    expect(leerTurnoId('res-1180')).toBeNull();
    expect(leerTurnoId(undefined as unknown as string)).toBeNull();
  });
});

describe('fechas locales', () => {
  it('aFechaLocal usa la fecha local, no la UTC', () => {
    // 23:30 locales: en Argentina ya es el día siguiente en UTC, pero la fecha local es la del 5
    expect(aFechaLocal(new Date(2026, 8, 5, 23, 30))).toBe('2026-09-05');
    expect(aFechaLocal(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('desplazarDia suma y resta días cruzando meses y años', () => {
    expect(desplazarDia('2026-09-19', 1)).toBe('2026-09-20');
    expect(desplazarDia('2026-09-30', 1)).toBe('2026-10-01');
    expect(desplazarDia('2026-12-31', 1)).toBe('2027-01-01');
    expect(desplazarDia('2026-01-01', -1)).toBe('2025-12-31');
    expect(desplazarDia('2028-02-28', 1)).toBe('2028-02-29'); // año bisiesto
    expect(desplazarDia('2026-09-19', 0)).toBe('2026-09-19');
    expect(desplazarDia('2026-09-19', 7)).toBe('2026-09-26');
  });

  it('diaDeLaSemana: 0 = domingo … 6 = sábado', () => {
    expect(diaDeLaSemana('2026-09-19')).toBe(6); // sábado
    expect(diaDeLaSemana('2026-09-20')).toBe(0); // domingo
    expect(diaDeLaSemana('2026-09-22')).toBe(2); // martes
  });
});

describe('etiquetaDelDia', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 19, 12, 0)); // sábado 19/09/2026
  });
  afterEach(() => jest.useRealTimers());

  it('usa Hoy, Ayer y Mañana', () => {
    expect(etiquetaDelDia('2026-09-19')).toBe('Hoy 19/09');
    expect(etiquetaDelDia('2026-09-18')).toBe('Ayer 18/09');
    expect(etiquetaDelDia('2026-09-20')).toBe('Mañana 20/09');
  });

  it('para otros días usa el nombre del día de la semana', () => {
    expect(etiquetaDelDia('2026-09-22')).toBe('Mar 22/09');
    expect(etiquetaDelDia('2026-10-03')).toBe('Sáb 03/10');
  });
});

describe('plazoDeCancelacion', () => {
  const ahora = new Date(2026, 8, 19, 10, 0);

  it('si el límite es hoy dice "de hoy"', () => {
    const limite = new Date(2026, 8, 19, 15, 0).toISOString();
    const plazo = plazoDeCancelacion(limite, ahora);
    expect(plazo.vencido).toBe(false);
    expect(plazo.texto).toContain('hasta las 15:00 de hoy');
  });

  it('si el límite es otro día dice la fecha', () => {
    const limite = new Date(2026, 8, 21, 9, 30).toISOString();
    const plazo = plazoDeCancelacion(limite, ahora);
    expect(plazo.vencido).toBe(false);
    expect(plazo.texto).toContain('hasta las 09:30 del 21/09');
  });

  it('si el plazo ya pasó, está vencido y avisa al encargado', () => {
    const limite = new Date(2026, 8, 19, 9, 0).toISOString();
    const plazo = plazoDeCancelacion(limite, ahora);
    expect(plazo.vencido).toBe(true);
    expect(plazo.texto).toContain('Avisale al encargado');
  });

  it('justo en el límite ya está vencido', () => {
    expect(plazoDeCancelacion(ahora.toISOString(), ahora).vencido).toBe(true);
  });

  it('sin dato o con un dato inválido no muestra nada', () => {
    expect(plazoDeCancelacion(undefined, ahora)).toEqual({ vencido: false, texto: '' });
    expect(plazoDeCancelacion('no-es-fecha', ahora)).toEqual({ vencido: false, texto: '' });
  });
});

describe('habilitadaParaAusenteDesde', () => {
  it('es el inicio del turno más 15 minutos', () => {
    const desde = habilitadaParaAusenteDesde('tur-esp-02-20260919-19')!;
    expect(desde.toISOString()).toBe('2026-09-19T22:15:00.000Z'); // 19:15 hora argentina
  });

  it('devuelve null si el id no sirve', () => {
    expect(habilitadaParaAusenteDesde('basura')).toBeNull();
  });
});
