import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { Espacio, Deporte, Reserva, Turno } from '../tipos';
import { API_URL } from './config';
import { errorSinSesion, lanzarSiError } from './errores';

const verificarConexion = async () => {
  const red = await Network.getNetworkStateAsync();
  if (!red.isConnected) {
    throw new Error('Sin conexión a internet o red local.');
  }
};

// Token de la sesión guardada, o error si no hay (se usa en los pedidos que exigen sesión).
const tokenObligatorio = async (): Promise<string> => {
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) throw errorSinSesion();
  return token;
};

export const obtenerEspacios = async (): Promise<Espacio[]> => {
  try {
    await verificarConexion();
    const respuesta = await fetch(`${API_URL}/espacios`);
    await lanzarSiError(respuesta, 'Error al obtener los espacios');
    const json = await respuesta.json();
    return json.datos; // La API envuelve la respuesta en "datos"
  } catch (error) {
    console.error('Error en obtenerEspacios:', error);
    return [];
  }
};

export const obtenerEspacioPorId = async (id: string): Promise<Espacio | null> => {
  try {
    await verificarConexion();
    const respuesta = await fetch(`${API_URL}/espacios/${id}`);
    await lanzarSiError(respuesta, 'Error al obtener el detalle del espacio');
    const json = await respuesta.json();
    return json.datos;
  } catch (error) {
    console.error('Error en obtenerEspacioPorId:', error);
    return null;
  }
};

export const obtenerDeportes = async (): Promise<Deporte[]> => {
  await verificarConexion();
  const respuesta = await fetch(`${API_URL}/deportes`);
  if (!respuesta.ok) return [];

  const json = await respuesta.json();
  return json.datos || [];
};

/** Los 16 turnos de un espacio en un día (`fecha` = AAAA-MM-DD). Lanza con el mensaje de la API. */
export const obtenerTurnosEspacio = async (espacioId: string, fecha?: string): Promise<Turno[]> => {
  await verificarConexion();

  let url = `${API_URL}/espacios/${espacioId}/turnos`;
  if (fecha) url += `?fecha=${fecha}`;

  const respuesta = await fetch(url);
  await lanzarSiError(respuesta, 'Error al cargar la disponibilidad de la cancha');

  const json = await respuesta.json();
  return json.datos || [];
};

/** Crea la reserva. La reserva devuelta incluye el `codigoQr`. */
export const crearReserva = async (turnoId: string, cantidadPersonas: number): Promise<Reserva> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/reservas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    // La API exige exactamente turnoId y cantidadPersonas
    body: JSON.stringify({ turnoId, cantidadPersonas })
  });

  await lanzarSiError(respuesta, 'Error al crear la reserva');

  const json = await respuesta.json();
  return json.datos;
};

export const cancelarReserva = async (reservaId: string) => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/reservas/${reservaId}/cancelacion`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({}) // El DTO de la API espera un cuerpo (vacío)
  });

  await lanzarSiError(respuesta, 'Error al cancelar la reserva');

  const json = await respuesta.json();
  return json.datos;
};

export const obtenerMisReservas = async (cuando: 'proximas' | 'pasadas') => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/yo/reservas?cuando=${cuando}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  await lanzarSiError(respuesta, 'Error al cargar tus reservas');

  const json = await respuesta.json();
  return json.datos;
};

/** Espacios favoritos del usuario. Sin sesión, o si falla el pedido, devuelve []. */
export const obtenerMisFavoritos = async (): Promise<Espacio[]> => {
  try {
    await verificarConexion();
    const token = await SecureStore.getItemAsync('tokenReserva');
    if (!token) return [];

    // La lista de ids de favoritos viene dentro del usuario (GET /yo → espaciosFavoritos)
    const respuesta = await fetch(`${API_URL}/yo`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }
    });
    await lanzarSiError(respuesta, 'No se pudieron cargar tus favoritos');

    const json = await respuesta.json();
    const ids: string[] = (json.datos?.espaciosFavoritos ?? []).map((id: unknown) => String(id));
    if (ids.length === 0) return [];

    // Cruzamos los ids con el catálogo para devolver las tarjetas completas
    const todasLasCanchas = await obtenerEspacios();
    return todasLasCanchas.filter(cancha => ids.includes(String(cancha.id)));
  } catch (error) {
    console.log('Error buscando favoritos:', error);
    return [];
  }
};

export const alternarFavoritoApi = async (espacioId: string, marcarComoFavorito: boolean) => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const metodo = marcarComoFavorito ? 'PUT' : 'DELETE';
  const respuesta = await fetch(`${API_URL}/yo/espacios-favoritos/${espacioId}`, {
    method: metodo,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  await lanzarSiError(respuesta, 'Error al actualizar favoritos en el servidor');
  return true;
};

/**
 * Registra el ingreso de una reserva (POST /ingresos, sólo encargado/administrador).
 * Si el código no sirve, lanza con el mensaje de la API ("Esa reserva no es para hoy.",
 * "Esa reserva es para otra cancha.", etc.). Devuelve la reserva, ya como `cumplida`.
 */
export const registrarIngresoApi = async (codigoQr: string, espacioId: string): Promise<Reserva> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/ingresos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ codigoQr, espacioId })
  });

  await lanzarSiError(respuesta, 'No se pudo registrar el ingreso');

  const json = await respuesta.json();
  return json.datos;
};
