import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { iniciarSesionApi, registrarUsuarioApi, registrarDispositivoApi } from '../servicios/auth';
import { Usuario } from '../tipos';

type AuthContextType = {
  usuario: Usuario | null;
  token: string | null;
  cargandoSesion: boolean;
  login: (email: string, contrasena: string) => Promise<void>;
  registro: (nombre: string, email: string, telefono: string, contrasena: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    cargarSesionGuardada();
  }, []);

  const configurarNotificacionesPush = async () => {
    try {
      // Simulación directa para cumplir con el requisito del backend en la entrega
      console.log("Enviando token simulado a NestJS...");
      await registrarDispositivoApi("ExponentPushToken[Simulado_UNER_ExpoGo]", Platform.OS);
    } catch (error) {
      console.log("Error al enviar dispositivo a la API:", error);
    }
  };

  const cargarSesionGuardada = async () => {
    try {
      const tokenGuardado = await SecureStore.getItemAsync('tokenReserva');
      const usuarioGuardado = await SecureStore.getItemAsync('usuarioReserva');
      
      if (tokenGuardado && usuarioGuardado) {
        setToken(tokenGuardado);
        setUsuario(JSON.parse(usuarioGuardado));
        configurarNotificacionesPush();
      }
    } catch (e) {
      console.log('Error cargando sesión:', e);
    } finally {
      setCargandoSesion(false);
    }
  };

  const login = async (email: string, contrasena: string) => {
    const datos = await iniciarSesionApi(email, contrasena);
    setToken(datos.token);
    setUsuario(datos.usuario);
    await SecureStore.setItemAsync('tokenReserva', datos.token);
    await SecureStore.setItemAsync('usuarioReserva', JSON.stringify(datos.usuario));
    
    configurarNotificacionesPush();
  };

  const registro = async (nombre: string, email: string, telefono: string, contrasena: string) => {
    const datos = await registrarUsuarioApi(nombre, email, telefono, contrasena);
    setToken(datos.token);
    setUsuario(datos.usuario);
    await SecureStore.setItemAsync('tokenReserva', datos.token);
    await SecureStore.setItemAsync('usuarioReserva', JSON.stringify(datos.usuario));
    
    configurarNotificacionesPush();
  };

  const logout = async () => {
    try {
      setToken(null);
      setUsuario(null);
      await SecureStore.deleteItemAsync('tokenReserva');
      await SecureStore.deleteItemAsync('usuarioReserva');
      router.replace('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ usuario, token, cargandoSesion, login, registro, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};