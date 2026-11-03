// El id de un turno lo arma la API: `tur-<espacioId>-<AAAAMMDD>-<HH>`, por ejemplo
// `tur-esp-02-20260919-19`. Acá se desarma en un solo lugar, para no repetir el formato.
const FORMATO_TURNO = /^tur-(.+)-(\d{4})(\d{2})(\d{2})-(\d{2})$/;

export interface TurnoLeido {
  espacioId: string;
  /** AAAA-MM-DD */
  fecha: string;
  /** HH:00 */
  hora: string;
  /** Instante exacto en que empieza el turno */
  inicio: Date;
}

export const leerTurnoId = (turnoId: string): TurnoLeido | null => {
  const partes = FORMATO_TURNO.exec(turnoId ?? '');
  if (!partes) return null;

  const [, espacioId, anio, mes, dia, hh] = partes;
  const fecha = `${anio}-${mes}-${dia}`;
  // Argentina no tiene horario de verano (UTC-3 todo el año): con el desfase explícito el
  // cálculo no depende de la zona horaria que tenga configurada el teléfono.
  const inicio = new Date(`${fecha}T${hh}:00:00-03:00`);
  if (Number.isNaN(inicio.getTime())) return null;

  return { espacioId, fecha, hora: `${hh}:00`, inicio };
};

// AAAA-MM-DD con la fecha LOCAL del teléfono. No usar toISOString(): devuelve la fecha en UTC y
// en Argentina (UTC-3), de 21:00 a 24:00, UTC ya es el día siguiente.
export const aFechaLocal = (fecha: Date): string => {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

/** Suma (o resta) días a una fecha AAAA-MM-DD y devuelve otra AAAA-MM-DD. */
export const desplazarDia = (fecha: string, dias: number): string => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  // Mediodía: evita saltos por cambios de horario del teléfono
  return aFechaLocal(new Date(anio, mes - 1, dia + dias, 12));
};

export const dosDigitos = (n: number) => String(n).padStart(2, '0');

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** "Hoy 19/09", "Ayer 18/09", "Mañana 20/09" o "Sáb 19/09". */
export const etiquetaDelDia = (fecha: string): string => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const nombre = DIAS_CORTOS[new Date(anio, mes - 1, dia, 12).getDay()];
  const hoy = aFechaLocal(new Date());
  const prefijo =
    fecha === hoy ? 'Hoy' : fecha === desplazarDia(hoy, -1) ? 'Ayer' : fecha === desplazarDia(hoy, 1) ? 'Mañana' : nombre;
  return `${prefijo} ${dosDigitos(dia)}/${dosDigitos(mes)}`;
};

/** Día de la semana (0 = domingo … 6 = sábado) de una fecha AAAA-MM-DD. */
export const diaDeLaSemana = (fecha: string): number => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia, 12).getDay();
};
