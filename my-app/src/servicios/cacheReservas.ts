import * as SQLite from 'expo-sqlite';

// Copia local de "Mis reservas" (con su QR) para verlas sin conexión. Una fila por filtro
// ("proximas" / "pasadas"), con las reservas y los espacios como JSON.
const NOMBRE_BASE = 'mis_reservas_final.db';

const abrir = () => {
  // Métodos síncronos: evitan cierres inesperados en Android
  const db = SQLite.openDatabaseSync(NOMBRE_BASE);
  // Se crea la tabla siempre, por si es la primera vez y se abre sin conexión
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cache_reservas (
      filtro TEXT PRIMARY KEY,
      reservas_json TEXT,
      espacios_json TEXT
    );
  `);
  return db;
};

export const guardarReservasEnCache = (filtro: string, reservas: unknown[], espacios: Record<string, unknown>) => {
  abrir().runSync(
    'INSERT OR REPLACE INTO cache_reservas (filtro, reservas_json, espacios_json) VALUES (?, ?, ?)',
    [filtro, JSON.stringify(reservas), JSON.stringify(espacios)]
  );
};

/** Lo guardado para ese filtro, o null si todavía no hay nada. */
export const leerReservasDeCache = (filtro: string): { reservas: any[]; espacios: Record<string, any> } | null => {
  const fila = abrir().getFirstSync<{ reservas_json: string; espacios_json: string }>(
    'SELECT reservas_json, espacios_json FROM cache_reservas WHERE filtro = ?',
    [filtro]
  );
  return fila ? { reservas: JSON.parse(fila.reservas_json), espacios: JSON.parse(fila.espacios_json) } : null;
};

/**
 * Borra todo lo guardado. Se llama al cerrar sesión: la copia es del teléfono, no de la cuenta, y
 * sin esto la persona que ingrese después vería, sin conexión, las reservas de la anterior.
 */
export const borrarCacheReservas = () => {
  abrir().runSync('DELETE FROM cache_reservas');
};
