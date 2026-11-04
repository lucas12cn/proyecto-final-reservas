import { Reserva } from '../tipos';
import { leerTurnoId } from './turnos';

export interface TramoDeBloqueo {
  todoElDia: boolean;
  /** Hora de inicio (8 a 23). Sólo cuenta si no es todo el día. */
  inicio: number;
  /** Hora de fin (9 a 24), exclusiva. Sólo cuenta si no es todo el día. */
  fin: number;
}

/**
 * Reservas confirmadas que un bloqueo cancelaría: las de los espacios elegidos y, si no es todo el
 * día, cuyo turno empieza en `[inicio, fin)`. Es sólo un aviso previo para el encargado; la
 * cancelación real la hace la API.
 */
export const reservasAfectadas = (
  reservas: Pick<Reserva, 'id' | 'turnoId' | 'estado' | 'espacioId'>[],
  espacioIds: string[],
  tramo: TramoDeBloqueo
) =>
  reservas.filter((r) => {
    if (r.estado !== 'confirmada' || !espacioIds.includes(r.espacioId)) return false;
    if (tramo.todoElDia) return true;
    const turno = leerTurnoId(r.turnoId);
    if (!turno) return false;
    const hora = parseInt(turno.hora, 10);
    return hora >= tramo.inicio && hora < tramo.fin;
  });
