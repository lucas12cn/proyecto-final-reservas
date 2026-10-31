import { Logger } from '@nestjs/common';
import {
  EnviadorPush,
  type MensajePush,
} from '../common/notifications/ports.js';

/** Mensaje tal como lo pide la API de Expo (campos en inglés). */
interface MensajeExpo {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
}

interface TicketExpo {
  status: 'ok' | 'error';
  details?: { error?: string };
}

const MAXIMO_POR_PEDIDO = 100;
const ESPERA_MAXIMA_MS = 10_000;

export class EnviadorPorHacer extends EnviadorPush {
  private readonly logger = new Logger('EnviadorExpo');

  /** `url` es la dirección de la API de push de Expo (`EXPO_PUSH_URL` en la configuración). */
  constructor(readonly url: string) {
    super();
  }

  async enviar(
    mensajes: MensajePush[],
  ): Promise<{ tokensInvalidos: string[] }> {
    // Un mensaje de Expo por token.
    const mensajesExpo: MensajeExpo[] = mensajes.flatMap((m) =>
      m.tokens.map((token) => ({
        to: token,
        title: m.titulo,
        body: m.cuerpo,
        data: m.datos,
      })),
    );

    const tokensInvalidos: string[] = [];
    for (let i = 0; i < mensajesExpo.length; i += MAXIMO_POR_PEDIDO) {
      const tanda = mensajesExpo.slice(i, i + MAXIMO_POR_PEDIDO);
      // Si una tanda falla se loguea y se sigue con las demás: así no se pierden los
      // tokens inválidos ya detectados (Avisos igual atraparía una excepción).
      try {
        tokensInvalidos.push(...(await this.enviarTanda(tanda)));
      } catch (error) {
        this.logger.error(
          `No se pudo mandar una tanda de ${tanda.length} mensajes a Expo: ${(error as Error).message}`,
        );
      }
    }
    return { tokensInvalidos };
  }

  /** Manda una tanda y devuelve los tokens que Expo dice que ya no existen. */
  private async enviarTanda(tanda: MensajeExpo[]): Promise<string[]> {
    const respuesta = await fetch(this.url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tanda),
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
    });
    if (!respuesta.ok)
      throw new Error(`Expo respondió HTTP ${respuesta.status}`);

    const cuerpo = (await respuesta.json()) as { data?: TicketExpo[] };
    // Los tickets vienen en el mismo orden que los mensajes mandados.
    const tickets = Array.isArray(cuerpo.data) ? cuerpo.data : [];
    const invalidos: string[] = [];
    tickets.forEach((ticket, j) => {
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered' &&
        tanda[j]
      )
        invalidos.push(tanda[j].to);
    });
    return invalidos;
  }
}
