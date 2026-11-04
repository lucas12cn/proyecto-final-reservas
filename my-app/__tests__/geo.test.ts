import { distanciaEnKm, idDelMasCercano, textoDistancia } from '../src/servicios/geo';

describe('distanciaEnKm', () => {
  it('es 0 entre un punto y sí mismo', () => {
    const p = { latitude: -31.8644, longitude: -59.0272 };
    expect(distanciaEnKm(p, p)).toBe(0);
  });

  it('un grado de longitud sobre el ecuador son unos 111,2 km', () => {
    expect(distanciaEnKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.19, 1);
  });

  it('es simétrica', () => {
    const a = { latitude: -31.86, longitude: -59.02 };
    const b = { latitude: -31.9, longitude: -58.95 };
    expect(distanciaEnKm(a, b)).toBeCloseTo(distanciaEnKm(b, a), 10);
  });
});

describe('textoDistancia', () => {
  it('usa metros por debajo del kilómetro', () => {
    expect(textoDistancia(0.85)).toBe('850 m');
    expect(textoDistancia(0.012)).toBe('12 m');
  });

  it('usa kilómetros con coma decimal desde 1 km', () => {
    expect(textoDistancia(1)).toBe('1,0 km');
    expect(textoDistancia(2.34)).toBe('2,3 km');
    expect(textoDistancia(12)).toBe('12,0 km');
  });
});

describe('idDelMasCercano', () => {
  const complejos = [
    { id: 'poli', latitud: -31.85, longitud: -59.03 },
    { id: 'berduc', latitud: -31.9, longitud: -58.98 },
  ];

  it('elige el complejo más cercano a la ubicación', () => {
    expect(idDelMasCercano({ latitude: -31.851, longitude: -59.031 }, complejos)).toBe('poli');
    expect(idDelMasCercano({ latitude: -31.899, longitude: -58.979 }, complejos)).toBe('berduc');
  });

  it('devuelve null sin ubicación o sin complejos', () => {
    expect(idDelMasCercano(null, complejos)).toBeNull();
    expect(idDelMasCercano({ latitude: 0, longitude: 0 }, [])).toBeNull();
  });

  it('con un solo complejo, ese es el más cercano', () => {
    expect(idDelMasCercano({ latitude: 10, longitude: 10 }, [complejos[0]])).toBe('poli');
  });
});
