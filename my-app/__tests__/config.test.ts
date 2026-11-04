// Se vuelve a cargar el módulo con cada valor de la variable, porque se lee al importarlo.
const cargar = (valor?: string) => {
  const anterior = process.env.EXPO_PUBLIC_API_URL;
  if (valor === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = valor;

  let API_URL = '';
  jest.isolateModules(() => { API_URL = require('../src/servicios/config').API_URL; });

  if (anterior === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = anterior;
  return API_URL;
};

describe('API_URL', () => {
  it('usa EXPO_PUBLIC_API_URL cuando está definida', () => {
    expect(cargar('https://mi-api.onrender.com')).toBe('https://mi-api.onrender.com');
  });

  it('le saca la barra final (para no armar "//reservas")', () => {
    expect(cargar('http://192.168.0.10:3000/')).toBe('http://192.168.0.10:3000');
    expect(cargar('http://192.168.0.10:3000///')).toBe('http://192.168.0.10:3000');
  });

  it('sin la variable usa la dirección por defecto', () => {
    expect(cargar(undefined)).toBe('http://192.168.1.6:3000');
  });

  it('una variable vacía también cae en la dirección por defecto', () => {
    expect(cargar('')).toBe('http://192.168.1.6:3000');
  });
});
