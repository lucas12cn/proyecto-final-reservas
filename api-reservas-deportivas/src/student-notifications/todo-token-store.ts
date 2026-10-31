import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  AlmacenTokensPush,
  type Plataforma,
} from '../common/notifications/ports.js';
import { DispositivoEntidad } from './dispositivo.entity.js';

@Injectable()
export class AlmacenTokensPorHacer extends AlmacenTokensPush {
  constructor(
    @InjectRepository(DispositivoEntidad)
    private readonly dispositivos: Repository<DispositivoEntidad>,
  ) {
    super();
  }

  /**
   * Insertar o actualizar en una sola sentencia (INSERT ... ON CONFLICT / ON DUPLICATE
   * KEY): la base garantiza que no queden filas repetidas aun con pedidos simultáneos.
   * Si el token era de otro usuario, pasa al actual.
   */
  async guardar(
    usuarioId: string,
    tokenExpo: string,
    plataforma: Plataforma,
  ): Promise<void> {
    await this.dispositivos.upsert({ tokenExpo, usuarioId, plataforma }, [
      'tokenExpo',
    ]);
  }

  async borrar(tokenExpo: string): Promise<void> {
    await this.dispositivos.delete({ tokenExpo });
  }

  async tokensDe(usuarioIds: string[]): Promise<string[]> {
    if (usuarioIds.length === 0) return [];
    const filas = await this.dispositivos.find({
      where: { usuarioId: In(usuarioIds) },
    });
    return filas.map((f) => f.tokenExpo);
  }

  async descartar(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await this.dispositivos.delete({ tokenExpo: In(tokens) });
  }
}
