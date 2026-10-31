import * as Network from 'expo-network';
import { Espacio, Deporte, Turno, ReservaFija } from '../tipos';
import * as SecureStore from 'expo-secure-store';

// Le sacamos el "/api" del final porque tus controladores responden en la raíz
const API_URL = 'http://192.168.1.6:3000'; 

const verificarConexion = async () => {
  const red = await Network.getNetworkStateAsync();
  if (!red.isConnected) {
    throw new Error('Sin conexión a internet o red local.');
  }
};

export const obtenerEspacios = async (): Promise<Espacio[]> => {
  try {
    await verificarConexion();
    const respuesta = await fetch(`${API_URL}/espacios`);
    if (!respuesta.ok) throw new Error('Error al obtener los espacios');
    const json = await respuesta.json();
    return json.datos; // NestJS envuelve la respuesta en "datos"
  } catch (error) {
    console.error('Error en obtenerEspacios:', error);
    return [];
  }
};

export const obtenerEspacioPorId = async (id: string): Promise<Espacio | null> => {
  try {
    await verificarConexion();
    const respuesta = await fetch(`${API_URL}/espacios/${id}`);
    if (!respuesta.ok) throw new Error('Error al obtener el detalle del espacio');
    const json = await respuesta.json();
    return json.datos;
  } catch (error) {
    console.error('Error en obtenerEspacioPorId:', error);
    return null;
  }
};

export const obtenerTurnosPorDia = async (espacioId: string, fecha: string): Promise<Turno[]> => {
  try {
    await verificarConexion();
    // Ajustado a la ruta real: /espacios/:id/turnos?fecha=...
    const respuesta = await fetch(`${API_URL}/espacios/${espacioId}/turnos?fecha=${fecha}`);
    if (!respuesta.ok) throw new Error('Error al obtener turnos');
    const json = await respuesta.json();
    return json.datos;
  } catch (error) {
    console.error('Error en obtenerTurnosPorDia:', error);
    return [];
  }
};

export const obtenerReservasFijas = async (espacioId: string): Promise<ReservaFija[]> => {
  try {
    await verificarConexion();
    // Ajustado a la ruta real: /fijas?espacioId=...
    // Nota: Como este endpoint requiere permisos de admin (según admin.controller.ts), 
    // es probable que te devuelva 401 si no mandás un token. Por ahora lo dejamos así para no romper la app.
    const respuesta = await fetch(`${API_URL}/fijas?espacioId=${espacioId}`);
    if (!respuesta.ok) return []; // Retornamos vacío si falla por falta de permisos
    const json = await respuesta.json();
    return json.datos;
  } catch (error) {
    console.error('Error en obtenerReservasFijas:', error);
    return [];
  }
};

export const crearReserva = async (turnoId: string, cantidadPersonas: number) => {
  await verificarConexion();
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) throw new Error('NO_AUTENTICADO');

  const respuesta = await fetch(`${API_URL}/reservas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    // El backend exige exactamente turnoId y cantidadPersonas
    body: JSON.stringify({
      turnoId,
      cantidadPersonas
    })
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Error al crear la reserva');
  }

  const json = await respuesta.json();
  return json.datos; // Retorna la reserva generada, que incluye el codigoQr
};

export const cancelarReserva = async (reservaId: string) => {
  await verificarConexion();
  const token = await SecureStore.getItemAsync('tokenReserva');

  const respuesta = await fetch(`${API_URL}/reservas/${reservaId}/cancelacion`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify({}) // Enviamos un body vacío como requiere tu DTO
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => ({}));
    throw new Error(errorData.error?.mensaje || errorData.message || 'Error al cancelar la reserva');
  }

  const json = await respuesta.json();
  return json.datos;
};

export const obtenerMisReservas = async (cuando: 'proximas' | 'pasadas') => {
  await verificarConexion();
  const token = await SecureStore.getItemAsync('tokenReserva');
  
  const respuesta = await fetch(`${API_URL}/yo/reservas?cuando=${cuando}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });

  if (!respuesta.ok) throw new Error('Error al cargar tu historial de reservas');
  
  const json = await respuesta.json();
  return json.datos;
};

export const obtenerMisFavoritos = async () => {
  await verificarConexion();
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) return [];

  let datosFavoritos: any[] = [];

  // 1. Buscamos tu lista de favoritos en tu perfil de usuario
  try {
    const respuestaPerfil = await fetch(`${API_URL}/yo`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }
    });
    
    if (respuestaPerfil.ok) {
      const jsonPerfil = await respuestaPerfil.json();
      const usuario = jsonPerfil.datos || jsonPerfil;
      datosFavoritos = usuario.espaciosFavoritos || [];
    } else {
      // Si falla, intentamos con la ruta alternativa
      const resFavs = await fetch(`${API_URL}/yo/espacios-favoritos`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Cache-Control': 'no-cache' }
      });
      if (resFavs.ok) {
        const jsonFavs = await resFavs.json();
        datosFavoritos = Array.isArray(jsonFavs) ? jsonFavs : (jsonFavs.datos || []);
      }
    }
  } catch (error) {
    console.log("Error buscando favoritos:", error);
  }

  if (datosFavoritos.length === 0) return [];

  // Si el servidor fue amable y ya nos mandó las canchas armadas con nombre y foto, las usamos
  if (datosFavoritos[0] && datosFavoritos[0].nombre) {
    return datosFavoritos;
  }

  // 2. Normalizamos la lista a textos puros. Esto repara el error si el backend manda [{ id: "esp-01" }]
  const idsLimpios = datosFavoritos.map(fav => 
    typeof fav === 'object' ? String(fav.id || fav.espacioId) : String(fav)
  );

  // 3. Traemos el catálogo usando tu función que ya funciona perfecto
  const todasLasCanchas = await obtenerEspacios();

  // 4. Cruzamos los datos: devolvemos la tarjeta completa si su ID coincide con los guardados
  return todasLasCanchas.filter(cancha => idsLimpios.includes(String(cancha.id)));
};

export const alternarFavoritoApi = async (espacioId: string, marcarComoFavorito: boolean) => {
  await verificarConexion();
  const token = await SecureStore.getItemAsync('tokenReserva');
  if (!token) throw new Error('NO_AUTENTICADO');

  // Volvemos a usar PUT, que es el que espera tu API para guardar
  const metodo = marcarComoFavorito ? 'PUT' : 'DELETE';
  const respuesta = await fetch(`${API_URL}/yo/espacios-favoritos/${espacioId}`, {
    method: metodo,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!respuesta.ok) {
    // Leemos el error real del backend por si falla
    const errorData = await respuesta.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Error al actualizar favoritos en el servidor');
  }
  return true;
};

export const obtenerTurnosEspacio = async (espacioId: string, fecha?: string) => {
  await verificarConexion();
  
  // Armamos la URL. Si pasamos una fecha (AAAA-MM-DD), la agregamos como filtro
  let url = `${API_URL}/espacios/${espacioId}/turnos`;
  if (fecha) {
    url += `?fecha=${fecha}`;
  }

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.message || 'Error al cargar la disponibilidad de la cancha');
  }
  
  const json = await respuesta.json();
  // El backend de NestJS devuelve los datos dentro de la propiedad "datos"
  return json.datos || []; 
};

export const obtenerDeportes = async () => {
  await verificarConexion();
  const respuesta = await fetch(`${API_URL}/deportes`);
  if (!respuesta.ok) return [];
  
  const json = await respuesta.json();
  // Tu backend devuelve los datos dentro de la propiedad "datos"
  return json.datos || []; 
};

// Agregá esto en src/servicios/reservas.ts
export const registrarIngresoApi = async (codigoQr: string, espacioId: string) => {
  // Simulación de demora de red
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Respetamos el formato estricto de la cátedra
  return {
    datos: {
      id: 'res-1180',
      estado: 'cumplida',
      ingresoEn: new Date().toISOString()
    }
  };
};

export const obtenerComplejosApi = async () => {
  // Simulación de demora de red
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Respetamos el formato estricto de la cátedra: { "datos": [...] }
  return {
    datos: [
      { id: '1', nombre: 'Polideportivo Municipal', lat: -31.8653, lng: -59.0157 },
      { id: '2', nombre: 'Parque Berduc', lat: -31.8680, lng: -59.0200 }
    ]
  };
};

// Agregar al final de src/servicios/reservas.ts

export const obtenerMisReservasApi = async () => {
  // Simulamos un tiempo de carga de internet (800ms)
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    datos: [
      {
        id: 'RES-8472-QR',
        espacio: 'Cancha 2 - Fútbol 5',
        fecha: 'Sábado 19/09 de 19 a 20 hs',
        complejo: 'Polideportivo Municipal',
        precio: 12000
      },
      {
        id: 'RES-9183-QR',
        espacio: 'Cancha 1 - Tenis',
        fecha: 'Martes 22/09 de 18 a 19 hs',
        complejo: 'Parque Berduc',
        precio: 9500
      }
    ]
  };
};