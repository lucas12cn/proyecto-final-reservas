import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('dispositivos')
export class DispositivoEntidad {
  @PrimaryColumn()
  tokenExpo: string;

  @Column()
  usuarioId: string;

  @Column()
  plataforma: string;
}