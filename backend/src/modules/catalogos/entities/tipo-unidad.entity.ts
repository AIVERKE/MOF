import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

@Entity('tipo_unidad')
export class TipoUnidad extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'text', unique: true })
  codigo: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int', default: 0 })
  peso: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  color: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
