import * as Network from 'expo-network';
import { guardarReservasEnCache, leerReservasDeCache } from './cacheReservas';
import { codigoDe } from './errores';
import { obtenerEspacios, obtenerMisReservas } from './reservas';

export interface MisReservas {
  reservas: any[];
  espacios: Record<string, any>;
  /** true si se muestran las reservas guardadas en el teléfono en lugar de las de la API */
  sinConexion: boolean;
}

/**
 * Carga "Mis reservas": de la API si se puede y, si no, de lo último guardado en el teléfono.
 *
 * Se intenta la API siempre que haya algún tipo de red (`isConnected`). NO se exige
 * `isInternetReachable`: en Android es falso en una wifi sin salida a internet (típico de una red
 * local con la API en una notebook) aunque la API responda perfectamente.
 * Si la API falla (sin respuesta, error del servidor) también se usa lo guardado.
 *
 * Los problemas de sesión se relanzan: con la sesión vencida no se debe mostrar nada guardado.
 */
export const cargarMisReservasConRespaldo = async (filtro: 'proximas' | 'pasadas'): Promise<MisReservas> => {
  const red = await Network.getNetworkStateAsync();

  if (red.isConnected !== false) {
    try {
      const [reservas, catalogo] = await Promise.all([obtenerMisReservas(filtro), obtenerEspacios()]);
      const espacios: Record<string, any> = {};
      catalogo.forEach((e: any) => (espacios[e.id] = e));

      try {
        guardarReservasEnCache(filtro, reservas, espacios);
      } catch (error) {
        console.log('Aviso: no se guardó la copia local de las reservas', error);
      }
      return { reservas, espacios, sinConexion: false };
    } catch (error) {
      const codigo = codigoDe(error);
      if (codigo === 'NO_AUTENTICADO' || codigo === 'SIN_SESION') throw error;
      console.log('No se pudo cargar de la API, se usan las reservas guardadas:', error);
    }
  }

  try {
    const guardado = leerReservasDeCache(filtro);
    return { reservas: guardado?.reservas ?? [], espacios: guardado?.espacios ?? {}, sinConexion: true };
  } catch (error) {
    console.log('No se pudo leer la copia local de las reservas', error);
    return { reservas: [], espacios: {}, sinConexion: true };
  }
};
