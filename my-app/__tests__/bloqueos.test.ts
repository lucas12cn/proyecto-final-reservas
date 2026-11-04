import { reservasAfectadas } from '../src/servicios/bloqueos';

const reserva = (id: string, espacioId: string, hora: string, estado = 'confirmada') => ({
  id, espacioId, turnoId: `tur-${espacioId}-20261103-${hora}`, estado,
}) as any;

const reservas = [
  reserva('r1', 'esp-02', '08'),
  reserva('r2', 'esp-02', '19'),
  reserva('r3', 'esp-02', '20'),
  reserva('r4', 'esp-03', '19'),
  reserva('r5', 'esp-02', '19', 'cancelada'),
  reserva('r6', 'esp-02', '21', 'cumplida'),
  reserva('r7', 'esp-02', '22', 'ausente'),
];

const ids = (lista: { id: string }[]) => lista.map((r) => r.id);

describe('reservasAfectadas', () => {
  it('con todo el día toma las confirmadas de los espacios elegidos', () => {
    const afectadas = reservasAfectadas(reservas, ['esp-02'], { todoElDia: true, inicio: 8, fin: 12 });
    expect(ids(afectadas)).toEqual(['r1', 'r2', 'r3']);
  });

  it('con un tramo toma sólo los turnos de [inicio, fin)', () => {
    const afectadas = reservasAfectadas(reservas, ['esp-02'], { todoElDia: false, inicio: 19, fin: 20 });
    expect(ids(afectadas)).toEqual(['r2']); // las 20:00 ya no entra: el fin es exclusivo
  });

  it('el límite inferior sí entra y el superior no', () => {
    expect(ids(reservasAfectadas(reservas, ['esp-02'], { todoElDia: false, inicio: 8, fin: 9 }))).toEqual(['r1']);
    expect(ids(reservasAfectadas(reservas, ['esp-02'], { todoElDia: false, inicio: 9, fin: 19 }))).toEqual([]);
  });

  it('suma varios espacios', () => {
    const afectadas = reservasAfectadas(reservas, ['esp-02', 'esp-03'], { todoElDia: false, inicio: 19, fin: 20 });
    expect(ids(afectadas)).toEqual(['r2', 'r4']);
  });

  it('ignora las que no están confirmadas (canceladas, cumplidas, ausentes)', () => {
    const afectadas = reservasAfectadas(reservas, ['esp-02'], { todoElDia: true, inicio: 8, fin: 24 });
    expect(ids(afectadas)).not.toContain('r5');
    expect(ids(afectadas)).not.toContain('r6');
    expect(ids(afectadas)).not.toContain('r7');
  });

  it('sin espacios elegidos no afecta a nadie', () => {
    expect(reservasAfectadas(reservas, [], { todoElDia: true, inicio: 8, fin: 24 })).toEqual([]);
  });

  it('un turno con id ilegible no cuenta cuando hay un tramo', () => {
    const rota = { id: 'x', espacioId: 'esp-02', turnoId: 'basura', estado: 'confirmada' } as any;
    expect(reservasAfectadas([rota], ['esp-02'], { todoElDia: false, inicio: 8, fin: 24 })).toEqual([]);
  });
});
