import { Entity, Index, PrimaryColumn } from 'typeorm';
import { ColumnaEnum, ColumnaRef } from '../common/db/columns.js';

/**
 * Teléfono que recibe push. El token de Expo es la clave primaria: no puede haber dos
 * filas con el mismo token, y un token es de un solo usuario a la vez.
 */
@Entity('dispositivos')
export class DispositivoEntidad {
  // Un token de Expo mide ~40-60 caracteres, pero el formato admite hasta 200 dentro de
  // los corchetes. `ColumnaId` (40) quedaría corto, por eso el largo va explícito.
  @PrimaryColumn({ type: 'varchar', length: 255 })
  tokenExpo: string;

  // Se busca por usuario cada vez que hay que avisarle: de ahí el índice.
  @Index()
  @ColumnaRef()
  usuarioId: string;

  @ColumnaEnum()
  plataforma: string;
}
