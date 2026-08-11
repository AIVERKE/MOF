import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity('auditoria_cambio')
export class AuditoriaCambio {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'tabla_afectada', type: 'varchar', length: 128 })
  tablaAfectada: string;

  @Column({ name: 'id_registro_original', type: 'bigint', nullable: true })
  idRegistroOriginal: string | null;

  @Column({ type: 'varchar', length: 16 })
  accion: string;

  @Column({ name: 'datos_anteriores', type: 'jsonb', nullable: true })
  datosAnteriores: Record<string, unknown> | null;

  @Column({ name: 'datos_nuevos', type: 'jsonb', nullable: true })
  datosNuevos: Record<string, unknown> | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario | null;

  @Column({ name: 'id_usuario', type: 'bigint', nullable: true })
  idUsuario: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
