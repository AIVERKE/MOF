import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Unidad } from './unidad.entity';

@Entity('unidad_inventario')
@Index('IDX_unidad_inventario_unidad', ['unidadId'])
@Check('CHK_unidad_inventario_cantidad', '"cantidad" >= 1')
export class UnidadInventario extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Unidad, (unidad) => unidad.inventarios, {
    nullable: false,
  })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ name: 'unidad_id', type: 'bigint' })
  unidadId: string;

  @Column({ type: 'varchar', length: 1024 })
  descripcion: string;

  @Column({ type: 'int', default: 1 })
  cantidad: number;
}
