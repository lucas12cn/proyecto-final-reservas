/** 9500 → "$9.500" (pesos argentinos, punto como separador de miles). */
export const pesos = (monto: number): string =>
  '$' + String(Math.round(monto)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
