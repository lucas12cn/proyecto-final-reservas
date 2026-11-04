// Cálculos de ubicación del mapa, sin dependencias de pantalla ni de Expo.

export type Punto = { latitude: number; longitude: number };

/** Distancia en km entre dos puntos (fórmula de Haversine). */
export const distanciaEnKm = (a: Punto, b: Punto): number => {
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const dLat = aRadianes(b.latitude - a.latitude);
  const dLng = aRadianes(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.latitude)) * Math.cos(aRadianes(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

/** "850 m" si es menos de 1 km; si no, "2,3 km". */
export const textoDistancia = (km: number): string =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;

/** Id del complejo más cercano a `ubicacion`, o null si no hay ubicación o no hay complejos. */
export const idDelMasCercano = (
  ubicacion: Punto | null,
  complejos: { id: string; latitud: number; longitud: number }[]
): string | null => {
  if (!ubicacion || complejos.length === 0) return null;
  let mejor = complejos[0];
  let mejorKm = distanciaEnKm(ubicacion, { latitude: mejor.latitud, longitude: mejor.longitud });
  for (const c of complejos.slice(1)) {
    const km = distanciaEnKm(ubicacion, { latitude: c.latitud, longitude: c.longitud });
    if (km < mejorKm) { mejor = c; mejorKm = km; }
  }
  return mejor.id;
};
