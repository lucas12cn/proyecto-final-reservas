// PARTE 2 DE 2 PARA PROGRAMAR — cómo se mandan las push a Expo.
// Leé docs/NOTIFICATIONS.md. Cuando funcione, `pnpm test:notificaciones` tiene que pasar.
import { ErrorApi } from '../common/errors/error-api.js';
import { EnviadorPush, type MensajePush } from '../common/notifications/ports.js';

export class EnviadorPorHacer extends EnviadorPush {
  /** `url` es la dirección de la API de push de Expo (`EXPO_PUSH_URL` en la configuración). */
  constructor(readonly url: string) {
    super();
  }

  async enviar(mensajes: MensajePush[]): Promise<{ tokensInvalidos: string[] }> {
    let tokensInvalidos: string[] = [];
    let mensajesExpo: any[] = [];

    // 1. Traducimos del español de la cátedra al inglés que pide la API de Expo
    // y creamos un mensaje individual por cada token del arreglo
    for (let i = 0; i < mensajes.length; i++) {
      let mensaje = mensajes[i];
      
      for (let k = 0; k < mensaje.tokens.length; k++) {
        let token = mensaje.tokens[k];
        
        mensajesExpo.push({
          to: token,
          title: mensaje.titulo,
          body: mensaje.cuerpo,
          data: mensaje.datos
        });
      }
    }

    // 2. Mandamos a Expo en tandas de 100 como máximo
    for (let i = 0; i < mensajesExpo.length; i += 100) {
      // Cortamos la tanda actual
      let tanda = mensajesExpo.slice(i, i + 100);

      try {
        let respuesta = await fetch(this.url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tanda),
        });

        let resultado = await respuesta.json();
        let tickets = resultado.data;
        
        if (tickets) {
          // Revisamos cada ticket devuelto
          for (let j = 0; j < tickets.length; j++) {
            let ticket = tickets[j];
            
            // Si el ticket falló por DeviceNotRegistered, capturamos el token de esa misma posición
            if (ticket.status === 'error' && ticket.details && ticket.details.error === 'DeviceNotRegistered') {
              let tokenRoto = tanda[j].to;
              tokensInvalidos.push(tokenRoto);
            }
          }
        }
      } catch (error) {
        console.log("Hubo un problema de conexión al mandar la tanda a Expo:", error);
      }
    }

    return { tokensInvalidos: tokensInvalidos };
  }
}