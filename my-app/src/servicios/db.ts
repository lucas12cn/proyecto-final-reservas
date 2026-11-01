import * as SQLite from "expo-sqlite";
import Storage from "expo-sqlite/kv-store";
import { Deporte, Espacio, Reserva } from "../tipos";

// La base se abre y se prepara la primera vez que se usa (no al importar el archivo).
let db: SQLite.SQLiteDatabase | null = null;

const abrirBase = () => {
  if (!db) {
    db = SQLite.openDatabaseSync("villaguay_deportes.db");
    db.execSync(`
      CREATE TABLE IF NOT EXISTS espacios_locales (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS deportes_locales (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reservas_locales (
        id TEXT PRIMARY KEY NOT NULL,
        datos TEXT NOT NULL
      );
    `);
  }
  return db;
};

// Deja guardada la lista COMPLETA: lo que ya no viene de la API (un espacio dado de baja)
// tampoco queda en el teléfono.
const reemplazarTabla = (tabla: "espacios_locales" | "deportes_locales", items: { id: string }[]) => {
  const base = abrirBase();
  base.withTransactionSync(() => {
    base.runSync(`DELETE FROM ${tabla};`);
    for (const item of items) {
      base.runSync(`INSERT OR REPLACE INTO ${tabla} (id, datos) VALUES (?, ?);`, [
        item.id,
        JSON.stringify(item),
      ]);
    }
  });
};

const leerTabla = <T>(tabla: "espacios_locales" | "deportes_locales"): T[] => {
  const filas = abrirBase().getAllSync<{ id: string; datos: string }>(`SELECT * FROM ${tabla};`);
  return filas.map((fila) => JSON.parse(fila.datos));
};

// (Antes había iniciarBaseDeDatos(); ahora las tablas se crean solas al primer uso.)

// 2. Guardar el catálogo de espacios en el celular (para verlo sin conexión)
export function guardarEspaciosEnTelefono(espacios: Espacio[]) {
  reemplazarTabla("espacios_locales", espacios);
}

// 3. Leer los espacios guardados cuando NO hay internet
export function leerEspaciosDelTelefono(): Espacio[] {
  return leerTabla<Espacio>("espacios_locales");
}

// 3b. Lo mismo para los deportes (los filtros del catálogo)
export function guardarDeportesEnTelefono(deportes: Deporte[]) {
  reemplazarTabla("deportes_locales", deportes);
}

export function leerDeportesDelTelefono(): Deporte[] {
  return leerTabla<Deporte>("deportes_locales");
}

// 4. Guardar las reservas del usuario (para ver el QR sin señal en la puerta)
export function guardarReservasEnTelefono(reservas: Reserva[]) {
  const base = abrirBase();
  for (const res of reservas) {
    const textoJson = JSON.stringify(res);
    base.runSync(
      "INSERT OR REPLACE INTO reservas_locales (id, datos) VALUES (?, ?);",
      [res.id, textoJson]
    );
  }
}

// 5. Leer las reservas guardadas sin internet
export function leerReservasDelTelefono(): Reserva[] {
  const filas = abrirBase().getAllSync<{ id: string; datos: string }>(
    "SELECT * FROM reservas_locales;"
  );
  return filas.map((fila) => JSON.parse(fila.datos));
}

// 6. Uso de kv-store para guardar preferencias simples (ej. filtro favorito)
export function guardarPreferenciaComplejo(complejo: string) {
  Storage.setItemSync("complejo_preferido", complejo);
}

export function leerPreferenciaComplejo(): string | null {
  return Storage.getItemSync("complejo_preferido");
}