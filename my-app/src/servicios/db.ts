import * as SQLite from "expo-sqlite";
import Storage from "expo-sqlite/kv-store";
import { Espacio, Reserva } from "../tipos";

// Abrimos (o creamos) el archivo de base de datos en el teléfono
const db = SQLite.openDatabaseSync("villaguay_deportes.db");

// 1. Crear las tablas si todavía no existen
export function iniciarBaseDeDatos() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS espacios_locales (
      id TEXT PRIMARY KEY NOT NULL,
      datos TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reservas_locales (
      id TEXT PRIMARY KEY NOT NULL,
      datos TEXT NOT NULL
    );
  `);
}

// 2. Guardar la lista de espacios en el celular
export function guardarEspaciosEnTelefono(espacios: Espacio[]) {
  for (const esp of espacios) {
    const textoJson = JSON.stringify(esp);
    db.runSync(
      "INSERT OR REPLACE INTO espacios_locales (id, datos) VALUES (?, ?);",
      [esp.id, textoJson]
    );
  }
}

// 3. Leer los espacios guardados cuando NO hay internet
export function leerEspaciosDelTelefono(): Espacio[] {
  const filas = db.getAllSync<{ id: string; datos: string }>(
    "SELECT * FROM espacios_locales;"
  );
  return filas.map((fila) => JSON.parse(fila.datos));
}

// 4. Guardar las reservas del usuario (para ver el QR sin señal en la puerta)
export function guardarReservasEnTelefono(reservas: Reserva[]) {
  for (const res of reservas) {
    const textoJson = JSON.stringify(res);
    db.runSync(
      "INSERT OR REPLACE INTO reservas_locales (id, datos) VALUES (?, ?);",
      [res.id, textoJson]
    );
  }
}

// 5. Leer las reservas guardadas sin internet
export function leerReservasDelTelefono(): Reserva[] {
  const filas = db.getAllSync<{ id: string; datos: string }>(
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