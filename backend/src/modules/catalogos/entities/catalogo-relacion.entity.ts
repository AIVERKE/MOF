import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

@Entity('catalogo_relacion')
export class CatalogoRelacion extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'varchar', length: 1, unique: true })
  codigo: string;

  @Column({ type: 'varchar', length: 128 })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
