import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { iniciarSesionApi, registrarUsuarioApi } from '../servicios/auth';
import { registrarParaPush, darDeBajaPush } from '../servicios/notificaciones';
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

  const cargarSesionGuardada = async () => {
    try {
      const tokenGuardado = await SecureStore.getItemAsync('tokenReserva');
      const usuarioGuardado = await SecureStore.getItemAsync('usuarioReserva');
      
      if (tokenGuardado && usuarioGuardado) {
        setToken(tokenGuardado);
        setUsuario(JSON.parse(usuarioGuardado));
        registrarParaPush(); // sin await: no demora el ingreso y nunca tira
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
    
    registrarParaPush(); // sin await: no demora el ingreso y nunca tira
  };

  const registro = async (nombre: string, email: string, telefono: string, contrasena: string) => {
    const datos = await registrarUsuarioApi(nombre, email, telefono, contrasena);
    setToken(datos.token);
    setUsuario(datos.usuario);
    await SecureStore.setItemAsync('tokenReserva', datos.token);
    await SecureStore.setItemAsync('usuarioReserva', JSON.stringify(datos.usuario));
    
    registrarParaPush(); // sin await: no demora el ingreso y nunca tira
  };

  const logout = async () => {
    try {
      // Antes de borrar la sesión: la baja del teléfono necesita el token de acceso.
      await darDeBajaPush();
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