import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Unidad } from './unidad.entity';

@Entity('unidad_dependencia_funcional')
export class UnidadDependenciaFuncional {
  @PrimaryColumn({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @PrimaryColumn({ name: 'dependencia_id', type: 'bigint' })
  dependenciaId: string;

  @ManyToOne(() => Unidad, { nullable: false })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @ManyToOne(() => Unidad, { nullable: false })
  @JoinColumn({ name: 'dependencia_id' })
  dependencia: Unidad;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
