import React from 'react';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import EscanerScreen from '../src/app/(tabs)/escaner';

// Mock expo-camera modules
jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(),
  CameraView: jest.fn(),
  hasHardwareAsync: jest.fn().mockResolvedValue({ hasHardware: true }),
  isEnrolledAsync: jest.fn().mockResolvedValue({ hasBiometry: true }),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  LocalAuthentication: jest.fn(),
  Haptics: {
    notificationAsync: jest.fn(),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

// Mock react-native components
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    View: actual.View,
    Text: actual.Text,
    TouchableOpacity: actual.TouchableOpacity,
    Alert: actual.Alert,
    ActivityIndicator: actual.ActivityIndicator,
    SafeAreaView: actual.SafeAreaView,
    StyleSheet: {
      ...actual.StyleSheet,
      create: jest.fn(),
    },
  };
});

// Mock ionicons
jest.mock('@react-native-vector-icons/ionicons', () => ({
  Ionicons: jest.fn(({ name, size, color }) => (
    <Text style={{ fontSize: size, color }}>{name}</Text>
  )),
}));

// Mock AuthContext
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

// Mock use-theme
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

describe('EscanerScreen - Permissions rendering fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra el mensaje de permiso denegado y botón Otorgar Permiso cuando granted es false', () => {
    // Mock useCameraPermissions to return { granted: false }
    const mockUseCameraPermissions = jest.fn().mockReturnValue({ granted: false });
    // Need to re-mock after clear
    jest.spyOn(require('../src/app/(tabs)/escaner'), 'useCameraPermissions').mockReturnValue({ granted: false });

    render(<EscanerScreen />);

    // Should show the camera outline icon
    const cameraIcon = screen.getByAltText('camera-outline');
    expect(cameraIcon).toBeTruthy();

    // Should show the permission needed text
    const permissionText = screen.getByText(
      'El encargado necesita acceso a la cámara para validar las reservas mediante código QR.'
    );
    expect(permissionText).toBeTruthy();

    // Should show the "Otorgar Permiso" button
    const otorgarBoton = screen.getByText('Otorgar Permiso');
    expect(otorgarBoton).toBeTruthy();
  });

  it('no muestra el botón Otorgar Permiso cuando granted es true (cae al CameraView)', () => {
    // Mock useCameraPermissions to return { granted: true }
    jest.spyOn(require('../src/app/(tabs)/escaner'), 'useCameraPermissions').mockReturnValue({ granted: true });

    render(<EscanerScreen />);

    // The "Otorgar Permiso" button should NOT be present when granted is true
    const otorgarBoton = screen.queryByText('Otorgar Permiso');
    expect(otorgarBoton).toBeNull();
  });

  it('usa CameraView cuando granted es true (componente no retorna temprano)', () => {
    // Mock useCameraPermissions to return { granted: true }
    jest.spyOn(require('../src/app/(tabs)/escaner'), 'useCameraPermissions').mockReturnValue({ granted: true });

    const { container } = render(<EscanerScreen />);

    // The component should NOT return early with the empty/permission view
    // and should render the CameraView container
    expect(container).toBeTruthy();

    // Verify the component structure includes the pantalla view
    const pantallaView = container.queryByAltText('pantalla');
    expect(pantallaView).toBeTruthy();
  });
});