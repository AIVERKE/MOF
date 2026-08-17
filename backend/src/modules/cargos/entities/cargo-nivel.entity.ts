import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Usuario } from '../../auth/entities/usuario.entity';

@Entity('cargo_nivel')
export class CargoNivel extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 8, unique: true })
  letra: string;

  @Column({ type: 'varchar', length: 128 })
  nombre: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  descripcion: string | null;

  @Index()
  @Column({ type: 'smallint' })
  orden: number;

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
