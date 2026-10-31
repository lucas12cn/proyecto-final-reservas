import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';

// Separamos la IP base para poder usarla en /auth y en /yo
const BASE_URL = 'http://192.168.1.6:3000';
const API_URL = `${BASE_URL}/auth`;

const verificarConexion = async () => {
  const red = await Network.getNetworkStateAsync();
  if (!red.isConnected) throw new Error('Sin conexión a internet o red local.');
};

export const iniciarSesionApi = async (email: string, contrasena: string) => {
  await verificarConexion();
  const respuesta = await fetch(`${API_URL}/ingreso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, contrasena })
  });

  if (!respuesta.ok) throw new Error('Credenciales inválidas');
  const json = await respuesta.json();
  return json.datos; 
};

export const registrarUsuarioApi = async (nombre: string, email: string, telefono: string, contrasena: string) => {
  await verificarConexion();
  const respuesta = await fetch(`${API_URL}/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, telefono, contrasena })
  });

  if (!respuesta.ok) throw new Error('Error al registrar usuario. El email podría estar en uso.');
  const json = await respuesta.json();
  return json.datos; 
};

// NUEVO: Función para actualizar los datos del jugador
export const actualizarPerfilApi = async (datos: { nombre?: string; telefono?: string }) => {
  await verificarConexion();
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) throw new Error('NO_AUTENTICADO');

  const respuesta = await fetch(`${BASE_URL}/yo`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(datos)
  });

  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.message || 'Error al actualizar el perfil');
  }

  const json = await respuesta.json();
  return json.datos; // Retorna el usuario con los datos nuevos
};

export const registrarDispositivoApi = async (tokenExpo: string, plataforma: string) => {
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) return; // Si no hay sesión, no hacemos nada
  
  await fetch(`${BASE_URL}/dispositivos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tokenExpo, plataforma })
  });
};