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
  },
}));

import { act, renderHook } from '@testing-library/react-native';
import { ThemeProvider } from '../src/providers/ThemeProvider';
import { useTema } from '../src/hooks/use-theme';

const montar = () => renderHook(() => useTema(), { wrapper: ThemeProvider });

beforeEach(() => {
  mockPreferencias.clear();
  mockFallaLaLectura = false;
  mockFallaLaEscritura = false;
});

describe('tema claro/oscuro', () => {
  it('sin nada guardado sigue al sistema (en las pruebas, claro)', async () => {
    const { result } = await montar();
    expect(result.current.modoManual).toBe('sistema');
    expect(result.current.esOscuro).toBe(false);
  });

  it('arranca con el modo guardado, sin esperar a nada (no hay destello del otro tema)', async () => {
    mockPreferencias.set('modoTema', 'oscuro');
    const { result } = await montar();
    expect(result.current.modoManual).toBe('oscuro');
    expect(result.current.esOscuro).toBe(true);
    expect(result.current.paleta.background).toBe('#09090b');
  });

  it('cambiar el tema lo guarda para la próxima vez', async () => {
    const { result } = await montar();
    await act(async () => { result.current.cambiarTema('oscuro'); });

    expect(result.current.esOscuro).toBe(true);
    expect(mockPreferencias.get('modoTema')).toBe('oscuro');

    // "Reabrir la app": un proveedor nuevo lee lo guardado
    const reabierta = await montar();
    expect(reabierta.result.current.modoManual).toBe('oscuro');
  });

  it('un valor guardado inválido se ignora', async () => {
    mockPreferencias.set('modoTema', 'verde-fluor');
    const { result } = await montar();
    expect(result.current.modoManual).toBe('sistema');
  });

  it('si no se puede leer lo guardado, usa el sistema y no rompe la app', async () => {
    mockFallaLaLectura = true;
    const { result } = await montar();
    expect(result.current.modoManual).toBe('sistema');
  });

  it('si no se puede guardar, el cambio rige igual hasta cerrar la app', async () => {
    mockFallaLaEscritura = true;
    const { result } = await montar();
    await act(async () => { result.current.cambiarTema('oscuro'); });
    expect(result.current.esOscuro).toBe(true);
  });

  it('el modo claro fuerza la paleta clara', async () => {
    mockPreferencias.set('modoTema', 'claro');
    const { result } = await montar();
    expect(result.current.esOscuro).toBe(false);
    expect(result.current.paleta.background).toBe('#f4f4f5');
  });
});
