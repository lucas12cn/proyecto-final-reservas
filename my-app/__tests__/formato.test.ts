import { pesos } from '../src/servicios/formato';

describe('pesos', () => {
  it('usa el punto como separador de miles', () => {
    expect(pesos(9500)).toBe('$9.500');
    expect(pesos(12000)).toBe('$12.000');
    expect(pesos(1234567)).toBe('$1.234.567');
  });

  it('no agrega separador por debajo de los mil', () => {
    expect(pesos(850)).toBe('$850');
    expect(pesos(0)).toBe('$0');
  });

  it('redondea si llega con decimales', () => {
    expect(pesos(9500.4)).toBe('$9.500');
    expect(pesos(9500.6)).toBe('$9.501');
  });
});
