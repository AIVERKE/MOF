import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

/**
 * Catálogo de tipos de programa. Se siembra con los tres programas oficiales
 * (Académico, Investigación, Interacción Social y Extensión Universitaria) y
 * los usuarios pueden añadir otros desde el formulario de la unidad.
 */
@Entity('tipo_programa')
export class TipoPrograma extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'integer',
    primaryKeyConstraintName: 'PK_tipo_programa',
  })
  id: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
