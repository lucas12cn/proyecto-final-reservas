const mockLogout = jest.fn(async () => {});
let mockUsuario: unknown = null;
const mockFijar = jest.fn();
let mockActual = 'http://192.168.1.6:3000';
let mockPersonalizada = false;
const mockProbar = jest.fn();

jest.mock('../src/contexto/AuthContext', () => ({ useAuth: () => ({ usuario: mockUsuario, logout: mockLogout }) }));
jest.mock('../src/servicios/config', () => ({
  apiUrl: () => mockActual,
  hayUrlPersonalizada: () => mockPersonalizada,
  URL_POR_DEFECTO: 'http://192.168.1.6:3000',
  normalizarUrlApi: jest.requireActual('../src/servicios/config').normalizarUrlApi,
  fijarApiUrl: (t: string | null) => { mockFijar(t); mockActual = t ?? 'http://192.168.1.6:3000'; mockPersonalizada = t !== null; },
}));
jest.mock('../src/servicios/servidor', () => ({ probarServidor: (u: string) => mockProbar(u) }));

import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/providers/ThemeProvider';
import { SelectorServidor } from '../src/componentes/SelectorServidor';

const montar = () => render(<ThemeProvider><SelectorServidor /></ThemeProvider>);
const abrir = async () => {
  await montar();
  await fireEvent.press(screen.getByText('Cambiar'));
};

beforeEach(() => {
  mockUsuario = null;
  mockActual = 'http://192.168.1.6:3000';
  mockPersonalizada = false;
  mockProbar.mockResolvedValue({ ok: true });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('SelectorServidor', () => {
  it('muestra la dirección vigente', async () => {
    await montar();
    expect(screen.getByText('http://192.168.1.6:3000')).toBeTruthy();
    expect(screen.getByText('Servidor')).toBeTruthy();
  });

  it('indica cuando la dirección fue elegida en la app', async () => {
    mockPersonalizada = true;
    await montar();
    expect(screen.getByText('Servidor (elegido en la app)')).toBeTruthy();
  });

  it('"Probar" con una dirección inválida muestra el error y no llama a la API', async () => {
    await abrir();
    await fireEvent.changeText(screen.getByPlaceholderText('http://192.168.0.10:3000'), 'hola mundo');
    await fireEvent.press(screen.getByText('Probar'));
    expect(screen.getByText(/La dirección no es válida/)).toBeTruthy();
    expect(mockProbar).not.toHaveBeenCalled();
  });

  it('"Probar" con una dirección que responde muestra que anda', async () => {
    await abrir();
    await fireEvent.changeText(screen.getByPlaceholderText('http://192.168.0.10:3000'), '192.168.0.10:3000');
    await fireEvent.press(screen.getByText('Probar'));
    await waitFor(() => expect(screen.getByText('✓ La API responde.')).toBeTruthy());
    expect(mockProbar).toHaveBeenCalledWith('http://192.168.0.10:3000'); // normalizada
  });

  it('"Probar" con una que no responde muestra el motivo', async () => {
    mockProbar.mockResolvedValue({ ok: false, mensaje: 'No se pudo conectar.' });
    await abrir();
    await fireEvent.changeText(screen.getByPlaceholderText('http://192.168.0.10:3000'), 'http://10.9.9.9:3000');
    await fireEvent.press(screen.getByText('Probar'));
    await waitFor(() => expect(screen.getByText('No se pudo conectar.')).toBeTruthy());
  });

  it('"Guardar" una dirección que responde la fija y cierra el cuadro', async () => {
    await abrir();
    await fireEvent.changeText(screen.getByPlaceholderText('http://192.168.0.10:3000'), 'http://10.0.0.5:3000');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(mockFijar).toHaveBeenCalledWith('http://10.0.0.5:3000'));
    expect(screen.getByText('http://10.0.0.5:3000')).toBeTruthy();
    expect(mockLogout).not.toHaveBeenCalled(); // sin sesión no hay nada que cerrar
  });

  it('si la dirección no responde pregunta antes de guardarla y no la fija hasta confirmar', async () => {
    mockProbar.mockResolvedValue({ ok: false, mensaje: 'No se pudo conectar.' });
    await abrir();
    await fireEvent.changeText(screen.getByPlaceholderText('http://192.168.0.10:3000'), 'http://10.9.9.9:3000');
    await fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo conectar', expect.stringContaining('¿Guardar la dirección igual?'), expect.any(Array)));
    expect(mockFijar).not.toHaveBeenCalled();

    const botones = (Alert.alert as jest.Mock).mock.calls[0][2];
    await botones.find((b: any) => b.text === 'Guardar igual').onPress();
    expect(mockFijar).toHaveBeenCalledWith('http://10.9.9.9:3000');
  });

  it('con sesión iniciada, cambiar de servidor cierra la sesión (el token es de otro servidor)', async () => {
    mockUsuario = { id: 'usr-207' };
    await abrir();
    await fireEvent.changeText(screen.getByPlaceholderText('http://192.168.0.10:3000'), 'http://10.0.0.5:3000');
    await fireEvent.press(screen.getByText('Guardar'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(Alert.alert).toHaveBeenCalledWith('Servidor cambiado', expect.stringContaining('iniciar sesión'));
  });

  it('guardar la misma dirección que ya estaba no cierra la sesión', async () => {
    mockUsuario = { id: 'usr-207' };
    await abrir();
    await fireEvent.press(screen.getByText('Guardar')); // el campo ya trae la dirección vigente
    await waitFor(() => expect(mockFijar).toHaveBeenCalled());
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('"Volver a la de fábrica" borra la dirección elegida', async () => {
    mockPersonalizada = true;
    mockActual = 'http://10.0.0.5:3000';
    await abrir();
    await fireEvent.press(screen.getByText(/Volver a la de fábrica/));
    await waitFor(() => expect(mockFijar).toHaveBeenCalledWith(null));
  });
});
