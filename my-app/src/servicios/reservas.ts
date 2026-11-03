import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import { Espacio, Deporte, Reserva, ReservaFija, Turno, Usuario } from '../tipos';
import { Bloqueo } from '../tipos/personal';
import { API_URL } from './config';
import { errorSinSesion, lanzarSiError } from './errores';
import {
  guardarEspaciosEnTelefono, leerEspaciosDelTelefono,
  guardarDeportesEnTelefono, leerDeportesDelTelefono,
} from './db';

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

// El catálogo (espacios y deportes) se guarda en SQLite cada vez que se descarga bien. Sin
// conexión, o si la API no responde, se devuelve lo último guardado. Guardar y leer el
// respaldo nunca debe romper una pantalla, por eso van con try/catch.
const respaldar = (guardar: () => void) => {
  try { guardar(); } catch (error) { console.log('No se pudo guardar el catálogo local:', error); }
};
const recuperar = <T,>(leer: () => T[]): T[] => {
  try { return leer(); } catch { return []; }
};

export const obtenerEspacios = async (): Promise<Espacio[]> => {
  try {
    await verificarConexion();
    const respuesta = await fetch(`${API_URL}/espacios`);
    await lanzarSiError(respuesta, 'Error al obtener los espacios');
    const json = await respuesta.json();
    const espacios: Espacio[] = json.datos; // La API envuelve la respuesta en "datos"
    respaldar(() => guardarEspaciosEnTelefono(espacios));
    return espacios;
  } catch (error) {
    console.error('Error en obtenerEspacios (se usa lo guardado):', error);
    return recuperar(leerEspaciosDelTelefono);
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
    console.error('Error en obtenerEspacioPorId (se usa lo guardado):', error);
    return recuperar(leerEspaciosDelTelefono).find((espacio) => espacio.id === id) ?? null;
  }
};

export const obtenerDeportes = async (): Promise<Deporte[]> => {
  try {
    await verificarConexion();
    const respuesta = await fetch(`${API_URL}/deportes`);
    await lanzarSiError(respuesta, 'Error al obtener los deportes');
    const json = await respuesta.json();
    const deportes: Deporte[] = json.datos || [];
    respaldar(() => guardarDeportesEnTelefono(deportes));
    return deportes;
  } catch (error) {
    console.error('Error en obtenerDeportes (se usa lo guardado):', error);
    return recuperar(leerDeportesDelTelefono);
  }
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

// ---------------------------------------------------------------------------------------------
// Servicios del personal (encargado / administrador). La API responde 403 SIN_PERMISO a un
// jugador, así que las pantallas que los usan ya están limitadas por rol.
// ---------------------------------------------------------------------------------------------

// Los listados del personal vienen paginados (máximo 100 por página): se piden las páginas que
// hagan falta hasta juntar todos los resultados.
const traerTodas = async <T,>(ruta: string, consulta: string, token: string, errorPorDefecto: string): Promise<T[]> => {
  const todos: T[] = [];
  let pagina = 1;
  while (true) {
    const respuesta = await fetch(`${API_URL}${ruta}?${consulta}&pagina=${pagina}&porPagina=100`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await lanzarSiError(respuesta, errorPorDefecto);

    const json = await respuesta.json();
    todos.push(...json.datos);

    const total: number = json.meta?.total ?? todos.length;
    if (json.datos.length === 0 || todos.length >= total) break;
    pagina++;
  }
  return todos;
};

/** Todas las reservas de un día (AAAA-MM-DD), de todos los espacios. */
export const obtenerReservasDelDia = async (fecha: string): Promise<Reserva[]> => {
  await verificarConexion();
  const token = await tokenObligatorio();
  return traerTodas<Reserva>('/reservas', `fecha=${fecha}`, token, 'No se pudo cargar la agenda');
};

/** Marca "no se presentó" (desde 15 minutos después del inicio del turno). Devuelve la reserva. */
export const marcarAusenteApi = async (reservaId: string): Promise<Reserva> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/reservas/${reservaId}/ausente`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  await lanzarSiError(respuesta, 'No se pudo marcar la ausencia');

  const json = await respuesta.json();
  return json.datos;
};

/** Datos de un usuario, con su teléfono (para llamar a quien no se presentó). */
export const obtenerUsuarioApi = async (usuarioId: string): Promise<Usuario> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/usuarios/${usuarioId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await lanzarSiError(respuesta, 'No se pudo cargar el contacto');

  const json = await respuesta.json();
  return json.datos;
};

// ---------------------------------------------------------------------------------------------
// Administración: bloqueos (encargado y administrador); reservas fijas y precios (sólo
// administrador). La API responde 403 SIN_PERMISO si el rol no alcanza.
// ---------------------------------------------------------------------------------------------

/** Bloqueos desde una fecha (por defecto, hoy), de todos los espacios. */
export const obtenerBloqueos = async (desde: string): Promise<Bloqueo[]> => {
  await verificarConexion();
  const token = await tokenObligatorio();
  return traerTodas<Bloqueo>('/bloqueos', `desde=${desde}`, token, 'No se pudieron cargar los bloqueos');
};

export interface NuevoBloqueo {
  espacioIds: string[];
  fecha: string;
  /** "HH:00". Sin `inicio` ni `fin` se bloquea el día entero. */
  inicio: string | null;
  fin: string | null;
  motivo: string;
}

/**
 * Crea un bloqueo por espacio. El servidor cancela las reservas confirmadas de esos turnos (sin
 * contarlas como cancelación tardía) y avisa por push a sus dueños.
 */
export const crearBloqueosApi = async (nuevo: NuevoBloqueo): Promise<Bloqueo[]> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/bloqueos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      espacioIds: nuevo.espacioIds,
      fecha: nuevo.fecha,
      motivo: nuevo.motivo,
      // Para el día entero la API quiere que no vengan `inicio` ni `fin`
      ...(nuevo.inicio && nuevo.fin ? { inicio: nuevo.inicio, fin: nuevo.fin } : {})
    })
  });
  await lanzarSiError(respuesta, 'No se pudo crear el bloqueo');

  const json = await respuesta.json();
  return json.datos;
};

/** Quita un bloqueo. Las reservas que ya había cancelado siguen canceladas. */
export const quitarBloqueoApi = async (bloqueoId: string): Promise<void> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/bloqueos/${bloqueoId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await lanzarSiError(respuesta, 'No se pudo quitar el bloqueo');
};

/** Reservas fijas activas. (Dar de baja una fija es lógico: deja de estar activa.) */
export const obtenerFijas = async (): Promise<ReservaFija[]> => {
  await verificarConexion();
  const token = await tokenObligatorio();
  return traerTodas<ReservaFija>('/fijas', 'activa=true', token, 'No se pudieron cargar las reservas fijas');
};

export interface NuevaFija {
  espacioId: string;
  titular: string;
  /** 0 = domingo … 6 = sábado */
  dia: number;
  inicio: string;
  fin: string;
  desde: string;
  /** null = sin fecha de fin */
  hasta: string | null;
}

export const crearFijaApi = async (nueva: NuevaFija): Promise<ReservaFija> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/fijas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(nueva)
  });
  await lanzarSiError(respuesta, 'No se pudo crear la reserva fija');

  const json = await respuesta.json();
  return json.datos;
};

export const darDeBajaFijaApi = async (fijaId: string): Promise<void> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/fijas/${fijaId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await lanzarSiError(respuesta, 'No se pudo dar de baja la reserva fija');
};

/** Cambia el precio por hora de un espacio (pesos enteros, mayor que cero). */
export const cambiarPrecioApi = async (espacioId: string, precioPorHora: number): Promise<Espacio> => {
  await verificarConexion();
  const token = await tokenObligatorio();

  const respuesta = await fetch(`${API_URL}/espacios/${espacioId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ precioPorHora })
  });
  await lanzarSiError(respuesta, 'No se pudo cambiar el precio');

  const json = await respuesta.json();
  return json.datos;
};
