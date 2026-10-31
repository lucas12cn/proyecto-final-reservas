import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AlmacenTokensPush, type Plataforma } from '../common/notifications/ports.js';
import { DispositivoEntidad } from './dispositivo.entity.js';

@Injectable()
export class AlmacenTokensPorHacer extends AlmacenTokensPush {
  constructor(
    @InjectRepository(DispositivoEntidad)
    private dispositivoRepo: Repository<DispositivoEntidad>,
  ) {
    super();
  }

  async guardar(usuarioId: string, tokenExpo: string, plataforma: Plataforma): Promise<void> {
    // console.log("guardando token de:", usuarioId);
    
    // Armo el objeto paso a paso
    let nuevoDispositivo = new DispositivoEntidad();
    nuevoDispositivo.usuarioId = usuarioId;
    nuevoDispositivo.tokenExpo = tokenExpo;
    nuevoDispositivo.plataforma = plataforma;

    // save() inserta o actualiza automáticamente
    await this.dispositivoRepo.save(nuevoDispositivo);
  }

  async borrar(tokenExpo: string): Promise<void> {
    await this.dispositivoRepo.delete({ tokenExpo: tokenExpo });
  }

  async tokensDe(usuarioIds: string[]): Promise<string[]> {
    if (usuarioIds.length === 0) {
      return [];
    }

    let dispositivos = await this.dispositivoRepo.find({
      where: { usuarioId: In(usuarioIds) },
    });

    // En vez de usar .map, hacemos un for comun para sacar los tokens
    let tokens = [];
    for (let i = 0; i < dispositivos.length; i++) {
      tokens.push(dispositivos[i].tokenExpo);
    }
    
    return tokens;
  }

  async descartar(tokens: string[]): Promise<void> {
    if (tokens.length > 0) {
      await this.dispositivoRepo.delete({ tokenExpo: In(tokens) });
    }
  }
}