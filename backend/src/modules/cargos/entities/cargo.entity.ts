import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity('cargo')
export class Cargo extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true })
  codigo: string | null;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  descripcion: string | null;

  @ManyToOne(() => Cargo, (cargo) => cargo.hijos, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Cargo | null;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string | null;

  @OneToMany(() => Cargo, (cargo) => cargo.parent)
  hijos: Cargo[];

  @Column({ name: 'unico_en_unidad', type: 'boolean', default: false })
  unicoEnUnidad: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: Usuario | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: Usuario | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;
}
