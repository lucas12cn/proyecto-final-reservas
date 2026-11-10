import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { apiUrl } from './config';
import { errorSinSesion, lanzarSiError } from './errores';


const verificarConexion = async () => {
  const red = await Network.getNetworkStateAsync();
  if (!red.isConnected) throw new Error('Sin conexión a internet o red local.');
};

export const iniciarSesionApi = async (email: string, contrasena: string) => {
  await verificarConexion();
  const respuesta = await fetch(`${apiUrl()}/auth/ingreso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, contrasena })
  });

  await lanzarSiError(respuesta, 'No se pudo ingresar. Probá de nuevo.');
  const json = await respuesta.json();
  return json.datos; 
};

export const registrarUsuarioApi = async (nombre: string, email: string, telefono: string, contrasena: string) => {
  await verificarConexion();
  const respuesta = await fetch(`${apiUrl()}/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, telefono, contrasena })
  });

  await lanzarSiError(respuesta, 'No se pudo crear la cuenta. Probá de nuevo.');
  const json = await respuesta.json();
  return json.datos; 
};

// Actualiza los datos del jugador (PATCH /yo)
export const actualizarPerfilApi = async (datos: { nombre?: string; telefono?: string }) => {
  await verificarConexion();
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) throw errorSinSesion();

  const respuesta = await fetch(`${apiUrl()}/yo`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(datos)
  });

  await lanzarSiError(respuesta, 'No se pudo actualizar el perfil.');

  const json = await respuesta.json();
  return json.datos; // Retorna el usuario con los datos nuevos
};

export const registrarDispositivoApi = async (tokenExpo: string, plataforma: string) => {
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) return; // Sin sesión no hay a quién anotarle el teléfono

  const respuesta = await fetch(`${apiUrl()}/dispositivos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tokenExpo, plataforma })
  });
  await lanzarSiError(respuesta, 'No se pudo registrar el dispositivo.');
};

// La API responde 204 aunque el token no estuviera anotado.
export const darDeBajaDispositivoApi = async (tokenExpo: string) => {
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) return;

  const respuesta = await fetch(`${apiUrl()}/dispositivos/${encodeURIComponent(tokenExpo)}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await lanzarSiError(respuesta, 'No se pudo dar de baja el dispositivo.');
};
