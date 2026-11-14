import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Linking } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCameraPermissions } from 'expo-camera';
import { obtenerEspacios } from '../src/servicios/reservas';
import EscanerScreen from '../src/app/(tabs)/escaner';

// expo-camera: useCameraPermissions devuelve una tupla [permiso, pedirPermiso, consultarPermiso].
jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  const { createElement } = require('react');
  return {
    useCameraPermissions: jest.fn(),
    CameraView: ({ children }: any) => createElement(View, { testID: 'camera-view' }, children),
  };
});

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

// La pantalla usa el import por defecto, por eso el mock lo exporta como default.
jest.mock('@react-native-vector-icons/ionicons', () => {
  const { Text } = require('react-native');
  const { createElement } = require('react');
  return {
    __esModule: true,
    default: ({ name, size, color }: any) =>
      createElement(Text, { style: { fontSize: size, color } }, name),
  };
});

jest.mock('../src/servicios/reservas', () => ({
  registrarIngresoApi: jest.fn(),
  obtenerEspacios: jest.fn(),
}));

jest.mock('../src/servicios/errores', () => ({
  mensajeDe: jest.fn((_error: unknown, porDefecto: string) => porDefecto),
}));

jest.mock('../src/contexto/AuthContext', () => ({
  AuthProvider: {},
  useAuth: jest.fn(() => ({
    usuario: { rol: 'administrador' },
    token: 'test-token',
    cargandoSesion: false,
    login: async () => {},
    registro: async () => {},
    logout: async () => {},
  })),
}));

jest.mock('../src/hooks/use-theme', () => ({
  useTema: jest.fn(() => ({
    paleta: {
      background: '#fff',
      text: '#000',
      accent: '#007aff',
      muted: '#666',
    },
  })),
}));

// El escáner se suscribe a AppState para reconsultar el permiso al volver de los ajustes.
const escuchasAppState: Array<(estado: string) => void> = [];
jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, escucha) => {
  escuchasAppState.push(escucha as unknown as (estado: string) => void);
  return { remove: jest.fn() } as any;
});
jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);

type Permiso = { granted: boolean; canAskAgain: boolean } | null;

const mockPermiso = (permiso: Permiso) => {
  const pedirPermiso = jest.fn().mockResolvedValue(permiso);
  const consultarPermiso = jest.fn().mockResolvedValue(permiso);
  (useCameraPermissions as jest.Mock).mockReturnValue([permiso, pedirPermiso, consultarPermiso]);
  return { pedirPermiso, consultarPermiso };
};

describe('EscanerScreen - permisos de cámara', () => {
  beforeEach(() => {
    escuchasAppState.length = 0;
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
    (obtenerEspacios as jest.Mock).mockResolvedValue([{ id: '1', nombre: 'Cancha 1' }]);
  });

  it('muestra el mensaje de permiso denegado y el botón Otorgar Permiso cuando granted es false', async () => {
    mockPermiso({ granted: false, canAskAgain: true });

    await render(<EscanerScreen />);

    // La pantalla valida identidad y carga espacios antes de mostrar el permiso.
    expect(await screen.findByText('Otorgar Permiso')).toBeTruthy();
    expect(screen.getByText('camera-outline')).toBeTruthy();
    expect(
      screen.getByText(
        'El encargado necesita acceso a la cámara para validar las reservas mediante código QR.'
      )
    ).toBeTruthy();
  });

  it('no muestra el botón Otorgar Permiso cuando granted es true', async () => {
    mockPermiso({ granted: true, canAskAgain: true });

    await render(<EscanerScreen />);

    expect(await screen.findByTestId('camera-view')).toBeTruthy();
    expect(screen.queryByText('Otorgar Permiso')).toBeNull();
  });

  it('renderiza la cámara y el selector de canchas cuando granted es true', async () => {
    mockPermiso({ granted: true, canAskAgain: true });

    await render(<EscanerScreen />);

    expect(await screen.findByTestId('camera-view')).toBeTruthy();
    expect(screen.getByText('Control de Ingreso')).toBeTruthy();
    expect(screen.getByText('Cancha 1')).toBeTruthy();
  });

  it('no falla mientras el permiso todavía es null y no muestra ni el botón ni la cámara', async () => {
    mockPermiso(null);

    await render(<EscanerScreen />);

    await waitFor(() => expect(screen.queryByText('Validando identidad...')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Cargando complejos...')).toBeNull());
    expect(screen.queryByText('Otorgar Permiso')).toBeNull();
    expect(screen.queryByTestId('camera-view')).toBeNull();
  });

  it('pide el permiso de cámara al tocar Otorgar Permiso', async () => {
    const { pedirPermiso } = mockPermiso({ granted: false, canAskAgain: true });

    await render(<EscanerScreen />);
    fireEvent.press(await screen.findByText('Otorgar Permiso'));

    expect(pedirPermiso).toHaveBeenCalledTimes(1);
  });

  it('abre los ajustes del sistema cuando el permiso ya no se puede volver a pedir', async () => {
    const { pedirPermiso } = mockPermiso({ granted: false, canAskAgain: false });

    await render(<EscanerScreen />);

    expect(await screen.findByText('Abrir ajustes')).toBeTruthy();
    expect(screen.queryByText('Otorgar Permiso')).toBeNull();
    expect(screen.getByText('Habilitá la cámara desde los ajustes del sistema.')).toBeTruthy();

    fireEvent.press(screen.getByText('Abrir ajustes'));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(pedirPermiso).not.toHaveBeenCalled();
  });

  it('reconsulta el permiso cuando la app vuelve al frente', async () => {
    const { consultarPermiso } = mockPermiso({ granted: false, canAskAgain: true });

    await render(<EscanerScreen />);
    await screen.findByText('Otorgar Permiso');

    await act(async () => {
      escuchasAppState.forEach((escucha) => escucha('active'));
    });

    expect(consultarPermiso).toHaveBeenCalledTimes(1);
  });

  it('no se suscribe a AppState si la cámara ya está habilitada', async () => {
    mockPermiso({ granted: true, canAskAgain: true });

    await render(<EscanerScreen />);
    await screen.findByTestId('camera-view');

    expect(escuchasAppState).toHaveLength(0);
  });
});
