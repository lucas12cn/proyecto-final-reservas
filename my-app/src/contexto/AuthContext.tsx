import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { iniciarSesionApi, registrarUsuarioApi } from '../servicios/auth';
import { registrarParaPush, darDeBajaPush } from '../servicios/notificaciones';
import { registrarAlSesionVencida } from '../servicios/errores';
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

  // Evita que el cierre de sesión y el aviso de "sesión vencida" corran al mismo tiempo.
  const cerrandoSesion = useRef(false);

  const limpiarSesion = async () => {
    setToken(null);
    setUsuario(null);
    await SecureStore.deleteItemAsync('tokenReserva');
    await SecureStore.deleteItemAsync('usuarioReserva');
  };

  const logout = async () => {
    cerrandoSesion.current = true;
    try {
      // Antes de borrar la sesión: la baja del teléfono necesita el token de acceso.
      await darDeBajaPush();
      await limpiarSesion();
      router.replace('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      cerrandoSesion.current = false;
    }
  };

  // La API respondió NO_AUTENTICADO con un token guardado: venció (dura 30 días) o ya no es
  // válido. Se cierra la sesión y se manda al ingreso, en vez de dejar pantallas vacías.
  const sesionVencida = async () => {
    if (cerrandoSesion.current) return;
    cerrandoSesion.current = true;
    try {
      if (!(await SecureStore.getItemAsync('tokenReserva'))) return; // ya estaba cerrada
      await limpiarSesion();
      Alert.alert('Sesión vencida', 'Tu sesión venció. Ingresá de nuevo para continuar.');
      router.replace('/login');
    } finally {
      cerrandoSesion.current = false;
    }
  };

  useEffect(() => registrarAlSesionVencida(sesionVencida), []);

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