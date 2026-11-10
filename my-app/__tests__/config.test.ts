// El módulo lee lo guardado al importarse: se vuelve a cargar con cada escenario.
const mockPreferencias = new Map<string, string>();
let mockFallaLaLectura = false;
let mockFallaLaEscritura = false;

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: (clave: string) => {
      if (mockFallaLaLectura) throw new Error('kv-store no disponible');
      return mockPreferencias.get(clave) ?? null;
    },
    setItemSync: (clave: string, valor: string) => {
      if (mockFallaLaEscritura) throw new Error('disco lleno');
      mockPreferencias.set(clave, valor);
    },
    removeItemSync: (clave: string) => { mockPreferencias.delete(clave); },
  },
}));

type Config = typeof import('../src/servicios/config');
const cargar = (entorno?: string): Config => {
  const anterior = process.env.EXPO_PUBLIC_API_URL;
  if (entorno === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = entorno;

  let modulo!: Config;
  jest.isolateModules(() => { modulo = require('../src/servicios/config'); });

  if (anterior === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = anterior;
  return modulo;
};

beforeEach(() => {
  mockPreferencias.clear();
  mockFallaLaLectura = false;
  mockFallaLaEscritura = false;
});

describe('normalizarUrlApi', () => {
  const { normalizarUrlApi } = cargar();

  it('acepta direcciones con esquema, host y puerto', () => {
    expect(normalizarUrlApi('http://192.168.0.10:3000')).toBe('http://192.168.0.10:3000');
    expect(normalizarUrlApi('https://mi-api.onrender.com')).toBe('https://mi-api.onrender.com');
    expect(normalizarUrlApi('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('si falta el esquema asume http://', () => {
    expect(normalizarUrlApi('192.168.0.10:3000')).toBe('http://192.168.0.10:3000');
  });

  it('saca los espacios y las barras finales (para no armar "//reservas")', () => {
    expect(normalizarUrlApi('  http://192.168.0.10:3000/  ')).toBe('http://192.168.0.10:3000');
    expect(normalizarUrlApi('http://192.168.0.10:3000///')).toBe('http://192.168.0.10:3000');
  });

  it('rechaza lo que no es una dirección', () => {
    expect(normalizarUrlApi('')).toBeNull();
    expect(normalizarUrlApi('   ')).toBeNull();
    expect(normalizarUrlApi('hola mundo')).toBeNull();
    expect(normalizarUrlApi('http://')).toBeNull();
    expect(normalizarUrlApi('http://192.168.0.10:3000/api')).toBeNull(); // sin ruta
    expect(normalizarUrlApi('ftp://192.168.0.10')).toBeNull();
    expect(normalizarUrlApi('http://192.168.0.10:99999999')).toBeNull();
  });
});

describe('apiUrl: de dónde sale la dirección', () => {
  it('sin nada usa la dirección por defecto', () => {
    expect(cargar(undefined).apiUrl()).toBe('http://192.168.1.6:3000');
  });

  it('usa EXPO_PUBLIC_API_URL y le saca la barra final', () => {
    expect(cargar('https://mi-api.onrender.com').apiUrl()).toBe('https://mi-api.onrender.com');
    expect(cargar('http://192.168.0.10:3000/').apiUrl()).toBe('http://192.168.0.10:3000');
  });

  it('una variable vacía también cae en la dirección por defecto', () => {
    expect(cargar('').apiUrl()).toBe('http://192.168.1.6:3000');
  });

  it('la dirección escrita en la app tiene prioridad sobre la del entorno', () => {
    mockPreferencias.set('apiUrlPersonalizada', 'http://10.0.0.5:3000');
    const config = cargar('http://192.168.0.10:3000');
    expect(config.apiUrl()).toBe('http://10.0.0.5:3000');
    expect(config.hayUrlPersonalizada()).toBe(true);
  });

  it('una dirección guardada inválida se ignora', () => {
    mockPreferencias.set('apiUrlPersonalizada', 'basura rara');
    const config = cargar('http://192.168.0.10:3000');
    expect(config.apiUrl()).toBe('http://192.168.0.10:3000');
    expect(config.hayUrlPersonalizada()).toBe(false);
  });

  it('si no se puede leer lo guardado, usa la del entorno y no rompe la app', () => {
    mockFallaLaLectura = true;
    expect(cargar('http://192.168.0.10:3000').apiUrl()).toBe('http://192.168.0.10:3000');
  });
});

describe('fijarApiUrl', () => {
  it('guarda la dirección normalizada y rige de inmediato (sin reiniciar)', () => {
    const config = cargar('http://192.168.0.10:3000');
    config.fijarApiUrl('10.0.0.5:3000/');
    expect(config.apiUrl()).toBe('http://10.0.0.5:3000');
    expect(mockPreferencias.get('apiUrlPersonalizada')).toBe('http://10.0.0.5:3000');
  });

  it('sobrevive al cierre de la app: un módulo nuevo la lee', () => {
    cargar().fijarApiUrl('http://10.0.0.5:3000');
    expect(cargar().apiUrl()).toBe('http://10.0.0.5:3000');
  });

  it('con null o vacío vuelve a la dirección del entorno y borra lo guardado', () => {
    const config = cargar('http://192.168.0.10:3000');
    config.fijarApiUrl('http://10.0.0.5:3000');
    config.fijarApiUrl(null);
    expect(config.apiUrl()).toBe('http://192.168.0.10:3000');
    expect(config.hayUrlPersonalizada()).toBe(false);
    expect(mockPreferencias.has('apiUrlPersonalizada')).toBe(false);

    config.fijarApiUrl('http://10.0.0.5:3000');
    config.fijarApiUrl('   ');
    expect(config.hayUrlPersonalizada()).toBe(false);
  });

  it('una dirección inválida lanza un error con mensaje y no cambia nada', () => {
    const config = cargar('http://192.168.0.10:3000');
    expect(() => config.fijarApiUrl('hola mundo')).toThrow('La dirección no es válida');
    expect(config.apiUrl()).toBe('http://192.168.0.10:3000');
  });

  it('si no se puede guardar, el cambio rige igual hasta cerrar la app', () => {
    mockFallaLaEscritura = true;
    const config = cargar('http://192.168.0.10:3000');
    config.fijarApiUrl('http://10.0.0.5:3000');
    expect(config.apiUrl()).toBe('http://10.0.0.5:3000');
  });
});
