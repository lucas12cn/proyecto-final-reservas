// Tipos que la API agrega para el personal. NO son del PRD (por eso no están en `index.ts`, que
// es una copia literal del PRD): vienen de `contract/api.ts` de la API (decisión D12).

/** Bloqueo de un espacio. Sin `inicio` ni `fin`, cubre el día entero. */
export interface Bloqueo {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string | null; // "HH:MM"
  fin: string | null;
  motivo: string;
}
