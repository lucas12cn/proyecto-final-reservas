let mockEntorno: string = 'bare';
let mockExtra: Record<string, unknown> | undefined = undefined;

jest.mock('expo-constants', () => ({
  __esModule: true,
  ExecutionEnvironment: { Bare: 'bare', Standalone: 'standalone', StoreClient: 'storeClient' },
  default: {
    get executionEnvironment() { return mockEntorno; },
    get expoConfig() { return { extra: mockExtra }; },
  },
}));

import { Platform } from 'react-native';
import { mapaDisponible } from '../src/servicios/mapa';

beforeEach(() => {
  mockEntorno = 'standalone';
  mockExtra = undefined;
  jest.replaceProperty(Platform, 'OS', 'android');
});
afterEach(() => jest.restoreAllMocks());

describe('mapaDisponible', () => {
  it('en iPhone siempre (Apple Maps no necesita clave)', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(mapaDisponible()).toBe(true);
  });

  it('en Expo Go (Android) sí', () => {
    mockEntorno = 'storeClient';
    expect(mapaDisponible()).toBe(true);
  });

  it('en un APK de Android compilado CON la clave de Google Maps, sí', () => {
    mockExtra = { googleMapsConfigurada: true };
    expect(mapaDisponible()).toBe(true);
  });

  it('en un APK de Android compilado SIN la clave, no: se usa la lista de complejos', () => {
    mockExtra = { googleMapsConfigurada: false };
    expect(mapaDisponible()).toBe(false);
    mockExtra = undefined;
    expect(mapaDisponible()).toBe(false);
  });

  it('sólo el valor `true` cuenta (no un texto)', () => {
    mockExtra = { googleMapsConfigurada: 'true' };
    expect(mapaDisponible()).toBe(false);
  });
});
